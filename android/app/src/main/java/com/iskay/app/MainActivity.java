package com.iskay.app;

import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity implements NfcAdapter.ReaderCallback {
	private static final String TAG = "ISKAY_NFC";
	private NfcAdapter nfcAdapter;
	// Última lectura retenida: si el WebView aún no cargó, el frontend la
	// recupera con IskayNfc.ultimaLectura() al montarse.
	public static volatile String ultimaUid = null;
	public static volatile String ultimoNdef = null;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		// Registrar antes del super.onCreate: BridgeActivity crea el bridge en load().
		registerPlugin(IskayNfcPlugin.class);
		super.onCreate(savedInstanceState);

		nfcAdapter = NfcAdapter.getDefaultAdapter(this);
		if (nfcAdapter == null) {
			Log.w(TAG, "Dispositivo sin hardware NFC");
		} else if (!nfcAdapter.isEnabled()) {
			Log.w(TAG, "NFC desactivado en ajustes del sistema");
		}
		// Cold start: la app se abrió por acercar el tag con la app cerrada.
		handleNfcIntent(getIntent());
	}

	@Override
	public void onResume() {
		super.onResume();
		if (nfcAdapter != null && nfcAdapter.isEnabled()) {
			Bundle opts = new Bundle();
			opts.putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 250);
			int flags = NfcAdapter.FLAG_READER_NFC_A
				| NfcAdapter.FLAG_READER_NFC_B
				| NfcAdapter.FLAG_READER_NFC_F
				| NfcAdapter.FLAG_READER_NFC_V
				| NfcAdapter.FLAG_READER_NFC_BARCODE
				| NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK;
			nfcAdapter.enableReaderMode(this, this, flags, opts);
		}
	}

	@Override
	public void onPause() {
		if (nfcAdapter != null) {
			try {
				nfcAdapter.disableReaderMode(this);
			} catch (Exception e) {
				Log.w(TAG, "disableReaderMode: " + e.getMessage());
			}
		}
		super.onPause();
	}

	@Override
	protected void onNewIntent(Intent intent) {
		super.onNewIntent(intent);
		setIntent(intent);
		handleNfcIntent(intent);
	}

	// Llamado por enableReaderMode en hilo no-UI cuando se acerca un tag.
	@Override
	public void onTagDiscovered(Tag tag) {
		runOnUiThread(() -> procesarTag(tag));
	}

	private void handleNfcIntent(Intent intent) {
		if (intent == null) return;
		String action = intent.getAction();
		if (NfcAdapter.ACTION_TAG_DISCOVERED.equals(action)
			|| NfcAdapter.ACTION_TECH_DISCOVERED.equals(action)
			|| NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)) {
			Tag tag;
			if (Build.VERSION.SDK_INT >= 33) {
				tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag.class);
			} else {
				// noinspection deprecation
				tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
			}
			if (tag != null) {
				procesarTag(tag);
			}
		}
	}

	private void procesarTag(Tag tag) {
		byte[] id = tag.getId();
		if (id == null || id.length == 0) {
			Log.w(TAG, "Tag sin UID");
			return;
		}
		String uid = formatearUid(id);
		String techs = new JSONArray(java.util.Arrays.asList(tag.getTechList())).toString();

		// Un tag "vacío" SI tiene UID. Lo que está vacío es el NDEF.
		// Por eso siempre logueamos y avisamos, aunque el NDEF sea null.
		String estadoNdef = "desconocido";
		try {
			Ndef ndef = Ndef.get(tag);
			if (ndef == null) {
				estadoNdef = "vacio-sin-ndef";
			} else if (ndef.getCachedNdefMessage() == null) {
				estadoNdef = "vacio-ndef-null";
			} else {
				estadoNdef = "con-ndef";
			}
		} catch (Exception e) {
			estadoNdef = "error-ndef:" + e.getMessage();
		}
		Log.d(TAG, "ISKAY_NFC_UID=" + uid + " ndef=" + estadoNdef + " techs=" + techs);
		ultimaUid = uid;
		ultimoNdef = estadoNdef;

		// Si la cuenta artista armó una escritura, grabar NDEF en vez de solo leer.
		String pendiente = IskayNfcPlugin.consumirEscrituraPendiente();
		if (pendiente != null) {
			boolean ok = escribirNdef(tag, pendiente);
			Log.d(TAG, "ISKAY_NFC_WRITE ok=" + ok + " uid=" + uid);
			Toast.makeText(this, ok ? "Grabado en chip: " + uid : "Error al grabar chip", Toast.LENGTH_LONG).show();
			try {
				JSONObject data = new JSONObject();
				data.put("uid", uid);
				data.put("escrito", ok);
				data.put("ndef", ok ? "con-ndef" : estadoNdef);
				emitirEventoJs("iskayNfcWritten", data);
				emitirEventoJs("iskayNfcUid", data);
			} catch (Exception e) {
				Log.e(TAG, "written event: " + e.getMessage());
			}
			// Además emite lectura normal para que el formulario se llene.
		}

		// Feedback inmediato aunque el WebView aún no esté listo.
		// Si ves el Toast pero no la app, el problema es puente JS, no NFC.
		if (pendiente == null) {
			Toast.makeText(this, "NFC: " + uid, Toast.LENGTH_LONG).show();
		}

		try {
			JSONObject data = new JSONObject();
			data.put("uid", uid);
			data.put("ndef", estadoNdef);
			emitirEventoJs("iskayNfcUid", data);
		} catch (Exception e) {
			Log.e(TAG, "uid event: " + e.getMessage());
		}
	}

	// dispatchEvent directo: no depende de window.Capacitor.triggerEvent,
	// que en algunas builds no propaga detail al listener.
	private void emitirEventoJs(String nombre, JSONObject data) {
		if (getBridge() == null) {
			Log.w(TAG, "Bridge aún no listo, retenido " + nombre + ": " + data);
			return;
		}
		String js = "window.dispatchEvent(new CustomEvent('"
			+ nombre + "', {detail:" + data.toString() + "}));";
		try {
			getBridge().eval(js, null);
			Log.d(TAG, "JS emitido " + nombre + ": " + data);
		} catch (Exception e) {
			Log.e(TAG, "eval " + nombre + ": " + e.getMessage());
		}
	}

	// Convierte bytes del tag a formato canónico XX:XX:XX:XX (mayúsculas).
	static String formatearUid(byte[] id) {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < id.length; i++) {
			if (i > 0) sb.append(':');
			sb.append(String.format("%02X", id[i] & 0xFF));
		}
		return sb.toString();
	}

	// Graba un TEXT NDEF con el JSON del formulario artista. NTAG216 tiene
	// ~888 bytes libres: el JSON debe ser corto (uid, tokenId, titulo).
	private boolean escribirNdef(Tag tag, String texto) {
		try {
			byte[] lang = "es".getBytes("US-ASCII");
			byte[] payload = texto.getBytes("UTF-8");
			byte[] status = new byte[]{(byte) lang.length};
			byte[] data = new byte[1 + lang.length + payload.length];
			System.arraycopy(status, 0, data, 0, 1);
			System.arraycopy(lang, 0, data, 1, lang.length);
			System.arraycopy(payload, 0, data, 1 + lang.length, payload.length);
			NdefRecord record = new NdefRecord(
				NdefRecord.TNF_WELL_KNOWN, NdefRecord.RTD_TEXT, new byte[0], data);
			NdefMessage msg = new NdefMessage(new NdefRecord[]{record});

			Ndef ndef = Ndef.get(tag);
			if (ndef != null) {
				ndef.connect();
				if (!ndef.isWritable()) return false;
				if (ndef.getMaxSize() < msg.toByteArray().length) return false;
				ndef.writeNdefMessage(msg);
				ndef.close();
				return true;
			}
			NdefFormatable fmt = NdefFormatable.get(tag);
			if (fmt != null) {
				fmt.connect();
				fmt.format(msg);
				fmt.close();
				return true;
			}
			return false;
		} catch (Exception e) {
			Log.e(TAG, "escribirNdef: " + e.getMessage());
			return false;
		}
	}
}
