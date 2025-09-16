# Santander Door Control App

Esta aplicación de control de puertas para Banco Santander incluye funcionalidades avanzadas de comunicación SIP y control de intercomunicadores.

## Características Principales

- Control de puertas automático y manual
- Comunicación SIP bidireccional con intercomunicadores
- Visualización de video en tiempo real
- Múltiples modos de operación
- Interfaz responsive para tablets

## Configuración SIP

La aplicación ahora incluye soporte completo para comunicación SIP utilizando:
- `react-native-webrtc` para manejo de media streams
- `sip.js` para señalización SIP

### Requisitos para SIP

Para que la funcionalidad SIP funcione correctamente, necesitarás:

1. **EAS Build**: Debido a que `react-native-webrtc` requiere módulos nativos, deberás usar EAS Build para crear builds personalizados.

2. **Permisos**: La aplicación solicitará permisos de micrófono y cámara automáticamente.

3. **Configuración del servidor SIP**: Cada intercomunicador debe estar configurado con:
   - URI SIP
   - Usuario y contraseña SIP
   - Dominio SIP
   - Configuración TLS (opcional)

## Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo (requiere EAS Build para funcionalidad SIP completa)
npm run dev

# Build para producción
eas build --platform android
```

## Compatibilidad

- Android 8.0+ (API level 26+)
- iOS 12.0+
- Tablets optimizadas (8", 10", 11")

## Funcionalidades SIP

- Llamadas de audio bidireccionales
- Control de micrófono (mute/unmute)
- Control de altavoz
- Indicadores de estado de llamada
- Temporizador de duración de llamada
- Manejo de errores y reconexión automática
