# PRESUPUESTO FASE 2 — COCE (Centro de Operaciones y Control Externo)

## Funcionalidades avanzadas

**Cliente:** SAIMA SEGURIDAD  
**Proyecto:** Sistema COCE – Fase 2 (funcionalidades avanzadas)  
**Fecha:** Enero 2026

**Equipo previsto:**
- 2 desarrolladores (backend + frontend)
- Coordinación directa con el equipo del sistema local y de tablets

**Tarifa de desarrollo:** 45 €/hora

---

## 1. Alcance de la Fase 2 (ampliación del MVP)

Esta fase corresponde a la segunda parte del COCE, centrada en completar las funcionalidades que quedaron excluidas del MVP.

### Incluye

**1. Sistema completo de actualizaciones remotas**
- Gestión de versiones de software del PC local y de la tablet.
- Definición de “paquetes de actualización” (PC / tablet).
- Subida y registro de nuevas versiones en el COCE.
- Lanzamiento controlado de actualizaciones hacia las instalaciones.
- Seguimiento de estado de actualización (pendiente / en curso / completada / error).
- Reintentos y manejo básico de errores.

**2. Mensajería avanzada**
- Bandeja de mensajes por instalación / dispositivo.
- Mensajes unidireccionales (centro → tablet) y bidireccionales (centro ↔ tablet).
- Categorización de mensajes (informativos / alertas / incidencias).
- Estado de lectura (enviado / recibido / leído).
- Filtros y búsquedas por fecha, estado y tipo de mensaje.

**3. Reporting avanzado**
- Informes de actividad por instalación.
- Estadísticas de conexiones, aperturas remotas, reinicios, incidencias.
- Filtros por rango de fechas, instalación, tipo de evento.
- Exportación de informes (por ejemplo CSV).
- Paneles básicos de KPIs en el propio COCE.

**4. Gestión avanzada de roles y permisos**
- Definición de perfiles (ejemplo: administrador, operador, solo lectura).
- Asignación de permisos por módulo (control remoto, reporting, actualizaciones, mensajería).
- Gestión de usuarios: alta, baja, edición, bloqueo.
- Registro de acciones relevantes de usuarios para auditoría.

**5. Alertas inteligentes y notificaciones complejas**
- Definición de reglas de alerta (ej.: caída repetida de una instalación, múltiples errores de actualización, tablets desconectadas X minutos, etc.).
- Notificaciones en el dashboard (banners, listas de alertas abiertas).
- Posibilidad de notificaciones por email/SMS si se define en fases posteriores (se deja preparado el diseño de la lógica, pero sin integrar proveedores externos complejos).
- Gestión del ciclo de vida de la alerta (nueva / en curso / resuelta).

---

## 2. Desglose de horas por bloque funcional

**Total estimado Fase 2 (COCE – funcionalidades avanzadas): 216 horas base**

### 2.1. Sistema completo de actualizaciones remotas  
**Horas estimadas: 64 h**

| Tarea | Horas |
|-------|-------|
| Diseño detallado del flujo de actualización remota (PC / tablet) | 8 h |
| Backend: endpoints para gestión de versiones y paquetes de actualización | 16 h |
| Backend: lógica de colas / estados de actualización y reintentos | 16 h |
| Frontend: pantalla de gestión de versiones y actualizaciones | 16 h |
| Frontend: indicadores de estado, logs básicos, filtros | 8 h |

### 2.2. Mensajería avanzada  
**Horas estimadas: 40 h**

| Tarea | Horas |
|-------|-------|
| Diseño de modelo de datos para mensajería avanzada | 4 h |
| Backend: endpoints para enviar, recibir, listar y marcar mensajes | 12 h |
| Frontend: bandeja de mensajes (lista, detalle, filtros) | 16 h |
| Ajustes en integración con tablet / sistema local (mensajería) | 8 h |

### 2.3. Reporting avanzado  
**Horas estimadas: 40 h**

| Tarea | Horas |
|-------|-------|
| Diseño de informes y KPIs (qué se reporta y cómo) | 6 h |
| Backend: endpoints de reporting con filtros parametrizables | 14 h |
| Frontend: pantallas de informes, tablas con filtros, paginación y exportación CSV | 16 h |
| Ajustes en modelo de datos / índice para consultas de reporting | 4 h |

### 2.4. Gestión avanzada de roles y permisos  
**Horas estimadas: 36 h**

| Tarea | Horas |
|-------|-------|
| Diseño de matriz de permisos (perfiles vs módulos/acciones) | 6 h |
| Backend: extensión del sistema de autenticación para roles avanzados | 12 h |
| Backend: comprobación de permisos en endpoints críticos | 8 h |
| Frontend: gestión de usuarios y roles (pantallas de administración) | 10 h |

### 2.5. Alertas inteligentes y notificaciones complejas  
**Horas estimadas: 36 h**

| Tarea | Horas |
|-------|-------|
| Definición de reglas de alertas y condiciones (documento funcional) | 6 h |
| Backend: motor de evaluación de reglas (jobs/cron, disparo de alertas) | 12 h |
| Backend: modelo de datos de alertas y endpoints de consulta / actualización de estado | 8 h |
| Frontend: panel de alertas (lista, detalle, estado, filtros) | 10 h |

---

## 3. Resumen de horas y coste Fase 2 COCE

| Bloque funcional | Horas |
|------------------|-------|
| Sistema completo de actualizaciones remotas | 64 h |
| Mensajería avanzada | 40 h |
| Reporting avanzado | 40 h |
| Gestión avanzada de roles y permisos | 36 h |
| Alertas inteligentes y notificaciones complejas | 36 h |
| **TOTAL HORAS BASE FASE 2 (COCE avanzado)** | **216 h** |

**Contingencia propuesta:** 5% sobre horas base  
- 5% de 216 h ≈ 11 h

**Total horas con contingencia:**  
- 216 h + 11 h = 227 h (opcional: redondear a 228 h para presentación).

**Coste económico (tarifa 45 €/h)**  
- Horas base (216 h) × 45 €/h = **9.720 €**  
- Contingencia 5% (11 h) × 45 €/h = **495 €**

**Presentación del importe:**

1. **Desglosado**
   - Horas base: 9.720 €
   - Contingencia (5%): 495 €
   - **Total estimado Fase 2 COCE: 10.215 € + IVA**

2. **Redondeado**
   - **Total estimado Fase 2 COCE: 10.200 € + IVA**

---

## 4. Duración estimada y forma de pago (Fase 2 COCE)

Con 2 programadores, las 216–228 horas se pueden abordar en un plazo aproximado de:
- **Duración estimada:** 4–6 semanas  
- Dependiendo de la solapación con la Fase 1 y disponibilidad del equipo del sistema local.

**Ejemplo de esquema de pagos** (ajustable):
- **30%** a la aprobación y arranque de la Fase 2 COCE.
- **40%** tras la entrega de una versión beta funcional (todas las funcionalidades en entorno de pruebas).
- **30%** a la entrega final y validación en entorno productivo / pre-productivo.

---

## 5. Exclusiones / Alcance diferido

Este documento corresponde solo a la **segunda parte del COCE (Fase 2 – funcionalidades avanzadas)**.

**Se excluyen explícitamente:**
- Cualquier desarrollo adicional en el sistema local que no esté previsto en COCE (endpoints nuevos, cambios no contemplados).
- Integraciones con proveedores externos de notificaciones (SMS, correo masivo, etc.) más allá de lo estrictamente necesario para la fase definida.
- Nuevos módulos que no estén relacionados con:
  - Actualizaciones remotas
  - Mensajería avanzada
  - Reporting avanzado
  - Roles y permisos avanzados
  - Alertas inteligentes / notificaciones complejas
