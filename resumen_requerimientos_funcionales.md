# RESUMEN DE REQUERIMIENTOS FUNCIONALES
## Sistema de Control de Accesos - Banco Santander

---

## 1. MODOS OPERATIVOS (7 modos con exclusión mutua)

El sistema debe gestionar **7 modos operativos** donde solo uno puede estar activo a la vez:

| # | Modo | Características Principales |
|---|------|----------------------------|
| 1 | **AUTOMÁTICO** | Apertura automática por detección de radares. ICR2 y llave Winhouse desactivados. No funciona con alarma conectada (prevención aperturas en festivos). |
| 2 | **ESCLUSA** | Apertura secuencial controlada (una puerta a la vez). ICR1 y llave Winhouse desactivados. Evita cruce de personas. |
| 3 | **EXTENDIDO** | Horario extendido fuera del comercial normal. Todas las funciones operativas. |
| 4 | **AUTOSERVICIO** | Cajeros automáticos operativos. Cierres de seguridad en puerta oficina (si está cerrada). |
| 5 | **CERRADO** | Instalación cerrada. Cierres de seguridad en ambas puertas (si están cerradas). Solo emergencias activas. |
| 6 | **CARGA CAJERO** | Recarga de cajeros. Cierres en puerta calle (si está cerrada). Emergencias anuladas temporalmente. Bloqueo puerta oficina. |
| 7 | **MANUAL** | Control totalmente manual. Cierres en ambas puertas (si están cerradas). Operación exclusivamente por pulsadores. |

---

## 2. ACTUACIONES DEL SISTEMA (33 actuaciones complejas)

El sistema debe implementar **33 actuaciones** que incluyen:

### 2.1. Tipos de Actuaciones
- **Actuaciones 1-7:** Modos operativos con enclavamiento mutuo
- **Actuación 8:** Señal de incendio (prioridad máxima)
- **Actuaciones 9-12:** Pulsadores de emergencia verde
- **Actuaciones 13-14:** Cierres mecánicos por llave Winhouse
- **Actuaciones 15-22:** Detección de radares en modos Automático y Esclusa
- **Actuaciones 23-24:** Pulsadores de emergencia puerta
- **Actuaciones 25-28:** Control por interfono
- **Actuaciones 29-30:** Llaves de emergencia
- **Actuaciones 31-32:** Apertura remota desde COCE

### 2.2. Características de las Actuaciones
- **Enclavamientos:** Exclusión mutua entre modos y condiciones de seguridad
- **Temporizaciones:** Pulsos de 5 segundos para aperturas, retardos configurables
- **Condiciones complejas:** Activación de cierres solo con puerta cerrada
- **Prioridades:** Emergencias (incendio, pulsadores verdes) con máxima prioridad
- **Lógica de esclusa:** Control secuencial con detección de ocupación de zaguán

---

## 3. GESTIÓN DE HORARIOS Y CALENDARIO

### 3.1. Cambio Automático de Modo
- Cambio automático de modo según franjas horarias configurables
- Zona horaria: CET/CEST (hora peninsular española)

### 3.2. Calendario
- Calendario de festivos bancarios (nacional y autonómico)
- Gestión de días especiales (pre-festivos, eventos)
- Sincronización opcional con calendario externo (fase 2)

---

## 4. HISTÓRICO Y AUDITORÍA

### 4.1. Registro de Eventos
- Registro de todos los eventos del sistema con timestamp
- Retención: **180 días** en base de datos local SQLite
- Eventos registrados:
  - Cambios de modo
  - Aperturas de puertas
  - Alarmas y fallos
  - Accesos y accesos denegados
  - Acciones de usuario en interfaz web

### 4.2. Funcionalidades de Auditoría
- Auditoría de acciones de usuario en interfaz web
- Exportación de histórico en formato CSV
- Consulta filtrable de eventos históricos

---

## 5. COMUNICACIÓN CON HARDWARE

### 5.1. Módulos ETD8A12
- Comunicación Modbus TCP/IP con **3 módulos ETD8A12**
- **Módulo 1 (Central):** 12 entradas de señalización + 12 salidas de control general
- **Módulo 2 (Puerta Calle):** 12 entradas de sensores + 12 salidas de motorización
- **Módulo 3 (Puerta Oficina):** 12 entradas de sensores + 12 salidas de motorización

### 5.2. Características de Comunicación
- Protocolo: Modbus TCP/IP
- IPs estáticas
- Latencia: <300ms desde recepción de entrada
- Ciclo de polling: <100ms (lectura de 36 entradas)
- Manejo de errores y reconexión automática

---

## 6. API REST

### 6.1. Endpoints de Estado
- `GET /api/status` - Estado general del sistema
- `GET /api/doors` - Estado de las puertas
- `GET /api/modes` - Modos operativos disponibles y activo

### 6.2. Endpoints de Control
- `POST /api/mode` - Cambiar modo operativo

### 6.3. Endpoints de Eventos
- `GET /api/events` - Histórico de eventos (filtrable)

### 6.4. Endpoints de Configuración
- Endpoints para configuración de horarios
- Endpoints para gestión de calendario

### 6.5. Características Técnicas
- Protocolo: **HTTPS** con autenticación **Basic Auth**
- Tiempo de respuesta: **<500ms** (percentil 95)
- Documentación: **Swagger/OpenAPI 3.0** completa

---

## 7. INTERFAZ WEB DE CONFIGURACIÓN

### 7.1. Configuración de Horarios
- Configuración de horarios comerciales
- Configuración de horarios extendidos
- Configuración de horarios por modo operativo

### 7.2. Configuración de Calendario
- Gestión de festivos bancarios (nacional y autonómico)
- Gestión de días especiales (pre-festivos, eventos)
- Calendario interactivo

### 7.3. Ajuste de Tiempos
- Configuración de retardos
- Configuración de pulsos (duración de aperturas)
- Temporizaciones configurables

### 7.4. Visualización y Monitorización
- Visualización de histórico de eventos con filtros
- Visualización de estado actual del sistema en tiempo real
- Dashboard con información del sistema
- Exportación de histórico en CSV

### 7.5. Configuración del Sistema
- Configuración de IPs de los módulos ETD8A12
- Gestión de usuarios y permisos de acceso
- Autenticación web con hash de contraseñas (bcrypt)

### 7.6. Características de la Interfaz
- Interfaz web **responsive** (desktop, tablet, móvil)*
- Idioma: **Español**
- Validación de formularios con mensajes claros
- Ayuda contextual en configuración avanzada*
- Confirmaciones para acciones críticas

---

## 8. FUNCIONALIDADES DEL SERVICIO

### 8.1. Servicio Windows
- Ejecución como servicio Windows con auto-inicio
- Recuperación automática ante fallos (<30 segundos)
- Watchdog para monitorización continua de salud

### 8.2. Persistencia y Recuperación
- Guardado periódico del estado del sistema (cada 60 segundos)
- Restauración del último estado válido al reiniciar
- Verificación de integridad del sistema

### 8.3. Modo Autónomo
- Funcionamiento sin tablet/red corporativa
- Continúa en último modo configurado
- Planificación horaria local sigue funcionando
- Sistema totalmente operativo en modo degradado

---

## 9. SISTEMA DE LOGS Y AUDITORÍA

### 9.1. Logging
- Sistema de logs configurable
- Rotación de logs
- Niveles de log configurables
- Registro de todos los eventos críticos

### 9.2. Auditoría
- Registro de cambios de configuración
- Registro de accesos a la interfaz web
- Registro de cambios de modo operativo
- Trazabilidad completa de acciones

---

## 10. INTEGRACIONES

### 10.1. Integración con Tablet Android (Alcance Actual)
- API REST completa para comunicación con tablet
- Endpoints documentados en Swagger/OpenAPI
- Sincronización de estado en tiempo real

### 10.2. Preparación para Integración Futura (Fase 2)
- Arquitectura preparada para integración con sistema COCE
- Estructura de datos compatible con envío de eventos
- Preparación para recepción de comandos remotos

---

## 11. ENTRADAS Y SALIDAS DIGITALES

### 11.1. Distribución de Entradas (36 entradas totales)

**Módulo 1 - Central:**
- IN1: Horario Automático
- IN2: Horario Esclusa
- IN3: Horario Extendido
- IN4: Horario Autoservicio
- IN5: Horario Cerrado
- IN6: Horario Carga Cajero
- IN7: Horario Manual
- IN8: Apertura Remota COCE Oficina
- IN9: Incendio
- IN10: Alarma Conectada
- IN11: Presencia Zaguán
- IN12: Apertura Remota Calle

**Módulo 2 - Puerta Calle:**
- IN1: Radar Interior
- IN2: Radar Exterior
- IN3: Inductivo (Llave Echada)
- IN4: Inductivo (Puerta Abierta/Cerrada)
- IN5: Pulsador Emergencia Puerta
- IN6: Pulsador Verde (Paralelo EMICOM)
- IN7: Llamada Interior
- IN8: Llamada Exterior
- IN9: Bloqueo Zaguán (Libre)
- IN10: Presencia Zaguán
- IN11: ICR 2 (Libre)
- IN12: Llave Emergencia

**Módulo 3 - Puerta Oficina:**
- Misma distribución que Módulo 2

### 11.2. Distribución de Salidas (36 salidas totales)

**Módulo 1 - Central:**
- OUT1: Alarma Zaguán
- OUT2: Locución Cajero Ocupado
- OUT3: Locución Pase Por Favor
- OUT4: Locución Por Su Seguridad
- OUT5-12: Reservadas

**Módulo 2 - Puerta Calle:**
- OUT1: Llave Echada (EMICOM) Selector A
- OUT2: Llave Echada (Alimentación Bobinas)
- OUT3: Emergencia Incendio (EMICOM) Night Bank
- OUT4: Emergencia Resto (EMICOM) Night Bank
- OUT5: Anulación ICR 2 (EMICOM) Lock
- OUT6: Anulación Alimentación Pila Winhouse
- OUT7: Orden de Apertura (EMICOM) EM/OPEN/CLOSE
- OUT8-12: Reservadas

**Módulo 3 - Puerta Oficina:**
- Misma distribución que Módulo 2

---

## 12. REQUERIMIENTOS DE SEGURIDAD

### 12.1. Autenticación
- API REST: Basic Auth sobre HTTPS (TLS 1.2+)
- Interfaz Web: Autenticación con hash de contraseñas (bcrypt)
- Certificado SSL: Autofirmado (suficiente para red local corporativa)

### 12.2. Protección de Datos
- Validación y sanitización de todas las entradas
- Protección contra inyección SQL
- Credenciales cifradas en base de datos
- Logs de auditoría de todos los accesos

---

## RESUMEN DE FUNCIONALIDADES PRINCIPALES

✅ **7 modos operativos** con exclusión mutua  
✅ **33 actuaciones complejas** con enclavamientos y temporizaciones  
✅ **Cambio automático de modo** por horario y calendario  
✅ **Comunicación Modbus TCP/IP** con 3 módulos ETD8A12  
✅ **API REST** completa con documentación Swagger  
✅ **Interfaz web** responsive para configuración y monitorización  
✅ **Histórico de 180 días** con exportación CSV  
✅ **Modo autónomo** sin dependencia de tablet/red  
✅ **Servicio Windows** con auto-inicio y recuperación automática  
✅ **Sistema de logs y auditoría** completo  