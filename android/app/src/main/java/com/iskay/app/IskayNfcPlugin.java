package com.iskay.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IskayNfc")
public class IskayNfcPlugin extends Plugin {
    // Texto NDEF pendiente de grabar. La app JS lo arma con los datos del
    // formulario artista y el próximo tag acercado lo recibe en MainActivity.
    private static volatile String escrituraPendiente = null;

    @PluginMethod
    public void armarEscritura(PluginCall call) {
        String texto = call.getString("texto");
        if (texto == null || texto.isEmpty()) {
            call.reject("texto vacío");
            return;
        }
        escrituraPendiente = texto;
        JSObject ret = new JSObject();
        ret.put("armado", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelarEscritura(PluginCall call) {
        escrituraPendiente = null;
        JSObject ret = new JSObject();
        ret.put("cancelado", true);
        call.resolve(ret);
    }

    // El frontend lo llama al montar el formulario por si el tag se acercó
    // antes de que el WebView estuviera listo (Toast sí, evento no).
    @PluginMethod
    public void ultimaLectura(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("uid", MainActivity.ultimaUid != null ? MainActivity.ultimaUid : "");
        ret.put("ndef", MainActivity.ultimoNdef != null ? MainActivity.ultimoNdef : "");
        call.resolve(ret);
    }

    /** MainActivity lo consume al detectar el próximo tag. Null = solo leer. */
    public static String consumirEscrituraPendiente() {
        String t = escrituraPendiente;
        escrituraPendiente = null;
        return t;
    }

    public static boolean hayEscrituraPendiente() {
        return escrituraPendiente != null;
    }
}
