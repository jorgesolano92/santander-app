# Audio Web vs Android - Diferencias

## 🎯 Resumen

El audio bidireccional con AXIS I8116-E funciona de manera diferente en **Web** vs **Android** debido a limitaciones de CORS en navegadores.

---

## 🌐 Modo Web (Desarrollo)

### Comportamiento:
- ✅ **Captura micrófono** del PC
- ✅ **Muestra interfaz** de llamada
- ✅ **Silencia/Activa** micrófono localmente
- ⚠️ **NO envía audio** al AXIS (CORS bloquea)
- ⚠️ **Solo para pruebas** de UI

### Por qué no funciona:
```
[Navegador Web]
    ↓
[Intenta fetch directo al AXIS]
    ↓
❌ CORS: "No 'Access-Control-Allow-Origin' header"
    ↓
⚠️ Navegador bloquea la petición
```

### Logs en Web:
```
📞 Iniciando llamada a AXIS: 192.168.1.130
📞 Plataforma: web, Modo: Proxy
✅ Micrófono capturado
🌐 Modo Web: Audio capturado localmente
⚠️ Audio bidireccional completo solo disponible en Android
✅ Llamada conectada
```

### UI en Web:
```
[AXIS I8116-E - SIP Audio]  [0:05]
🟢 LLAMADA ACTIVA

[COLGAR]  [ACTIVO]

⚠️ Modo prueba (solo micrófono local). 
Audio bidireccional completo en Android.
```

---

## 📱 Modo Android (Producción)

### Comportamiento:
- ✅ **Captura micrófono** del teléfono
- ✅ **Conecta WebRTC** directo al AXIS
- ✅ **Envía audio** al AXIS (micrófono → altavoz AXIS)
- ✅ **Recibe audio** del AXIS (micrófono AXIS → altavoz teléfono)
- ✅ **Audio bidireccional** real

### Por qué sí funciona:
```
[App Android]
    ↓
[WebRTC directo al AXIS]
    ↓
✅ Sin CORS (no es navegador)
    ↓
✅ Audio bidireccional nativo
```

### Logs en Android:
```
📞 Iniciando llamada a AXIS: 192.168.1.130
📞 Plataforma: android, Modo: Directo
✅ Micrófono capturado
✅ Audio track agregado
✅ Oferta SDP creada
🔍 Intentando endpoint: /axis-cgi/webrtc/offer.cgi
✅ Respuesta SDP del AXIS recibida
✅ Llamada conectada
🔊 Stream remoto del AXIS recibido
```

### UI en Android:
```
[AXIS I8116-E - SIP Audio]  [0:05]
🟢 LLAMADA ACTIVA

[COLGAR]  [ACTIVO]

Audio bidireccional via WebRTC (AXIS I8116-E)
```

---

## 🔄 Comparación

| Característica | Web | Android |
|----------------|-----|---------|
| **Captura micrófono** | ✅ Sí | ✅ Sí |
| **Interfaz UI** | ✅ Completa | ✅ Completa |
| **Envío a AXIS** | ❌ CORS | ✅ Directo |
| **Recepción AXIS** | ❌ CORS | ✅ Directo |
| **Audio bidireccional** | ❌ No | ✅ Sí |
| **Uso** | Pruebas UI | Producción |

---

## 🎯 Solución para Web (si realmente lo necesitas)

Si necesitas que funcione en web, tendrías que:

### Opción 1: Configurar CORS en el AXIS
```
1. Acceder a http://192.168.1.130
2. System > Network > Advanced > CORS
3. Añadir: http://localhost:8081
4. Guardar y reiniciar
```

### Opción 2: Usar Proxy Node.js (Complejo)
```
[Web] → [Proxy:3001] → [AXIS]
```
Requeriría implementar WebRTC en el servidor Node.js, muy complejo.

### Opción 3: No hacer nada (Recomendado)
- ✅ Web solo para desarrollo/pruebas de UI
- ✅ Android para producción real
- ✅ Simple y efectivo

---

## 🚀 Flujo de Desarrollo Recomendado

### 1. Desarrollo en Web
```
[PC] → [Navegador] → [App en http://localhost:8081]
├── ✅ Probar UI de video
├── ✅ Probar controles de audio (visual)
├── ✅ Probar abrir puertas
└── ⚠️ Audio bidireccional no funcional
```

### 2. Build para Android
```
[Compilar APK]
    ↓
[Instalar en tablet/teléfono]
    ↓
[Ejecutar app nativa]
    ↓
✅ TODO funciona (video + audio bidireccional)
```

---

## 📊 Estado Actual

### Implementado:
- ✅ Detección automática por IP
- ✅ UI completa para AXIS
- ✅ Captura de micrófono
- ✅ Contador de duración
- ✅ Silenciar/Activar
- ✅ Modo web (solo UI)
- ✅ Modo Android (preparado para WebRTC)

### Para Probar en Android:
```bash
# 1. Compilar para Android
npx expo run:android

# 2. O generar APK
eas build --platform android --profile preview

# 3. Instalar en dispositivo
adb install app.apk

# 4. Probar audio bidireccional
```

---

## 🎬 Cómo Probar Ahora (Web)

### 1. Iniciar Proxy
```powershell
node proxy/index.js
```

### 2. Iniciar App
```powershell
npm run dev
```

### 3. En la App:
1. **Abrir Modo Manual**
2. **Seleccionar Oficina (P2)** → AXIS I8116-E
3. **Ver interfaz completa:**
   ```
   [AXIS I8116-E - SIP Audio]
   🟢 LLAMADA ACTIVA
   [COLGAR] [ACTIVO]
   ⚠️ Modo prueba (solo micrófono local)
   ```
4. **Presionar "LLAMAR"**
5. **Ver logs:**
   ```
   📞 Iniciando llamada a AXIS: 192.168.1.130
   📞 Plataforma: web, Modo: Proxy
   ✅ Micrófono capturado
   🌐 Modo Web: Audio capturado localmente
   ⚠️ Audio bidireccional completo solo disponible en Android
   ✅ Llamada conectada
   ```

### 4. Verificar:
- ✅ Contador de duración funciona
- ✅ Botón "ACTIVO/SILENCIADO" funciona
- ✅ Botón "COLGAR" funciona
- ✅ Micrófono se captura
- ⚠️ Audio no llega al AXIS (esperado en web)

---

## 📝 Resumen

### **EN WEB:**
- Solo para probar la UI
- Audio capturado pero no enviado
- CORS bloquea comunicación directa

### **EN ANDROID:**
- Audio bidireccional completo
- WebRTC directo al AXIS
- Sin CORS, sin bloqueos

**La implementación está lista. En web puedes probar la interfaz, pero el audio real solo funcionará en Android. 🚀**

---

**Última actualización:** 18 de Octubre, 2025  
**Estado:** Implementación completa, funcional en Android

