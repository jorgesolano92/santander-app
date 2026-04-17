# PRESUPUESTO MVP POR FASES
## Sistema de Control de Accesos - Banco Santander
## Enfoque: Producto Mínimo Viable Extensible

**Fecha de Presupuesto:** Enero 2026  
**Cliente:** SAIMA SEGURIDAD  
**Estrategia:** Desarrollo incremental con MVP funcional y extensible

---

## RESUMEN EJECUTIVO

| Concepto | Horas MVP | Horas Fase 2 | Horas Fase 3 | Total |
|----------|-----------|--------------|--------------|-------|
| **MVP (Fase 1)** | **368 horas** | - | - | 368 |
| **Fase 2 - Extensión** | - | **312 horas** | - | 312 |
| **Fase 3 - Completitud** | - | - | **296 horas** | 296 |
| **TOTAL** | **368** | **312** | **296** | **976 horas** |

| Concepto | Duración MVP | Duración Fase 2 | Duración Fase 3 | Total |
|----------|--------------|----------------|----------------|-------|
| **MVP (Fase 1)** | **2.5 meses** | - | - | 2.5 meses |
| **Fase 2 - Extensión** | - | **2 meses** | - | 2 meses |
| **Fase 3 - Completitud** | - | - | **2 meses** | 2 meses |
| **TOTAL** | **2.5 meses** | **2 meses** | **2 meses** | **6.5 meses** |

**Reducción de inversión inicial: 62%** (368h vs 976h)

---

## FILOSOFÍA DEL MVP

### ✅ Qué INCLUYE el MVP (Funcionalidad Básica Completa)

1. **Control de Puertas Funcional**
   - Apertura/cierre de puertas mediante relés
   - Control básico de 2 puertas (Calle y Oficina)
   - Temporizaciones configurables (pulsos de 5 segundos)

2. **7 Modos Operativos**
   - Implementación completa de los 7 modos
   - Exclusión mutua entre modos
   - Cambio de modo manual vía API

3. **API REST Completa y Funcional**
   - Endpoints de estado (puertas, modos, relés)
   - Endpoints de control (cambio de modo)
   - Autenticación Basic Auth sobre HTTPS
   - Documentación Swagger básica

4. **Comunicación Modbus TCP/IP**
   - Cliente Modbus funcional
   - Comunicación con 3 módulos ETD8A12
   - Lectura de entradas y escritura de salidas
   - Manejo básico de errores y reconexión

5. **Visualización de Estado**
   - Interfaz web básica (HTML/CSS/JS simple)
   - Visualización de relés activados/desactivados
   - Estado de puertas (abierta/cerrada)
   - Modo operativo actual
   - Estado de entradas digitales

6. **Infraestructura Base**
   - Servicio Windows funcional
   - Sistema de logging básico
   - Persistencia de estado
   - Configuración básica (JSON)

### ❌ Qué NO INCLUYE el MVP (Para Fases Posteriores)

1. **Lógica Completa de 33 Actuaciones**
   - MVP: Solo actuaciones básicas (modos + emergencias críticas)
   - Fase 2: Resto de actuaciones

2. **Sistema de Horarios Automático**
   - MVP: Cambio manual de modo
   - Fase 2: Cambio automático por horarios

3. **Calendario y Festivos**
   - MVP: No incluido
   - Fase 2: Sistema completo de calendario

4. **Histórico Completo (180 días)**
   - MVP: Logs básicos y eventos recientes (7 días)
   - Fase 2: Histórico completo con exportación CSV

5. **Interfaz Web Avanzada**
   - MVP: Interfaz básica de visualización
   - Fase 2: Interfaz completa de configuración

6. **Todas las Actuaciones Complejas**
   - MVP: Actuaciones esenciales (modos, emergencias, apertura básica)
   - Fase 2-3: Resto de actuaciones (radares, interfono, COCE, etc.)

---

## FASE 1: MVP - PRODUCTO MÍNIMO VIABLE
**Horas: 368 horas | Duración: 2.5 meses**

### Objetivo
Sistema completamente funcional para control básico de puertas, modos operativos y visualización de estado, con API REST operativa.

---

### 1. ANÁLISIS Y DISEÑO TÉCNICO (Reducido)
**Horas: 40 horas** (vs 64 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Análisis de requisitos MVP | 10 | Enfoque en funcionalidades esenciales |
| Diseño de arquitectura MVP | 16 | Arquitectura extensible, diseño base |
| Diseño de API REST | 10 | Endpoints esenciales, estructura extensible |
| Diseño interfaz web básica | 4 | Wireframe simple, estructura básica |

**Reducción:** -24 horas (diseño simplificado, sin mockups complejos)

---

### 2. DESARROLLO CORE - LÓGICA BÁSICA
**Horas: 152 horas** (vs 256 originales)

#### 2.1. Servicio Windows y Infraestructura Base
**Horas: 36 horas** (vs 48 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Configuración proyecto Python | 6 | Estructura, dependencias, entornos |
| Servicio Windows básico | 10 | Servicio funcional, auto-inicio |
| Sistema de logging básico | 8 | Logs configurables, rotación básica |
| Gestión de configuración | 6 | Configuración JSON, validación básica |
| Persistencia de estado | 6 | Guardado periódico, recuperación |

**Reducción:** -12 horas (watchdog simplificado, menos complejidad)

#### 2.2. Comunicación Modbus TCP/IP
**Horas: 48 horas** (vs 64 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Cliente Modbus TCP/IP | 16 | Implementación cliente funcional |
| Gestión de 3 módulos ETD8A12 | 14 | Abstracción por módulo, polling |
| Manejo de errores y reconexión | 10 | Reintentos, timeouts básicos |
| Simulador/Mock ETD8A12 | 8 | Simulador básico para desarrollo |

**Reducción:** -16 horas (simulador simplificado, menos optimizaciones)

#### 2.3. Lógica de Actuaciones Básicas (MVP)
**Horas: 48 horas** (vs 96 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Implementación modos 1-7 | 20 | 7 modos operativos con exclusión mutua |
| Actuación 8: Señal incendio | 8 | Prioridad máxima, apertura emergencia |
| Actuaciones 9-12: Emergencias básicas | 12 | Pulsadores verdes, prioridad alta |
| Apertura básica de puertas | 8 | Control directo de relés, temporizaciones |

**Reducción:** -48 horas (solo actuaciones esenciales, sin radares, interfono, COCE, etc.)

#### 2.4. Gestión de Modos Operativos
**Horas: 20 horas** (vs 32 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Máquina de estados de modos | 12 | Exclusión mutua, transiciones |
| Validación de condiciones básicas | 6 | Enclavamientos esenciales |
| Gestión de temporizaciones | 2 | Pulsos configurables (5 segundos default) |

**Reducción:** -12 horas (validaciones simplificadas, sin todas las condiciones complejas)

#### 2.5. Sistema de Horarios (NO incluido en MVP)
**Horas: 0 horas** (vs 32 originales)

**Diferido a Fase 2**

---

### 3. BASE DE DATOS Y PERSISTENCIA (Simplificada)
**Horas: 24 horas** (vs 48 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Diseño de esquema SQLite básico | 6 | Tablas: eventos recientes, configuración |
| Implementación de modelos básicos | 8 | ORM básico, acceso directo |
| Sistema de eventos recientes (7 días) | 8 | Almacenamiento básico, consultas simples |
| Scripts iniciales | 2 | Scripts de inicialización básicos |

**Reducción:** -24 horas (sin histórico completo, sin migraciones complejas, sin optimizaciones avanzadas)

---

### 4. API REST (Completa pero Básica)
**Horas: 56 horas** (vs 92 originales)

#### 4.1. Desarrollo de Endpoints Esenciales
**Horas: 40 horas** (vs 64 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Framework API (FastAPI) | 6 | Configuración básica, estructura |
| Endpoints de estado | 10 | GET /api/status, /api/doors, /api/modes, /api/relays |
| Endpoints de control | 12 | POST /api/mode, validación básica |
| Endpoints de eventos recientes | 8 | GET /api/events (últimos 7 días) |
| Autenticación Basic Auth | 4 | HTTPS, Basic Auth básico |

**Reducción:** -24 horas (sin endpoints de configuración complejos, sin paginación avanzada)

#### 4.2. Documentación y Testing API
**Horas: 16 horas** (vs 28 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Documentación Swagger básica | 6 | Especificación esencial, ejemplos básicos |
| Tests de endpoints básicos | 8 | Tests unitarios esenciales |
| Validación de performance básica | 2 | Verificación <500ms básica |

**Reducción:** -12 horas (documentación simplificada, menos tests)

---

### 5. INTERFAZ WEB BÁSICA (No Responsive)
**Horas: 48 horas** (vs 160 originales)

#### 5.1. Frontend Básico
**Horas: 32 horas** (vs 112 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Interfaz web básica (HTML/CSS/JS) | 12 | HTML simple, CSS básico, JavaScript vanilla |
| Visualización de estado | 10 | Dashboard básico: puertas, modos, relés |
| Visualización de relés | 6 | Tabla/matriz de relés activados/desactivados |
| Actualización automática | 4 | Polling básico cada 2-3 segundos |

**Reducción:** -80 horas (sin framework React/Vue, sin responsive, sin formularios complejos)

#### 5.2. Backend Web Básico
**Horas: 16 horas** (vs 48 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Servidor web estático básico | 6 | Servir HTML/CSS/JS, configuración básica |
| Endpoints web para datos | 8 | Endpoints JSON para estado en tiempo real |
| Autenticación web básica | 2 | Autenticación simple (sin bcrypt complejo) |

**Reducción:** -32 horas (sin gestión de usuarios compleja, sin validaciones avanzadas)

---

### 6. TESTING Y CALIDAD (Básico)
**Horas: 32 horas** (vs 144 originales)

#### 6.1. Tests Básicos
**Horas: 20 horas** (vs 64 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests lógica básica | 12 | Tests de modos, actuaciones básicas |
| Tests comunicación Modbus | 8 | Tests con simulador básico |

**Reducción:** -44 horas (sin tests exhaustivos, sin cobertura completa)

#### 6.2. Tests de Integración Básicos
**Horas: 12 horas** (vs 48 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests integración API básicos | 8 | Tests end-to-end esenciales |
| Tests integración Modbus básicos | 4 | Tests con simulador |

**Reducción:** -36 horas (sin tests exhaustivos de integración)

**Nota:** Sin tests de performance ni disponibilidad en MVP (Fase 2-3)

---

### 7. DOCUMENTACIÓN (Básica)
**Horas: 24 horas** (vs 96 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Manual de instalación básico | 6 | Instalación paso a paso esencial |
| Documentación API REST | 6 | Swagger básico |
| Documentación técnica básica | 8 | Arquitectura, diagramas básicos |
| README del proyecto | 4 | Estructura, overview, quick start |

**Reducción:** -72 horas (sin manuales completos, sin guías avanzadas)

---

### 8. SCRIPTS DE INSTALACIÓN (Básicos)
**Horas: 20 horas** (vs 48 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Scripts instalación Python | 6 | Instalación dependencias básicas |
| Instalador Windows básico | 10 | Instalador funcional, servicio Windows |
| Scripts configuración inicial | 4 | Configuración por defecto básica |

**Reducción:** -28 horas (sin scripts avanzados, sin migraciones)

---

### 9. GESTIÓN DE PROYECTO (Reducida)
**Horas: 32 horas** (vs 68 originales)

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Planificación y seguimiento | 16 | Planificación MVP, seguimiento |
| Reuniones con cliente | 12 | Reuniones técnicas, validaciones |
| Gestión de cambios básica | 4 | Gestión cambios esencial |

**Reducción:** -36 horas (menos reuniones, menos gestión de cambios complejos)

---

## RESUMEN FASE 1: MVP

| Categoría | Horas MVP | Horas Original | Reducción |
|-----------|-----------|---------------|-----------|
| Análisis y Diseño | 40 | 64 | -24 |
| Desarrollo Core | 152 | 256 | -104 |
| Base de Datos | 24 | 48 | -24 |
| API REST | 56 | 92 | -36 |
| Interfaz Web | 48 | 160 | -112 |
| Testing | 32 | 144 | -112 |
| Documentación | 24 | 96 | -72 |
| Instalación | 20 | 48 | -28 |
| Gestión Proyecto | 32 | 68 | -36 |
| **TOTAL** | **368** | **976** | **-608 (-62%)** |

---

## FASE 2: EXTENSIÓN Y FUNCIONALIDADES AVANZADAS
**Horas: 312 horas | Duración: 2 meses**

### Objetivo
Extender el MVP con funcionalidades avanzadas: horarios automáticos, calendario, histórico completo, y más actuaciones.

---

### 1. Sistema de Horarios y Calendario
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Motor de horarios | 20 | Franjas horarias, cambio automático de modo |
| Calendario de festivos | 16 | Gestión festivos nacionales y autonómicos |
| Días especiales | 8 | Pre-festivos, eventos, configuración manual |
| Integración con modos | 4 | Integración horarios con sistema de modos |

---

### 2. Lógica de Actuaciones Avanzadas
**Horas: 96 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Actuaciones 13-14: Llaves Winhouse | 16 | Cierres mecánicos por llave Winhouse |
| Actuaciones 15-22: Detección radares | 32 | Radares en modos Automático y Esclusa |
| Actuaciones 23-24: Pulsadores emergencia | 12 | Pulsadores de emergencia puerta |
| Actuaciones 25-28: Control interfono | 20 | Control por interfono completo |
| Actuaciones 29-30: Llaves emergencia | 8 | Llaves de emergencia |
| Actuaciones 31-32: COCE (preparación) | 8 | Preparación para apertura remota COCE |

---

### 3. Base de Datos - Histórico Completo
**Horas: 24 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Extensión esquema histórico | 8 | Tablas para 180 días |
| Sistema de limpieza automática | 8 | Limpieza automática de datos antiguos |
| Optimización y índices | 8 | Índices para consultas eficientes |

---

### 4. API REST - Endpoints Avanzados
**Horas: 32 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Endpoints de configuración | 16 | CRUD horarios, calendario, tiempos |
| Endpoints de eventos avanzados | 12 | Filtros avanzados, paginación |
| Documentación Swagger completa | 4 | Especificación completa |

---

### 5. Interfaz Web - Configuración
**Horas: 64 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Configuración de horarios | 16 | Formularios, validación, visualización |
| Configuración de calendario | 12 | Calendario interactivo, gestión festivos |
| Ajuste de tiempos | 8 | Formularios retardos, pulsos |
| Visualización histórico completo | 16 | Tabla con filtros, paginación, exportación CSV |
| Configuración IPs módulos | 6 | Formulario configuración red |
| Gestión de usuarios | 6 | CRUD usuarios, permisos, autenticación web |

---

### 6. Testing Avanzado
**Horas: 32 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests actuaciones avanzadas | 16 | Cobertura actuaciones nuevas |
| Tests horarios y calendario | 8 | Validación cambios automáticos |
| Tests integración completos | 8 | Tests end-to-end completos |

---

### 7. Documentación Completa
**Horas: 16 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Manual de configuración | 12 | Uso interfaz web, ejemplos |
| Guía de troubleshooting | 4 | Problemas comunes, soluciones |

---

## FASE 3: COMPLETITUD Y OPTIMIZACIÓN
**Horas: 296 horas | Duración: 2 meses**

### Objetivo
Completar todas las funcionalidades restantes, optimización, testing exhaustivo y documentación final.

---

### 1. Actuaciones Restantes y COCE
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Actuaciones 31-32: COCE completo | 24 | Integración completa con sistema COCE |
| Validación todas las actuaciones | 16 | Validación completa de las 33 actuaciones |
| Optimización lógica | 8 | Optimización de rendimiento |

---

### 2. Testing Exhaustivo
**Horas: 80 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests unitarios completos | 32 | Cobertura completa de las 33 actuaciones |
| Tests modos operativos completos | 16 | Validación exclusión mutua, transiciones |
| Tests integración completos | 20 | Tests end-to-end completos |
| Tests de performance | 8 | Verificación <500ms API, <300ms Modbus |
| Tests de disponibilidad | 4 | Validación modo autónomo, recuperación |

---

### 3. Optimización y Performance
**Horas: 32 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Optimización comunicación Modbus | 12 | Optimización polling, latencia |
| Optimización base de datos | 8 | Consultas optimizadas, índices |
| Optimización API | 8 | Optimización tiempo respuesta |
| Tests de recursos sistema | 4 | CPU <20%, RAM <512MB |

---

### 4. Documentación Final
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Manual de instalación completo | 8 | Paso a paso, requisitos, troubleshooting |
| Manual de configuración completo | 12 | Uso interfaz web, ejemplos completos |
| Documentación técnica completa | 16 | Arquitectura, diagramas, decisiones técnicas |
| Guía de troubleshooting completa | 8 | Problemas comunes, soluciones |
| Documentación código | 4 | Docstrings, comentarios inline |

---

### 5. Scripts de Instalación Avanzados
**Horas: 28 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Instalador Windows completo (MSI) | 16 | Instalador profesional, servicio Windows |
| Scripts de configuración avanzados | 8 | Configuración por defecto, validaciones |
| Scripts de actualización | 4 | Migraciones, actualizaciones |

---

### 6. Gestión de Proyecto Final
**Horas: 60 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Planificación y seguimiento | 24 | Planificación, seguimiento, ajustes |
| Reuniones con cliente | 20 | Reuniones técnicas, validaciones |
| Coordinación con app Android | 4 | Sincronización API |
| Gestión de cambios | 8 | Gestión cambios de alcance |
| Control de calidad | 4 | Revisiones de código, estándares |

---

## COMPARATIVA: MVP vs PROYECTO COMPLETO

| Aspecto | MVP (Fase 1) | Proyecto Completo | Diferencia |
|---------|--------------|-------------------|------------|
| **Horas** | 368 horas | 976 horas | -62% |
| **Duración** | 2.5 meses | 6 meses | -58% |
| **Modos Operativos** | ✅ 7 modos completos | ✅ 7 modos completos | Igual |
| **Actuaciones** | 12 básicas | 33 completas | -64% |
| **API REST** | ✅ Completa básica | ✅ Completa avanzada | Básica vs Avanzada |
| **Interfaz Web** | Básica (visualización) | Completa (configuración) | Básica vs Completa |
| **Horarios Automáticos** | ❌ Manual | ✅ Automático | Diferido |
| **Calendario** | ❌ No | ✅ Sí | Diferido |
| **Histórico** | 7 días | 180 días | Reducido |
| **Testing** | Básico | Exhaustivo | Básico vs Completo |
| **Documentación** | Básica | Completa | Básica vs Completa |

---

## VENTAJAS DEL ENFOQUE POR FASES

### Para el Cliente
1. ✅ **Reducción de inversión inicial**: 62% menos horas (368h vs 976h)
2. ✅ **Time to Market más rápido**: 2.5 meses vs 6 meses
3. ✅ **Validación temprana**: Sistema funcional en 2.5 meses
4. ✅ **Flexibilidad**: Decidir continuar según resultados del MVP
5. ✅ **Riesgo reducido**: Inversión incremental

### Para el Desarrollo
1. ✅ **Arquitectura extensible**: Diseñada para crecer
2. ✅ **Validación temprana**: Feedback del cliente antes de completar todo
3. ✅ **Priorización**: Enfoque en funcionalidades críticas primero
4. ✅ **Mejor calidad**: Testing más enfocado en cada fase

---

## FUNCIONALIDADES DEL MVP (Detalle)

### ✅ Control de Puertas
- Apertura/cierre de puerta Calle
- Apertura/cierre de puerta Oficina
- Temporizaciones configurables (pulsos de 5 segundos)
- Control de relés directamente

### ✅ 7 Modos Operativos
- AUTOMÁTICO
- ESCLUSA
- EXTENDIDO
- AUTOSERVICIO
- CERRADO
- CARGA CAJERO
- MANUAL
- Exclusión mutua entre modos
- Cambio de modo vía API

### ✅ Actuaciones Básicas (12 de 33)
1. Actuaciones 1-7: Modos operativos ✅
2. Actuación 8: Señal de incendio ✅
3. Actuaciones 9-12: Pulsadores verdes ✅
- Resto de actuaciones: Fase 2-3

### ✅ API REST Completa
- `GET /api/status` - Estado general
- `GET /api/doors` - Estado puertas
- `GET /api/modes` - Modos disponibles y activo
- `GET /api/relays` - Estado de todos los relés
- `POST /api/mode` - Cambiar modo
- `GET /api/events` - Eventos recientes (7 días)
- Autenticación Basic Auth sobre HTTPS
- Documentación Swagger básica

### ✅ Interfaz Web Básica
- Dashboard de estado en tiempo real
- Visualización de puertas (abierta/cerrada)
- Visualización de modo operativo actual
- **Visualización de relés activados/desactivados** (matriz o tabla)
- Visualización de entradas digitales
- Actualización automática (polling cada 2-3 segundos)
- Interfaz HTML/CSS/JS simple (no responsive, desktop)

### ✅ Comunicación Modbus
- Cliente Modbus TCP/IP funcional
- Comunicación con 3 módulos ETD8A12
- Lectura de 36 entradas digitales
- Escritura de 36 salidas (relés)
- Manejo básico de errores y reconexión

### ✅ Infraestructura
- Servicio Windows funcional
- Auto-inicio del servicio
- Sistema de logging básico
- Persistencia de estado
- Recuperación ante reinicio
- Configuración básica (JSON)

---

## RIESGOS Y CONTINGENCIAS POR FASE

### Fase 1 (MVP)
- **Riesgo**: Complejidad de comunicación Modbus
  - *Contingencia*: +5% (18 horas)
- **Riesgo**: Integración con hardware real
  - *Contingencia*: +3% (11 horas)

**Contingencia Fase 1: +8% (29 horas)**  
**Total Fase 1 con contingencia: 397 horas**

### Fase 2
- **Riesgo**: Complejidad de horarios y calendario
  - *Contingencia*: +5% (16 horas)
- **Riesgo**: Actuaciones avanzadas más complejas
  - *Contingencia*: +5% (16 horas)

**Contingencia Fase 2: +10% (32 horas)**  
**Total Fase 2 con contingencia: 344 horas**

### Fase 3
- **Riesgo**: Integración COCE
  - *Contingencia*: +3% (9 horas)
- **Riesgo**: Testing exhaustivo
  - *Contingencia*: +5% (15 horas)

**Contingencia Fase 3: +8% (24 horas)**  
**Total Fase 3 con contingencia: 320 horas**

---

## RESUMEN FINAL POR FASES

| Fase | Horas Base | Contingencia | Total | Duración |
|------|------------|--------------|-------|----------|
| **Fase 1: MVP** | 368 | +29 (8%) | **397 horas** | **2.5 meses** |
| **Fase 2: Extensión** | 312 | +32 (10%) | **344 horas** | **2 meses** |
| **Fase 3: Completitud** | 296 | +24 (8%) | **320 horas** | **2 meses** |
| **TOTAL** | **976** | **+85 (9%)** | **1,061 horas** | **6.5 meses** |

---

## RECOMENDACIONES

1. **Iniciar con MVP**: Validar funcionalidad básica antes de invertir en extensiones
2. **Arquitectura extensible**: Diseñar desde el inicio para crecer
3. **Feedback temprano**: Obtener feedback del cliente tras MVP
4. **Priorización**: Decidir qué funcionalidades de Fase 2-3 son más críticas
5. **Testing incremental**: Aumentar cobertura de testing en cada fase

---

## CONCLUSIÓN

El **MVP permite reducir la inversión inicial en un 62%** (368h vs 976h) mientras se entrega un **sistema completamente funcional** para los requerimientos básicos:

✅ Control de puertas  
✅ 7 modos operativos  
✅ API REST completa  
✅ Visualización de estado y relés  
✅ Interfaz web básica  

El sistema es **extensible** y permite agregar funcionalidades avanzadas en fases posteriores según necesidades y presupuesto.


