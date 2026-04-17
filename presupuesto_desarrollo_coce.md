# PRESUPUESTO DE DESARROLLO
## Sistema COCE (Centro de Operaciones y Control Externo)
### Banco Santander - SAIMA SEGURIDAD

**Fecha de Presupuesto:** Enero 2026  
**Cliente:** SAIMA SEGURIDAD  
**Proyecto:** Desarrollo del Sistema COCE - Fase 1 (MVP)

---

## RESUMEN EJECUTIVO

| Concepto | Valor | Observaciones |
|----------|-------|---------------|
| **Total Horas de Desarrollo** | **360 horas** | MVP simplificado |
| **Duración Estimada** | **10-12 semanas** | Con 1 desarrollador full-stack |
| **Tecnologías Principales** | Node.js/Express o Python/FastAPI, React/Vue.js, PostgreSQL/MySQL, WebSockets |
| **Alcance** | MVP simplificado (sin actualizaciones remotas completas) |

---

## DESGLOSE DETALLADO POR COMPONENTE

### 1. ANÁLISIS Y DISEÑO TÉCNICO
**Horas: 32 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Análisis de requisitos COCE | 10 | Revisión especificaciones, integración con sistema local |
| Diseño de arquitectura | 13 | Arquitectura COCE, flujos de datos, diseño de BD |
| Diseño de API REST | 6 | Endpoints COCE, modelos de datos, autenticación |
| Diseño de interfaz web | 3 | Wireframes dashboard, estructura de componentes |

**Entregables:**
- Documento de diseño técnico COCE
- Diagramas de arquitectura
- Especificación API REST
- Mockups de interfaz web

---

### 2. DESARROLLO BACKEND API
**Horas: 64 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Configuración proyecto backend | 6 | Estructura, dependencias, framework (Node.js/Python) |
| Endpoints de estado y conectividad | 13 | GET /api/connectivity, estado PC + Tablet |
| Endpoints de control remoto | 16 | POST /api/restart, cambio de modo, apertura remota |
| Endpoints de versiones | 10 | GET /api/version, consulta versiones instaladas |
| Sistema de autenticación | 10 | JWT, roles básicos, seguridad |
| WebSockets tiempo real | 9 | WS /ws/status, actualización estado en tiempo real |

---

### 3. GESTIÓN DE VERSIONES (SIMPLIFICADA)
**Horas: 16 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Consulta de versiones | 10 | Visualización versiones PC y Tablet |
| Almacenamiento histórico | 6 | Registro de versiones instaladas |

**Nota:** Solo consulta, sin sistema de actualizaciones remotas (diferido a Fase 2)

---

### 4. DESARROLLO FRONTEND
**Horas: 64 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Configuración proyecto (React/Vue.js) | 8 | Estructura, build, routing |
| Dashboard principal | 16 | Visualización estado en tiempo real, mapas/plantas |
| Panel de control remoto | 13 | Interfaz para reinicio, cambio de modo, apertura puertas |
| Gestión de dispositivos | 10 | Listado PC + Tablet, estado conectividad |
| Visualización de versiones | 6 | Consulta versiones instaladas |
| Sistema de autenticación web | 6 | Login, gestión de sesión |
| Responsive design | 5 | Ajustes para mobile/tablet |

---

### 5. BASE DE DATOS
**Horas: 24 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Diseño de esquema | 6 | Tablas: dispositivos, eventos, usuarios, versiones |
| Implementación de modelos | 8 | ORM (Sequelize/TypeORM o SQLAlchemy) |
| Sistema de logs y auditoría | 6 | Almacenamiento eventos, consultas |
| Migraciones y scripts | 4 | Scripts de inicialización, migraciones |

---

### 6. INTEGRACIÓN CON SISTEMA LOCAL
**Horas: 32 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Integración endpoints sistema local | 16 | Consumo de API del sistema local |
| Manejo de errores y reconexión | 6 | Reintentos, timeouts, manejo desconexiones |
| Sincronización de estado | 6 | Mantener estado sincronizado |
| Testing de integración | 4 | Pruebas de integración end-to-end |

**Nota:** Requiere que el sistema local tenga los endpoints necesarios (ver dependencias)

---

### 7. INTEGRACIÓN CON APP ANDROID (BÁSICA)
**Horas: 16 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Integración mensajería básica | 10 | Envío/recepción mensajes básicos |
| Notificaciones | 6 | Sistema básico de notificaciones |

**Nota:** Funcionalidad simplificada, completa en Fase 2

---

### 8. TESTING Y CALIDAD
**Horas: 40 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests unitarios backend | 13 | Cobertura endpoints, lógica de negocio |
| Tests unitarios frontend | 10 | Tests de componentes React/Vue |
| Tests de integración | 13 | Tests end-to-end, integración sistema local |
| Testing de performance | 4 | Verificación tiempos de respuesta |

---

### 9. DOCUMENTACIÓN
**Horas: 24 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Manual de usuario | 10 | Guía de uso del COCE |
| Documentación API REST | 6 | Swagger/OpenAPI completo |
| Documentación técnica | 5 | Arquitectura, decisiones técnicas |
| README del proyecto | 3 | Estructura, overview, quick start |

---

### 10. DESPLIEGUE
**Horas: 24 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Configuración servidor | 10 | Setup servidor, base de datos, SSL |
| Scripts de despliegue | 8 | Automatización despliegue |
| Configuración CI/CD | 6 | Pipeline de despliegue continuo |

---

### 11. GESTIÓN DE PROYECTO
**Horas: 24 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Planificación y seguimiento | 10 | Planificación, seguimiento, ajustes |
| Reuniones con cliente | 10 | Reuniones técnicas, validaciones |
| Coordinación con sistema local | 3 | Sincronización con desarrollo sistema local |
| Control de calidad | 1 | Revisiones de código, estándares |

---

## RESUMEN DE HORAS

| Componente | Horas | Porcentaje |
|------------|-------|------------|
| Backend API | 64 | 17.8% |
| Frontend | 64 | 17.8% |
| Testing | 40 | 11.1% |
| Integración Sistema Local | 32 | 8.9% |
| Análisis y Diseño | 32 | 8.9% |
| Base de Datos | 24 | 6.7% |
| Gestión Versiones | 16 | 4.4% |
| Integración App Android | 16 | 4.4% |
| Documentación | 24 | 6.7% |
| Despliegue | 24 | 6.7% |
| Gestión Proyecto | 24 | 6.7% |
| **TOTAL** | **360** | **100%** |

---

## CRONOGRAMA ESTIMADO

### Fase 1: Análisis y Diseño (1.5 semanas)
- Semana 1: Análisis de requisitos y diseño arquitectura
- Semana 2 (parcial): Documento de diseño técnico

### Fase 2: Desarrollo Backend (3.5 semanas)
- Semana 2-3: Backend API y base de datos
- Semana 4-5: Integración con sistema local

### Fase 3: Desarrollo Frontend (3.5 semanas)
- Semana 6-8: Desarrollo frontend completo
- Semana 9: Integración backend-frontend

### Fase 4: Testing y Ajustes (1.5 semanas)
- Semana 10: Tests unitarios y de integración
- Semana 11: Ajustes y correcciones

### Fase 5: Documentación y Despliegue (1.5 semanas)
- Semana 11-12: Documentación completa y despliegue

**Duración Total:** 10-12 semanas (2.5-3 meses) con 1 desarrollador full-stack

---

## DEPENDENCIAS CRÍTICAS

### Endpoints Requeridos en Sistema Local

El COCE necesita estos endpoints que deben estar disponibles en el sistema local:

| Endpoint | Método | Descripción | Estado |
|----------|--------|-------------|--------|
| `/api/connectivity` | GET | Estado PC + Tablet | ⚠️ Requerido |
| `/api/version` | GET | Versión instalada software | ⚠️ Requerido |
| `/api/version/tablet` | GET | Versión app Android | ⚠️ Requerido |
| `/api/restart` | POST | Reinicio remoto software | ⚠️ Requerido |
| `/api/doors/open/{door}` | POST | Apertura remota puertas | ⚠️ Requerido |
| `/ws/status` | WS | WebSocket para estado tiempo real | ⚠️ Requerido |
| `/api/message/receive` | POST | Mensajería (tablet) | ⚠️ Requerido |

**Impacto:** ~96 horas adicionales necesarias en sistema local (no incluidas en este presupuesto)

---

## FUNCIONALIDADES INCLUIDAS (MVP)

### ✅ Incluidas en Fase 1
- ✅ Visualización de estado en tiempo real
- ✅ Control remoto básico (reinicio, cambio de modo)
- ✅ Apertura remota de puertas
- ✅ Autenticación y seguridad básica
- ✅ Logs y auditoría básica
- ✅ Consulta de versiones instaladas
- ✅ Mensajería básica con tablets

### ❌ Diferidas a Fase 2
- ❌ Sistema de actualizaciones remotas completas
- ❌ Mensajería avanzada
- ❌ Reporting avanzado
- ❌ Roles y permisos avanzados
- ❌ Sistema de notificaciones completo

---

## RIESGOS Y CONTINGENCIAS

### Riesgos Identificados

1. **Dependencias del Sistema Local:** Endpoints requeridos no disponibles
   - *Mitigación:* Coordinación temprana, desarrollo paralelo
   - *Contingencia:* +10% horas (36 horas adicionales)

2. **Integración con Sistema Local:** Complejidad de sincronización
   - *Mitigación:* Pruebas tempranas, documentación clara de API
   - *Contingencia:* +5% horas (18 horas adicionales)

3. **WebSockets y Tiempo Real:** Complejidad de implementación
   - *Mitigación:* Uso de librerías probadas, pruebas tempranas
   - *Contingencia:* +3% horas (11 horas adicionales)

### Contingencia Total Recomendada
**+15% sobre horas base:** 54 horas adicionales  
**Total con contingencia:** 414 horas

---

## RESUMEN FINAL

| Concepto | Valor |
|----------|-------|
| **Horas Base de Desarrollo** | 360 horas |
| **Contingencia (15%)** | 54 horas |
| **Total Horas Estimadas** | **414 horas** |
| **Duración con 1 desarrollador** | 10-12 semanas (2.5-3 meses) |

---

## NOTAS IMPORTANTES

1. **Este presupuesto asume:**
   - Disponibilidad de endpoints del sistema local (ver dependencias)
   - Desarrollo en paralelo con sistema local
   - Acceso a especificaciones completas del COCE
   - Coordinación fluida con equipo del sistema local

2. **No incluye:**
   - Desarrollo de endpoints adicionales en sistema local (+96 horas)
   - Sistema de actualizaciones remotas completas (Fase 2)
   - Funcionalidades avanzadas diferidas a Fase 2

3. **Recomendaciones:**
   - Iniciar desarrollo después de que sistema local tenga endpoints básicos
   - Realizar pruebas de integración tempranas
   - Considerar MVP simplificado para validar arquitectura
   - Reservar tiempo de buffer para ajustes post-pruebas

4. **Opción COCE Completo:**
   - Si se requiere COCE completo (con actualizaciones remotas): **576 horas** (14-16 semanas)
   - Diferencia: +216 horas adicionales

---

**Versión:** 1.0  
**Última actualización:** Enero 2026

