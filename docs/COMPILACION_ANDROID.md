# Compilacion Android (Expo + Gradle)

## Objetivo

Compilar sin perder cambios locales del SDK (`android/app/src/main/java/com/puertas/santander/dvrsdk/`).

## Reglas para no sobrescribir cambios

- Comandos de build (`expo run:android`, `gradlew assembleDebug`) **no reemplazan** tus archivos.
- Evita comandos destructivos:
  - `git reset --hard`
  - `git checkout -- .`
  - limpiar rama sin commit/stash

## Flujo recomendado antes de compilar

1. Verificar estado:
   - `git status`
2. Guardar trabajo:
   - commit en rama actual, o
   - `git stash` si necesitas cambiar de contexto.

## Opcion A: compilar con Gradle (recomendada para nativo)

Desde `android/`:

```powershell
.\gradlew clean
.\gradlew assembleDebug
```

Instalar en dispositivo conectado:

```powershell
.\gradlew installDebug
```

APK generado:

- `android/app/build/outputs/apk/debug/app-debug.apk`

## Opcion B: compilar con Expo

Desde raiz del proyecto:

```powershell
npx expo run:android
```

Esto tambien usa el codigo nativo actual del directorio `android/`.

## Validacion basica post-build

1. Abrir app.
2. Ir a flujo de camara manual.
3. Probar:
   - `CONECTAR SDK`
   - `INICIAR LIVE` / `DETENER LIVE`
   - `INICIAR INTERCOM` / `DETENER INTERCOM`

Si falla, revisar logs con `adb logcat` filtrando `DvrSdk`.
