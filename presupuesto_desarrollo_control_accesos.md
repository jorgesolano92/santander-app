# PRESUPUESTO DE DESARROLLO
## Sistema de Control de Accesos - Banco Santander

**Fecha de Presupuesto:** Enero 2026  
**Cliente:** SAIMA SEGURIDAD  
**Proyecto:** Lógica de Control Python para Sistema de Control de Accesos

---

## RESUMEN EJECUTIVO

| Concepto | Horas | Observaciones |
|----------|-------|---------------|
| **Total Horas de Desarrollo** | **976 horas** | Incluye desarrollo, testing y documentación |
| **Duración Estimada** | **6 meses** | Con 1 desarrollador full-stack |
| **Tecnologías Principales** | Python 3.9+, FastAPI/Flask, SQLite, Modbus TCP/IP, React/Vue.js |

---

## DESGLOSE DETALLADO POR COMPONENTE

### 1. ANÁLISIS Y DISEÑO TÉCNICO
**Horas: 64 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Análisis de requisitos | 16 | Revisión completa de especificaciones y anexos |
| Diseño de arquitectura | 20 | Diagramas de arquitectura, flujos de datos, diseño de BD |
| Diseño de API REST | 12 | Especificación endpoints, modelos de datos, autenticación |
| Diseño de interfaz web | 10 | Wireframes, mockups, estructura de componentes |
| Documento de diseño técnico | 6 | Redacción y revisión del documento final |

**Entregables:**
- Documento de diseño técnico completo
- Diagramas de arquitectura (C4, flujos)
- Especificación API REST (OpenAPI/Swagger)
- Mockups de interfaz web

---

### 2. DESARROLLO CORE - LÓGICA DE CONTROL
**Horas: 256 horas**

#### 2.1. Servicio Windows y Infraestructura Base
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Configuración proyecto Python | 6 | Estructura, dependencias, entornos virtuales |
| Servicio Windows con auto-inicio | 12 | Implementación como servicio Windows, instalador |
| Sistema de logging y auditoría | 10 | Configuración logs, rotación, niveles |
| Gestión de configuración | 8 | Sistema de configuración (JSON/YAML), validación |
| Persistencia de estado | 8 | Guardado periódico, recuperación ante reinicio |
| Watchdog y recuperación automática | 4 | Monitorización de salud, reinicio automático |

#### 2.2. Comunicación Modbus TCP/IP
**Horas: 64 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Cliente Modbus TCP/IP | 20 | Implementación cliente, manejo de conexiones |
| Gestión de 3 módulos ETD8A12 | 16 | Abstracción por módulo, polling eficiente |
| Manejo de errores y reconexión | 12 | Reintentos, timeouts, manejo de desconexiones |
| Simulador/Mock ETD8A12 | 16 | Simulador para desarrollo sin hardware |

#### 2.3. Lógica de 33 Actuaciones
**Horas: 96 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Implementación actuaciones 1-7 (Modos) | 28 | Lógica de modos operativos con exclusión mutua |
| Implementación actuaciones 8-12 (Emergencias) | 20 | Prioridades, pulsadores verdes, señal incendio |
| Implementación actuaciones 13-22 (Detección) | 24 | Radares, llaves Winhouse, detección automática |
| Implementación actuaciones 23-32 (Control) | 24 | Pulsadores, interfono, llaves emergencia, COCE |

#### 2.4. Gestión de Modos Operativos
**Horas: 32 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Máquina de estados de modos | 16 | Implementación exclusión mutua, transiciones |
| Validación de condiciones | 10 | Enclavamientos, condiciones de seguridad |
| Gestión de temporizaciones | 6 | Pulsos de 5 segundos, retardos configurables |

#### 2.5. Sistema de Horarios y Calendario
**Horas: 32 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Motor de horarios | 16 | Franjas horarias, cambio automático de modo |
| Calendario de festivos | 10 | Gestión festivos nacionales y autonómicos |
| Días especiales | 6 | Pre-festivos, eventos, configuración manual |

---

### 3. BASE DE DATOS Y PERSISTENCIA
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Diseño de esquema SQLite | 10 | Tablas: eventos, configuración, usuarios, histórico |
| Implementación de modelos | 12 | ORM (SQLAlchemy) o acceso directo |
| Sistema de histórico (180 días) | 14 | Almacenamiento, consultas, limpieza automática |
| Migraciones y scripts iniciales | 8 | Scripts de inicialización, migraciones |
| Optimización y índices | 4 | Índices para consultas eficientes |

---

### 4. API REST
**Horas: 92 horas**

#### 4.1. Desarrollo de Endpoints
**Horas: 64 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Framework API (FastAPI/Flask) | 8 | Configuración, middleware, estructura |
| Endpoints de estado | 12 | GET /api/status, /api/doors, /api/modes |
| Endpoints de control | 16 | POST /api/mode, validación, seguridad |
| Endpoints de eventos | 12 | GET /api/events con filtros, paginación |
| Endpoints de configuración | 10 | CRUD horarios, calendario, tiempos |
| Autenticación Basic Auth | 6 | Implementación HTTPS, Basic Auth |

#### 4.2. Documentación y Testing API
**Horas: 28 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Documentación Swagger/OpenAPI | 8 | Especificación completa, ejemplos (sinergia con app Android) |
| Tests de endpoints | 16 | Tests unitarios y de integración API |
| Validación de performance | 4 | Verificación <500ms tiempo respuesta |

---

### 5. INTERFAZ WEB DE CONFIGURACIÓN
**Horas: 160 horas**

#### 5.1. Frontend
**Horas: 112 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Configuración proyecto (React/Vue.js) | 12 | Estructura, build, routing |
| Configuración de horarios | 20 | Formularios, validación, visualización |
| Configuración de calendario | 16 | Calendario interactivo, gestión festivos |
| Ajuste de tiempos | 12 | Formularios retardos, pulsos |
| Visualización histórico | 20 | Tabla con filtros, paginación, exportación CSV |
| Estado en tiempo real | 16 | Dashboard, actualización automática |
| Configuración IPs módulos | 8 | Formulario configuración red |
| Gestión de usuarios | 8 | CRUD usuarios, permisos, autenticación web |

#### 5.2. Backend Web y Integración
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Servidor web estático | 8 | Servir frontend, configuración |
| Endpoints web adicionales | 16 | Endpoints específicos para interfaz web |
| Autenticación web (bcrypt) | 12 | Sistema de usuarios, hash contraseñas |
| Validación y sanitización | 8 | Protección contra inyección, validación inputs |
| Responsive design | 4 | Ajustes para mobile/tablet |

---

### 6. TESTING Y CALIDAD
**Horas: 144 horas**

#### 6.1. Tests Unitarios
**Horas: 64 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests lógica de actuaciones | 28 | Cobertura de las 33 actuaciones |
| Tests modos operativos | 16 | Validación exclusión mutua, transiciones |
| Tests horarios y calendario | 12 | Validación cambios automáticos |
| Tests comunicación Modbus | 8 | Tests con simulador |

#### 6.2. Tests de Integración
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests integración API | 20 | Tests end-to-end de endpoints |
| Tests integración Modbus | 16 | Tests con hardware real o simulador avanzado |
| Tests integración web | 12 | Tests de interfaz web completa |

#### 6.3. Testing de Performance y Carga
**Horas: 20 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests de performance API | 8 | Verificación <500ms, carga |
| Tests de latencia Modbus | 6 | Verificación <300ms activación |
| Tests de recursos sistema | 6 | CPU <20%, RAM <512MB |

#### 6.4. Testing de Disponibilidad
**Horas: 12 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Tests modo autónomo | 6 | Validación sin tablet/red |
| Tests recuperación fallos | 6 | Validación reinicio automático |

---

### 7. DOCUMENTACIÓN
**Horas: 96 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Manual de instalación | 16 | Paso a paso, requisitos, troubleshooting |
| Manual de configuración | 20 | Uso interfaz web, ejemplos |
| Documentación API REST | 12 | Swagger/OpenAPI completo |
| Documentación técnica | 20 | Arquitectura, diagramas, decisiones técnicas |
| Guía de troubleshooting | 12 | Problemas comunes, soluciones |
| Documentación código | 12 | Docstrings, comentarios inline |
| README del proyecto | 4 | Estructura, overview, quick start |

---

### 8. SCRIPTS DE INSTALACIÓN Y DESPLIEGUE
**Horas: 48 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Scripts instalación Python | 12 | Instalación dependencias, configuración |
| Instalador Windows (MSI) | 20 | Creación instalador, servicio Windows |
| Scripts de configuración inicial | 10 | Configuración por defecto, BD inicial |
| Scripts de actualización | 6 | Migraciones, actualizaciones |

---

### 9. GESTIÓN DE PROYECTO Y COORDINACIÓN
**Horas: 68 horas**

| Tarea | Horas | Descripción |
|-------|-------|-------------|
| Planificación y seguimiento | 24 | Planificación, seguimiento, ajustes |
| Reuniones con cliente | 20 | Reuniones técnicas, validaciones |
| Coordinación con app Android | 4 | Sincronización API interna (mismo equipo) |
| Gestión de cambios | 12 | Gestión de cambios de alcance |
| Control de calidad | 8 | Revisiones de código, estándares |

---

## TECNOLOGÍAS Y HERRAMIENTAS

### Backend
- **Lenguaje:** Python 3.9 o superior
- **Framework API:** FastAPI (recomendado) o Flask
- **Base de datos:** SQLite 3
- **ORM (opcional):** SQLAlchemy
- **Comunicación Modbus:** pymodbus o similar
- **Servicio Windows:** pywin32, NSSM (Non-Sucking Service Manager)
- **Autenticación:** bcrypt para hash de contraseñas
- **HTTPS/TLS:** Certificados autofirmados (OpenSSL)

### Frontend
- **Framework:** React (recomendado) o Vue.js
- **Build tool:** Vite o Webpack
- **UI Framework:** Material-UI, Ant Design o Tailwind CSS
- **HTTP Client:** Axios o Fetch API
- **Estado:** Redux/Zustand (React) o Pinia (Vue)

### Testing
- **Unit Testing:** pytest (Python), Jest/Vitest (Frontend)
- **Integration Testing:** pytest, Postman/Newman
- **Mocking:** unittest.mock, pymodbus mock
- **Coverage:** coverage.py, Jest Coverage

### Desarrollo
- **Control de versiones:** Git
- **CI/CD (opcional):** GitHub Actions, GitLab CI
- **Documentación API:** Swagger/OpenAPI 3.0
- **Linting:** pylint, flake8, ESLint
- **Formateo:** black (Python), Prettier (Frontend)

### Despliegue
- **Instalador:** Inno Setup, NSIS o WiX Toolset
- **Empaquetado:** PyInstaller (opcional para ejecutables)

---

## RECURSOS HUMANOS NECESARIOS

### Equipo del Proyecto

| Rol | Cantidad | Perfil | Asignación |
|-----|----------|--------|------------|
| **Desarrollador Full-Stack Senior** | 1 | Python, APIs REST, Modbus, Windows Services, Frontend, Testing | 100% (6 meses) |

**Total Equivalente:** 1.0 FTE (Full-Time Equivalent)

---

## CRONOGRAMA ESTIMADO

### Fase 1: Análisis y Diseño (3 semanas)
- Semana 1-2: Análisis de requisitos y diseño arquitectura
- Semana 3: Documento de diseño técnico

### Fase 2: Desarrollo Core (11 semanas)
- Semana 4-5: Infraestructura base y servicio Windows
- Semana 6-8: Comunicación Modbus TCP/IP
- Semana 9-12: Lógica de 33 actuaciones
- Semana 13-14: Gestión de modos operativos y horarios

### Fase 3: Base de Datos y API (4 semanas)
- Semana 15-16: Base de datos SQLite
- Semana 17-18: API REST completa

### Fase 4: Interfaz Web (5 semanas)
- Semana 19-21: Desarrollo frontend
- Semana 22-23: Integración backend-frontend

### Fase 5: Testing (4 semanas)
- Semana 24-25: Tests unitarios
- Semana 26-27: Tests de integración y performance

### Fase 6: Documentación y Despliegue (2 semanas)
- Semana 28-29: Documentación completa y scripts de instalación

**Duración Total:** 24 semanas (6 meses) con 1 desarrollador full-stack

---

## RIESGOS Y CONTINGENCIAS

### Riesgos Técnicos Identificados
1. **Complejidad de las 33 actuaciones:** Lógica compleja con múltiples condiciones
   - *Mitigación:* Análisis detallado previo, prototipado de actuaciones críticas
   - *Contingencia:* +10% horas (98 horas adicionales)

2. **Comunicación Modbus TCP/IP:** Posibles problemas de latencia o estabilidad
   - *Mitigación:* Simulador robusto, pruebas tempranas con hardware
   - *Contingencia:* +5% horas (49 horas adicionales)

3. **Integración con app Android:** Sincronización de API y pruebas
   - *Mitigación:* Mismo equipo desarrolla ambos lados (menor riesgo)
   - *Contingencia:* +2% horas (20 horas adicionales)

4. **Servicio Windows:** Complejidad de instalación y gestión como servicio
   - *Mitigación:* Uso de herramientas probadas (NSSM), pruebas tempranas
   - *Contingencia:* +3% horas (29 horas adicionales)

**Nota:** La contingencia total del 15% (146 horas) es menor que la suma individual debido a que algunos riesgos se compensan entre sí.

### Contingencia Total Recomendada
**+15% sobre horas base:** 146 horas adicionales  
**Total con contingencia:** 1,122 horas

---

## RESUMEN FINAL

| Concepto | Valor |
|----------|-------|
| **Horas Base de Desarrollo** | 976 horas |
| **Contingencia (15%)** | 146 horas |
| **Total Horas Estimadas** | **1,122 horas** |
| **Duración con 1 desarrollador** | 6 meses |

### Distribución por Categoría

| Categoría | Horas | Porcentaje |
|----------|-------|------------|
| Desarrollo Core | 256 | 22.7% |
| Interfaz Web | 160 | 14.2% |
| API REST | 92 | 8.2% |
| Testing | 144 | 12.8% |
| Base de Datos | 48 | 4.3% |
| Documentación | 96 | 8.5% |
| Análisis y Diseño | 64 | 5.7% |
| Instalación/Despliegue | 48 | 4.3% |
| Gestión Proyecto | 68 | 6.1% |
| Contingencia | 146 | 13.0% |
| **TOTAL** | **1,122** | **100%** |

---

## NOTAS IMPORTANTES

1. **Este presupuesto asume:**
   - Disponibilidad de documentación completa de módulos ETD8A12
   - Acceso a hardware para pruebas en fase final
   - Especificación detallada de las 33 actuaciones (Anexo A)
   - **Desarrollo de app Android por el mismo equipo** (sinergias y coordinación interna)

2. **No incluye:**
   - Desarrollo de app Android (proyecto paralelo, mismo equipo)
   - Integración con sistema COCE (fase 2)
   - Instalación física en oficina
   - Formación presencial

3. **Ventajas del mismo equipo:**
   - Coordinación API más fluida (mismo equipo desarrolla ambos lados)
   - Sinergias en diseño de API (menos iteraciones)
   - Pruebas de integración más ágiles
   - Documentación API optimizada para uso interno

4. **Recomendaciones:**
   - Iniciar con prototipo de 2-3 actuaciones críticas para validar arquitectura
   - Realizar pruebas de integración con hardware lo antes posible
   - Desarrollar API y app Android en paralelo aprovechando sinergias
   - Reservar tiempo de buffer para ajustes post-pruebas piloto

