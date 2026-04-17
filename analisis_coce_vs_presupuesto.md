# ANÁLISIS: COCE vs Presupuesto Original
## Revisión de Consistencia y Alcance Mínimo

**Fecha:** Enero 2026  
**Documentos Analizados:**
- `presupuesto_desarrollo_control_accesos.md` (Sistema Local)
- `resumen_requerimientos_funcionales.md` (Requerimientos)
- `nueva propuesta cliente.md` (COCE)

---

## 🔍 RESUMEN EJECUTIVO

### Hallazgos Principales

1. ✅ **COCE es proyecto separado**: Correctamente identificado como Fase 2, no incluido en presupuesto original
2. ⚠️ **Dependencias no clarificadas**: El sistema local debe exponer API para COCE, pero no está detallado en presupuesto
3. ⚠️ **Inconsistencias en alcance**: El COCE pide funcionalidades que requieren preparación en sistema local
4. ✅ **Cronograma realista**: 12-14 semanas para COCE Fase 1 es razonable
5. ⚠️ **Falta presupuesto del COCE**: No hay estimación de horas/costos

---

## 📊 COMPARATIVA: Sistema Local vs COCE

### Sistema Local (Presupuesto Original)

| Aspecto | Estado | Observaciones |
|---------|--------|---------------|
| **API REST** | ✅ Incluido (92 horas) | Endpoints básicos, pero ¿suficientes para COCE? |
| **Integración COCE** | ❌ NO incluido | Mencionado como "Fase 2" - no presupuestado |
| **Apertura Remota COCE** | ⚠️ Mencionado en entradas | IN8 y IN12 en módulos, pero sin lógica |
| **Preparación COCE** | ⚠️ Mencionado | "Arquitectura preparada" pero sin detalle |

### COCE (Nueva Propuesta)

| Aspecto | Estado | Observaciones |
|---------|--------|---------------|
| **Visualización Estado** | ✅ Fase 1 | Requiere API en sistema local |
| **Control Remoto** | ✅ Fase 1 | Cambio de modo remoto - requiere endpoint |
| **Actualizaciones Remotas** | ✅ Fase 1 | Sistema complejo, requiere infraestructura |
| **Mensajería a Tablets** | ✅ Fase 1 | Requiere integración con app Android |
| **Gestión Versiones** | ✅ Fase 1 | Sistema complejo de repositorio |

---

## ⚠️ INCONSISTENCIAS IDENTIFICADAS

### 1. **API REST del Sistema Local - ¿Suficiente para COCE?**

**Problema:**
- El presupuesto original incluye 92 horas para API REST
- El COCE necesita endpoints específicos que pueden no estar incluidos

**Endpoints que el COCE necesita (según documento):**

```
GET  /api/status          → Estado general (✅ probablemente incluido)
GET  /api/offices         → Lista de oficinas (❌ no mencionado)
GET  /api/office/{id}     → Estado específico oficina (❌ no mencionado)
POST /api/mode            → Cambio de modo (✅ mencionado)
POST /api/restart         → Reinicio remoto software (❌ no mencionado)
GET  /api/version         → Versión instalada (❌ no mencionado)
POST /api/update          → Iniciar actualización (❌ no mencionado)
GET  /api/events          → Eventos (✅ mencionado, pero ¿formato correcto?)
POST /api/message         → Enviar mensaje a tablet (❌ no mencionado)
```

**Impacto:** El sistema local puede necesitar **endpoints adicionales** no presupuestados.

---

### 2. **Apertura Remota COCE - Lógica No Implementada**

**Problema:**
- Los requerimientos funcionales mencionan:
  - IN8: "Apertura Remota COCE Oficina"
  - IN12: "Apertura Remota Calle"
- Pero en el presupuesto original, las actuaciones 31-32 (COCE) están en Fase 3 del MVP

**Inconsistencia:**
- El COCE necesita poder abrir puertas remotamente (Fase 1 del COCE)
- Pero la lógica de "Apertura Remota COCE" está en Fase 3 del sistema local (MVP)

**Impacto:** **Dependencia crítica** - El COCE no puede funcionar completamente sin esta funcionalidad.

---

### 3. **Mensajería COCE → Tablet**

**Problema:**
- El COCE necesita enviar mensajes a las tablets (Fase 1)
- Requiere que la app Android tenga:
  - Endpoint para recibir mensajes
  - Sistema de notificaciones
  - Confirmación de recepción

**Pregunta:** ¿Está esto incluido en el desarrollo de la app Android?

**Impacto:** Si no está incluido, el COCE no puede cumplir con este requisito.

---

### 4. **Sistema de Actualizaciones Remotas**

**Problema:**
- El COCE necesita:
  - Repositorio de versiones
  - Sistema de descarga y verificación
  - Rollback automático
  - Actualización del PC Industrial (Python)
  - Actualización del APK Android

**Complejidad:**
- Sistema muy complejo que requiere:
  - Infraestructura de almacenamiento
  - Sistema de checksums (SHA-256)
  - Gestión de versiones
  - Scripts de actualización en sistema local
  - Sistema de rollback

**Impacto:** Esta funcionalidad es **muy compleja** y puede requerir más tiempo del estimado.

---

### 5. **WebSockets y Tiempo Real**

**Problema:**
- El COCE requiere WebSockets para estado en tiempo real
- El sistema local debe implementar:
  - Servidor WebSocket
  - Heartbeat cada 30 segundos
  - Envío de eventos en tiempo real

**Pregunta:** ¿Está esto incluido en las 92 horas de API REST del sistema local?

**Impacto:** WebSockets añaden complejidad significativa.

---

## ✅ LO MÍNIMO REQUERIDO EN COCE (Fase 1)

### Funcionalidades Críticas (Must Have)

1. **Visualización del Estado** ✅
   - Dashboard con estado de oficinas
   - Indicadores verde/amarillo/rojo
   - Lista filtrable
   - **Complejidad:** Media
   - **Dependencias:** API REST en sistema local

2. **Control Remoto Básico** ✅
   - Cambio de modo operativo remoto
   - Reinicio remoto del software
   - **Complejidad:** Media
   - **Dependencias:** Endpoints en sistema local

3. **Autenticación y Seguridad** ✅
   - Autenticación usuario/contraseña
   - TLS 1.3
   - JWT tokens
   - **Complejidad:** Baja-Media
   - **Dependencias:** Ninguna (COCE interno)

4. **Logs y Auditoría Básica** ✅
   - Registro de acciones
   - Visualización básica
   - **Complejidad:** Baja
   - **Dependencias:** Base de datos COCE

### Funcionalidades Complejas (Should Have)

5. **Gestión de Versiones** ⚠️
   - Repositorio de versiones
   - Consulta de versiones instaladas
   - Detección de desactualizaciones
   - **Complejidad:** Alta
   - **Dependencias:** API en sistema local para consultar versión

6. **Actualización Remota de Software** ⚠️
   - Sistema de actualizaciones
   - Verificación de integridad
   - Rollback automático
   - **Complejidad:** Muy Alta
   - **Dependencias:** 
     - Infraestructura de almacenamiento
     - Scripts de actualización en sistema local
     - Sistema de rollback

7. **Mensajería a Tablets** ⚠️
   - Envío de mensajes
   - Confirmación de recepción
   - **Complejidad:** Media-Alta
   - **Dependencias:** 
     - API en app Android
     - Sistema de notificaciones en tablet

---

## 📋 ENDPOINTS REQUERIDOS EN SISTEMA LOCAL

### Para que el COCE funcione, el sistema local debe exponer:

#### Estado y Monitorización
```
GET  /api/status              → Estado general del sistema
GET  /api/doors               → Estado de puertas
GET  /api/modes               → Modos disponibles y activo
GET  /api/relays              → Estado de relés
GET  /api/connectivity        → Estado de conectividad (PC + Tablet)
GET  /api/alarms              → Alarmas activas
```

#### Control Remoto
```
POST /api/mode                → Cambiar modo operativo
POST /api/restart             → Reinicio remoto del software
POST /api/emergency           → Activar modo emergencia (si aplica)
```

#### Gestión de Versiones
```
GET  /api/version             → Versión instalada del software
GET  /api/version/tablet      → Versión instalada de la app Android
```

#### Actualizaciones
```
POST /api/update/check        → Verificar si hay actualización disponible
POST /api/update/start        → Iniciar proceso de actualización
GET  /api/update/status       → Estado de actualización en curso
POST /api/update/rollback     → Rollback de actualización (si falla)
```

#### Eventos y Logs
```
GET  /api/events              → Eventos recientes (formato compatible con COCE)
POST /api/events/sync         → Sincronización de eventos pendientes
```

#### Mensajería (si aplica)
```
POST /api/message/receive     → Endpoint para recibir mensajes del COCE (en tablet)
GET  /api/message/status      → Estado de mensajes recibidos
```

#### Heartbeat y WebSocket
```
WS   /ws/status               → WebSocket para estado en tiempo real
GET  /api/heartbeat           → Endpoint de heartbeat (alternativa a WS)
```

---

## 💰 ESTIMACIÓN DE HORAS PARA COCE

### Análisis Basado en Funcionalidades

#### FASE 1: Núcleo COCE (Obligatoria)

| Componente | Horas Estimadas | Justificación |
|------------|-----------------|---------------|
| **Análisis y Diseño** | 60 horas | Arquitectura compleja, diseño de BD, protocolos |
| **Backend API (FastAPI)** | 120 horas | API REST completa, WebSockets, autenticación |
| **Sistema de Actualizaciones** | 80 horas | Muy complejo: repositorio, verificación, rollback |
| **Gestión de Versiones** | 40 horas | Repositorio, consulta, detección |
| **Frontend (React + Next.js)** | 100 horas | Dashboard, gestión oficinas, paneles |
| **Base de Datos (PostgreSQL)** | 40 horas | Schema, migraciones, optimización |
| **Integración Sistema Local** | 60 horas | Adaptación API sistema local, WebSockets |
| **Integración App Android** | 40 horas | Mensajería, notificaciones |
| **Testing** | 80 horas | Unitarios, integración, carga (500 oficinas) |
| **Documentación** | 40 horas | Manuales, API docs, guías |
| **Despliegue e Infraestructura** | 40 horas | Docker, scripts, configuración |
| **Gestión de Proyecto** | 40 horas | Coordinación, reuniones, seguimiento |
| **TOTAL FASE 1** | **720 horas** | **vs 12-14 semanas estimadas (480-560 horas)** |

**Observación:** El cronograma de 12-14 semanas asume ~40 horas/semana = 480-560 horas, pero la estimación real es **720 horas**. Hay una **subestimación del 28-50%**.

---

## 🎯 RECOMENDACIONES

### 1. **Ajustar Presupuesto del Sistema Local**

El sistema local necesita **endpoints adicionales** para el COCE:

**Horas adicionales estimadas:**
- Endpoints de control remoto: +16 horas
- Endpoints de versiones: +8 horas
- Sistema de actualizaciones (lado local): +32 horas
- WebSockets y heartbeat: +24 horas
- Mensajería (si aplica): +16 horas

**Total adicional: ~96 horas**

**Recomendación:** Agregar estas horas al presupuesto del sistema local o crear una "Fase 1.5" de preparación para COCE.

---

### 2. **Simplificar Fase 1 del COCE**

**Opción A: MVP del COCE (Recomendado)**

Reducir Fase 1 a lo esencial:

| Funcionalidad | Incluir en MVP | Justificación |
|---------------|----------------|---------------|
| Visualización Estado | ✅ Sí | Core del COCE |
| Control Remoto Básico | ✅ Sí | Cambio de modo, reinicio |
| Autenticación | ✅ Sí | Seguridad básica |
| Logs Básicos | ✅ Sí | Auditoría mínima |
| Gestión Versiones | ⚠️ Simplificado | Solo consulta, sin actualizaciones |
| Actualizaciones Remotas | ❌ Fase 2 | Muy complejo, diferir |
| Mensajería Tablets | ⚠️ Simplificado | Solo básico, sin confirmación |

**Horas MVP COCE: ~400-450 horas** (vs 720 horas completo)

**Opción B: Mantener Todo en Fase 1**

Ajustar cronograma a **18-20 semanas** (vs 12-14 semanas) o aumentar equipo.

---

### 3. **Clarificar Dependencias**

**Documento de Dependencias COCE ↔ Sistema Local:**

Crear documento que especifique:
- Qué endpoints necesita el COCE del sistema local
- Qué funcionalidades del sistema local deben estar listas antes del COCE
- Orden de desarrollo recomendado

---

### 4. **Priorizar Funcionalidades**

**Prioridad Alta (MVP COCE):**
1. Visualización de estado
2. Control remoto básico (cambio de modo)
3. Autenticación y seguridad

**Prioridad Media (Fase 1.5 o Fase 2):**
4. Gestión de versiones (simplificada)
5. Mensajería básica a tablets
6. Logs y auditoría

**Prioridad Baja (Fase 2):**
7. Actualizaciones remotas completas
8. Reporting avanzado
9. Roles y permisos avanzados

---

## 📊 COMPARATIVA: Cronograma vs Realidad

| Aspecto | Cronograma Propuesto | Estimación Realista | Diferencia |
|---------|---------------------|-------------------|------------|
| **Duración Fase 1** | 12-14 semanas | 18-20 semanas | +6 semanas |
| **Horas Estimadas** | 480-560 horas | 720 horas | +160-240 horas |
| **Equipo Necesario** | 1 desarrollador | 1-2 desarrolladores | Posible necesidad de refuerzo |

---

## ✅ CHECKLIST DE CONSISTENCIA

### Sistema Local
- [ ] ¿Incluye endpoints para estado en tiempo real?
- [ ] ¿Incluye endpoints para control remoto?
- [ ] ¿Incluye sistema de versiones consultable?
- [ ] ¿Incluye WebSockets o heartbeat?
- [ ] ¿Incluye lógica de "Apertura Remota COCE"?
- [ ] ¿Incluye preparación para actualizaciones remotas?

### COCE
- [ ] ¿Cronograma realista para funcionalidades propuestas?
- [ ] ¿Dependencias del sistema local clarificadas?
- [ ] ¿Integración con app Android planificada?
- [ ] ¿Infraestructura de actualizaciones considerada?

### App Android
- [ ] ¿Incluye endpoint para recibir mensajes del COCE?
- [ ] ¿Incluye sistema de notificaciones?
- [ ] ¿Incluye consulta de versión instalada?

---

## 🎯 CONCLUSIÓN

### Hallazgos Principales

1. **El COCE es un proyecto complejo** que requiere más horas de las estimadas en el cronograma
2. **Hay dependencias no clarificadas** entre sistema local y COCE
3. **Falta presupuesto detallado** del COCE
4. **Recomendación:** Crear MVP del COCE más simple o ajustar cronograma/presupuesto

### Recomendación Final

**Opción 1: MVP Simplificado del COCE (Recomendado)**
- Fase 1: Solo visualización, control básico, autenticación (~400-450 horas)
- Fase 2: Actualizaciones, mensajería completa, reporting (~300-350 horas)

**Opción 2: COCE Completo con Ajustes**
- Ajustar cronograma a 18-20 semanas
- Aumentar presupuesto a ~720 horas
- Clarificar todas las dependencias con sistema local

**Opción 3: Preparación en Sistema Local**
- Agregar ~96 horas al sistema local para endpoints COCE
- Desarrollar COCE después con dependencias claras

---

**Próximos Pasos Sugeridos:**
1. Crear documento de dependencias COCE ↔ Sistema Local
2. Ajustar presupuesto del sistema local con endpoints COCE
3. Decidir entre MVP simplificado o COCE completo
4. Crear presupuesto detallado del COCE

