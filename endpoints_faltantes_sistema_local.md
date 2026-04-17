# ENDPOINTS FALTANTES EN SISTEMA LOCAL
## Para Integración con COCE

**Objetivo:** Identificar qué endpoints y funcionalidades debe agregar el sistema local (PC Industrial) para que el COCE pueda funcionar correctamente.

---

## 📋 ENDPOINTS REQUERIDOS POR EL COCE

### ✅ Endpoints Ya Incluidos (Según Presupuesto Original)

| Endpoint | Método | Estado | Observaciones |
|----------|--------|--------|---------------|
| `/api/status` | GET | ✅ Incluido | Estado general del sistema |
| `/api/doors` | GET | ✅ Incluido | Estado de las puertas |
| `/api/modes` | GET | ✅ Incluido | Modos disponibles y activo |
| `/api/relays` | GET | ✅ Incluido | Estado de relés |
| `/api/mode` | POST | ✅ Incluido | Cambio de modo operativo |
| `/api/events` | GET | ✅ Incluido | Eventos recientes |

---

## ❌ Endpoints FALTANTES (No Mencionados en Presupuesto)

### 1. Estado de Conectividad

```http
GET /api/connectivity
```

**Descripción:** Estado de conectividad del PC Industrial y de la Tablet Android

**Respuesta:**
```json
{
  "pc_industrial": {
    "connected": true,
    "last_heartbeat": "2026-01-26T10:30:00Z",
    "uptime_seconds": 86400
  },
  "tablet": {
    "connected": true,
    "last_heartbeat": "2026-01-26T10:29:55Z",
    "ip_address": "192.168.1.100",
    "app_version": "1.0.0"
  },
  "coce_connection": {
    "connected": true,
    "last_heartbeat": "2026-01-26T10:30:00Z"
  }
}
```

**Horas estimadas:** 8 horas

---

### 2. Versión del Software

```http
GET /api/version
```

**Descripción:** Versión instalada del software de control de accesos

**Respuesta:**
```json
{
  "version": "1.0.0",
  "build_date": "2026-01-15",
  "git_commit": "abc123",
  "update_available": false,
  "latest_version": "1.0.0"
}
```

**Horas estimadas:** 4 horas

---

### 3. Versión de la App Android

```http
GET /api/version/tablet
```

**Descripción:** Versión instalada de la app Android en la tablet

**Respuesta:**
```json
{
  "version": "1.0.0",
  "version_code": 1,
  "package_name": "com.santander.accesos",
  "last_update": "2026-01-20T08:00:00Z"
}
```

**Nota:** Requiere que la tablet exponga este endpoint o que el PC Industrial lo consulte.

**Horas estimadas:** 8 horas

---

### 4. Reinicio Remoto del Software

```http
POST /api/restart
```

**Descripción:** Reiniciar el software de control (sin reiniciar el PC)

**Request:**
```json
{
  "confirm": true,
  "reason": "Actualización remota desde COCE"
}
```

**Respuesta:**
```json
{
  "status": "restarting",
  "estimated_seconds": 30,
  "message": "El software se reiniciará en 30 segundos"
}
```

**Horas estimadas:** 12 horas

---

### 5. Apertura Remota de Puertas (COCE)

```http
POST /api/doors/open/{door_id}
```

**Descripción:** Apertura remota de puerta desde COCE

**Parámetros:**
- `door_id`: "calle" o "oficina"

**Request:**
```json
{
  "source": "coce",
  "user": "admin@coce",
  "reason": "Mantenimiento programado",
  "duration_seconds": 5
}
```

**Respuesta:**
```json
{
  "status": "opening",
  "door": "calle",
  "duration_seconds": 5,
  "timestamp": "2026-01-26T10:30:00Z"
}
```

**Nota:** Requiere implementar actuaciones 31-32 (Apertura Remota COCE) que están en Fase 3 del MVP.

**Horas estimadas:** 24 horas (incluye lógica de actuaciones)

---

### 6. WebSocket para Estado en Tiempo Real

```http
WS /ws/status
```

**Descripción:** Conexión WebSocket para recibir actualizaciones de estado en tiempo real

**Mensajes enviados:**
```json
{
  "type": "status_update",
  "data": {
    "mode": "AUTOMATICO",
    "doors": {
      "calle": "closed",
      "oficina": "open"
    },
    "alarms": []
  },
  "timestamp": "2026-01-26T10:30:00Z"
}
```

**Heartbeat:** Cada 30 segundos

**Horas estimadas:** 24 horas

---

### 7. Heartbeat (Alternativa a WebSocket)

```http
GET /api/heartbeat
```

**Descripción:** Endpoint de heartbeat para verificar que el sistema está activo

**Respuesta:**
```json
{
  "status": "alive",
  "timestamp": "2026-01-26T10:30:00Z",
  "uptime_seconds": 86400
}
```

**Horas estimadas:** 4 horas

---

### 8. Sistema de Actualizaciones (Lado Local)

#### 8.1. Verificar Actualización Disponible

```http
POST /api/update/check
```

**Descripción:** Verificar si hay una actualización disponible

**Request:**
```json
{
  "component": "software" | "tablet",
  "current_version": "1.0.0"
}
```

**Respuesta:**
```json
{
  "update_available": true,
  "latest_version": "1.1.0",
  "download_url": "https://coce.santander.es/updates/v1.1.0.zip",
  "checksum_sha256": "abc123...",
  "size_bytes": 10485760,
  "release_notes": "Corrección de bugs..."
}
```

**Horas estimadas:** 8 horas

---

#### 8.2. Iniciar Actualización

```http
POST /api/update/start
```

**Descripción:** Iniciar el proceso de actualización

**Request:**
```json
{
  "component": "software",
  "version": "1.1.0",
  "download_url": "https://coce.santander.es/updates/v1.1.0.zip",
  "checksum_sha256": "abc123...",
  "scheduled_time": "2026-01-26T02:00:00Z"  // Opcional
}
```

**Respuesta:**
```json
{
  "status": "downloading",
  "progress_percent": 0,
  "estimated_seconds": 300
}
```

**Horas estimadas:** 16 horas

---

#### 8.3. Estado de Actualización

```http
GET /api/update/status
```

**Descripción:** Estado de una actualización en curso

**Respuesta:**
```json
{
  "status": "installing",  // downloading, installing, completed, failed
  "component": "software",
  "version": "1.1.0",
  "progress_percent": 75,
  "current_step": "Instalando dependencias",
  "started_at": "2026-01-26T02:00:00Z",
  "estimated_completion": "2026-01-26T02:05:00Z"
}
```

**Horas estimadas:** 4 horas

---

#### 8.4. Rollback de Actualización

```http
POST /api/update/rollback
```

**Descripción:** Hacer rollback de una actualización fallida

**Request:**
```json
{
  "component": "software",
  "target_version": "1.0.0"
}
```

**Respuesta:**
```json
{
  "status": "rolling_back",
  "previous_version": "1.1.0",
  "target_version": "1.0.0"
}
```

**Horas estimadas:** 12 horas

**Total Sistema de Actualizaciones:** 40 horas

---

### 9. Eventos en Formato Compatible con COCE

```http
GET /api/events/sync
```

**Descripción:** Sincronizar eventos pendientes con COCE (formato específico)

**Query Parameters:**
- `since`: Timestamp desde el cual obtener eventos
- `limit`: Número máximo de eventos

**Respuesta:**
```json
{
  "events": [
    {
      "id": "evt_123",
      "type": "mode_change",
      "office_id": "OF001",
      "timestamp": "2026-01-26T10:30:00Z",
      "data": {
        "old_mode": "AUTOMATICO",
        "new_mode": "CERRADO",
        "source": "remote_coce"
      }
    }
  ],
  "total": 150,
  "synced_at": "2026-01-26T10:30:00Z"
}
```

**Horas estimadas:** 8 horas

---

### 10. Mensajería (Recepción desde COCE)

```http
POST /api/message/receive
```

**Descripción:** Endpoint para recibir mensajes del COCE (usado por la tablet)

**Request:**
```json
{
  "message_id": "msg_123",
  "type": "maintenance",
  "priority": "high",
  "title": "Mantenimiento Programado",
  "body": "El sistema estará en mantenimiento el día 28/01",
  "expires_at": "2026-01-28T23:59:59Z"
}
```

**Respuesta:**
```json
{
  "status": "received",
  "message_id": "msg_123",
  "received_at": "2026-01-26T10:30:00Z"
}
```

**Nota:** Este endpoint probablemente debe estar en la app Android, no en el PC Industrial.

**Horas estimadas:** 8 horas (si se implementa en PC Industrial como proxy)

---

### 11. Estado de Mensajes

```http
GET /api/message/status
```

**Descripción:** Estado de mensajes recibidos del COCE

**Respuesta:**
```json
{
  "messages": [
    {
      "message_id": "msg_123",
      "status": "read",
      "received_at": "2026-01-26T10:30:00Z",
      "read_at": "2026-01-26T10:31:00Z"
    }
  ]
}
```

**Horas estimadas:** 4 horas

---

## 📊 RESUMEN DE HORAS

| Categoría | Endpoints | Horas |
|-----------|-----------|-------|
| Estado y Conectividad | `/api/connectivity`, `/api/version`, `/api/version/tablet` | 20 |
| Control Remoto | `/api/restart`, `/api/doors/open/{door_id}` | 36 |
| Tiempo Real | `/ws/status`, `/api/heartbeat` | 28 |
| Actualizaciones | `/api/update/*` (4 endpoints) | 40 |
| Eventos y Mensajería | `/api/events/sync`, `/api/message/*` | 20 |
| **TOTAL** | **11 endpoints** | **144 horas** |

**Nota:** Estimación conservadora. Puede variar según complejidad real.

---

## 🎯 PRIORIZACIÓN

### Prioridad ALTA (Críticos para COCE Fase 1)

1. ✅ `/api/connectivity` - Estado de conectividad
2. ✅ `/api/version` - Versión del software
3. ✅ `/api/restart` - Reinicio remoto
4. ✅ `/ws/status` o `/api/heartbeat` - Tiempo real

**Total Prioridad Alta: ~60 horas**

### Prioridad MEDIA (Necesarios para funcionalidades avanzadas)

5. ⚠️ `/api/version/tablet` - Versión app Android
6. ⚠️ `/api/doors/open/{door_id}` - Apertura remota
7. ⚠️ `/api/events/sync` - Sincronización eventos

**Total Prioridad Media: ~40 horas**

### Prioridad BAJA (Para Fase 2 del COCE)

8. ⚠️ `/api/update/*` - Sistema de actualizaciones
9. ⚠️ `/api/message/*` - Mensajería

**Total Prioridad Baja: ~44 horas**

---

## ✅ RECOMENDACIÓN

### Opción 1: MVP del Sistema Local + COCE

**Agregar al sistema local (Fase 1):**
- Endpoints de Prioridad ALTA: **60 horas**
- Endpoints de Prioridad MEDIA: **40 horas**

**Total: 100 horas adicionales al sistema local**

**Diferir a Fase 2:**
- Sistema de actualizaciones completo
- Mensajería completa

---

### Opción 2: Sistema Completo

**Agregar todos los endpoints: 144 horas**

**Ventaja:** COCE puede implementar todas las funcionalidades desde el inicio

**Desventaja:** Mayor inversión inicial

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1 (MVP)
- [ ] Implementar `/api/connectivity`
- [ ] Implementar `/api/version`
- [ ] Implementar `/api/restart`
- [ ] Implementar `/ws/status` o `/api/heartbeat`
- [ ] Implementar `/api/version/tablet` (si aplica)
- [ ] Implementar `/api/doors/open/{door_id}` (actuaciones 31-32)
- [ ] Implementar `/api/events/sync`

### Fase 2 (Completo)
- [ ] Implementar sistema de actualizaciones completo
- [ ] Implementar mensajería completa
- [ ] Optimización y testing exhaustivo

---

## 🔗 INTEGRACIÓN CON COCE

### Flujo de Comunicación

```
COCE                    Sistema Local (PC Industrial)
  |                              |
  |--- WebSocket Connect ------->|
  |<-- Status Updates -----------|
  |                              |
  |--- GET /api/status --------->|
  |<-- Status Response ----------|
  |                              |
  |--- POST /api/mode ---------->|
  |<-- Mode Changed -------------|
  |                              |
  |--- POST /api/restart ------->|
  |<-- Restarting ---------------|
```

---

## 📝 NOTAS IMPORTANTES

1. **WebSockets vs Polling:**
   - WebSockets son más eficientes para tiempo real
   - Polling (heartbeat) es más simple pero menos eficiente
   - Recomendación: WebSockets si hay muchos endpoints, heartbeat si son pocos

2. **Sistema de Actualizaciones:**
   - Muy complejo, requiere infraestructura de almacenamiento
   - Considerar diferir a Fase 2 del COCE
   - MVP puede tener solo verificación de versión

3. **Mensajería:**
   - Probablemente debe implementarse en app Android directamente
   - El PC Industrial puede actuar como proxy o no intervenir

4. **Apertura Remota COCE:**
   - Requiere implementar actuaciones 31-32
   - Actualmente están en Fase 3 del MVP del sistema local
   - **Recomendación:** Mover a Fase 1 o crear endpoint básico

---

**Última actualización:** Enero 2026

