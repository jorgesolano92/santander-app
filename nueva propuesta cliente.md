DOCUMENTO DE ALCANCE DEL PROYECTO
Centro de Control (COCE)
Sistema de Monitorización y Gestión Centralizada
Control de Accesos Banco Santander
Cliente: Banco Santander
Integrador: SAIMA SEGURIDAD
Fecha: 26 de Enero de 2025
Versión: 1.0
 
TABLA DE CONTENIDOS
TABLA DE CONTENIDOS	2
1. RESUMEN EJECUTIVO	4
2. CONTEXTO DEL PROYECTO	5
2.1. Arquitectura del Sistema Global	5
3. OBJETIVOS DEL COCE	6
3.1. Objetivo General	6
3.2. Objetivos Específicos	6
4. ARQUITECTURA TÉCNICA RECOMENDADA	7
4.1. Stack Tecnológico	7
4.2. Arquitectura General	7
5. ALCANCE FUNCIONAL	9
5.1. FASE 1 – Núcleo COCE (OBLIGATORIA)	9
5.1.1. Visualización del Estado del Sistema	9
5.1.2. Control Remoto Avanzado	9
5.1.3. Gestión de Versiones de Software	9
5.1.4. Actualización Remota de Software	9
5.1.5. Mensajería desde COCE a Tablets	10
5.1.6. Autenticación y Seguridad Básica	10
5.1.7. Logs y Auditoría Básica	10
5.2. FASE 2 – Funcionalidades Opcionales / Avanzadas	12
5.2.1. Centralización de Eventos y Alarmas	12
5.2.2. Histórico Corporativo y Reporting	12
5.2.3. Control Remoto Avanzado	12
5.2.4. Gestión Avanzada de Usuarios y Roles	12
5.2.5. Alertas y Notificaciones	13
6. FUNCIONALIDADES PRESCINDIBLES (NO REQUERIDAS)	14
7. COMUNICACIONES Y PROTOCOLOS	15
7.1. Protocolo de Comunicación	15
7.2. Conectividad de las Oficinas	15
8. REQUISITOS DE INFRAESTRUCTURA	16
8.1. Servidor COCE (Datacenter Santander)	16
8.2. Base de Datos PostgreSQL	16
8.3. Puertos y Firewall	16
9. CRONOGRAMA ESTIMADO	17
10. ENTREGABLES DEL PROYECTO	18
10.1. Software	18
10.2. Documentación Técnica	18
10.3. Soporte	18
11. CRITERIOS DE ACEPTACIÓN	19
11.1. Criterios Funcionales	19
11.2. Criterios de Rendimiento	19
11.3. Criterios de Seguridad	19
12. SUPUESTOS Y RESTRICCIONES	20
12.1. Supuestos	20
12.2. Restricciones	20

 
1. RESUMEN EJECUTIVO
El presente documento define el alcance técnico y funcional para el desarrollo del Centro de Control (COCE), un sistema centralizado de monitorización y gestión remota destinado a supervisar las instalaciones de control de accesos desplegadas en oficinas del Banco Santander.
El COCE constituye la Fase 2 del proyecto global de modernización del sistema de control de accesos, que ya incluye:
Objetivos principales del COCE:
●	Visualizar el estado operativo en tiempo real de 200-500 instalaciones
●	Gestionar versiones de software y actualizaciones remotas
●	Facilitar el soporte técnico remoto y mantenimiento predictivo
●	Centralizar eventos relevantes y generar reporting corporativo
●	Enviar mensajes operativos a las tablets de las oficinas
Principio fundamental:
El COCE actúa como supervisor y gestor, NO como elemento crítico. Los sistemas locales (PC Industrial + Tablet) son 100% autónomos y continúan funcionando sin conexión al COCE.
 
2. CONTEXTO DEL PROYECTO
2.1. Arquitectura del Sistema Global
El proyecto completo se estructura en tres capas claramente diferenciadas:
CAPA	COMPONENTE	ESTADO
CAPA 1 Interfaz Usuario	Tablet Android Akuvox C319S App en Kotlin con interfaz táctil	En desarrollo
CAPA 2 Lógica Control	PC Industrial Windows IoT Software Python + FastAPI + SQLite 3x Módulos ETD8A12 (Modbus TCP)	Por desarrollar
CAPA 3 Supervisión	Centro de Control (COCE) Monitorización y gestión centralizada	Por desarrollar (ESTE PROYECTO)

 
3. OBJETIVOS DEL COCE
3.1. Objetivo General
Desarrollar una plataforma centralizada que permita la supervisión, gestión y mantenimiento remoto de los sistemas de control de accesos desplegados en las oficinas del Banco Santander, sin comprometer la autonomía operativa de los sistemas locales.
3.2. Objetivos Específicos
●	Monitorización en tiempo real del estado de conectividad, modo operativo y alarmas de cada instalación
●	Gestión centralizada de versiones de software (PC Industrial y Tablet Android)
●	Despliegue remoto de actualizaciones con control de integridad y confirmación de éxito
●	Envío de mensajes operativos a las tablets (avisos, emergencias, mantenimiento)
●	Centralización opcional de eventos relevantes con histórico corporativo
●	Generación de informes y métricas operativas (KPIs)
●	Facilitar el soporte técnico remoto reduciendo desplazamientos
 
4. ARQUITECTURA TÉCNICA RECOMENDADA
4.1. Stack Tecnológico
COMPONENTE	TECNOLOGÍA	JUSTIFICACIÓN
Backend API	Python + FastAPI	Consistencia con software local Async nativo para WebSockets Auto-documentación Swagger
Frontend Web	React + Next.js	SSR para rendimiento Componentes reutilizables Ecosistema robusto
Base de Datos	PostgreSQL + TimescaleDB	ACID completo JSON nativo Series temporales
Comunicaciones	HTTPS + WebSockets	Seguridad TLS 1.3 Tiempo real bidireccional
Servidor Web	NGINX	Proxy inverso Balanceo de carga Certificados SSL
Alojamiento	Datacenter Santander	Control total Cumplimiento normativo

4.2. Arquitectura General
  

5. ALCANCE FUNCIONAL
El desarrollo se estructura en dos fases claramente diferenciadas:
5.1. FASE 1 – Núcleo COCE (OBLIGATORIA)
5.1.1. Visualización del Estado del Sistema
El COCE deberá permitir visualizar en tiempo real, por cada instalación:
●	Estado de conectividad del PC industrial
●	Estado de conectividad de la tablet
●	Modo operativo activo (COMERCIAL, EXTENDIDO, ATM, CERRADO, etc.)
●	Estado general de las puertas (abierta/cerrada/bloqueada/emergencia)
●	Indicadores de fallo o alarma activa
Dashboard principal:
●	Mapa de oficinas con indicadores de estado (verde/amarillo/rojo)
●	Lista filtrable y ordenable de instalaciones
●	Actualización en tiempo real vía WebSockets
5.1.2. Control Remoto Avanzado
Acciones remotas adicionales, sujetas a permisos y confirmación:
●	Cambio remoto de modo operativo (COMERCIAL, CERRADO, EMERGENCIA, etc.)
●	Reinicio remoto del software de control (sin reiniciar PC)
5.1.3. Gestión de Versiones de Software
El COCE actuará como repositorio y gestor de versiones para:
●	Software de control de accesos (PC Industrial Python)
●	Aplicación Android de la tablet (APK)
Funcionalidades mínimas:
●	Consulta de versión instalada en cada sistema
●	Consulta de versión homologada disponible
●	Repositorio central de versiones con histórico
●	Detección automática de instalaciones con versiones desactualizadas
5.1.4. Actualización Remota de Software
El sistema deberá permitir:
●	Lanzar actualizaciones remotas del software del PC industrial
●	Lanzar actualizaciones remotas del APK de la tablet
●	Controlar el proceso de actualización:
○	Descarga
○	Verificación de integridad (checksum SHA-256)
○	Aplicación
○	Confirmación de éxito o error con rollback automático
Modos de actualización:
●	Actualización manual (selección de oficinas específicas)
●	Actualización programada (horario nocturno fuera de horario comercial)
●	Actualización en lotes (ej: 10 oficinas cada noche)
5.1.5. Mensajería desde COCE a Tablets
El COCE deberá permitir el envío de mensajes operativos a las tablets:
●	Avisos de mantenimiento programado
●	Indicaciones operativas
●	Mensajes de emergencia prioritarios
●	Notificaciones de actualización disponible
Características:
●	Mensajes unidireccionales (COCE → Tablet)
●	Visualización clara en la app (banner/popup)
●	Registro del envío y confirmación de recepción
●	Envío masivo (todas las oficinas) o selectivo (grupos/individual)
5.1.6. Autenticación y Seguridad Básica
●	Autenticación usuario/contraseña (un solo rol administrador)
●	Cifrado TLS 1.3 en todas las comunicaciones
●	Token JWT para sesiones con expiración automática
●	Registro de acciones administrativas (auditoría básica)
5.1.7. Logs y Auditoría Básica
●	Registro de conexiones/desconexiones de oficinas
●	Registro de actualizaciones de software
●	Registro de mensajes enviados
●	Registro de acciones administrativas
●	Visualización básica de logs con filtros (fecha, oficina, tipo)
 
5.2. FASE 2 – Funcionalidades Opcionales / Avanzadas
Las siguientes funcionalidades NO son necesarias para la operación básica, pero aportan valor añadido. Se solicita que se presupuesten POR SEPARADO.
5.2.1. Centralización de Eventos y Alarmas
El COCE podrá recibir una copia resumida de eventos relevantes generados por el sistema local:
●	Cambios de modo operativo
●	Activación de emergencias
●	Fallos de comunicación con módulos ETD8A12
●	Acciones remotas ejecutadas
●	Alarmas de seguridad (intento de forzado, puertas abiertas fuera de horario)
Nota importante: El histórico completo y legal permanecerá siempre en el sistema local (SQLite). El COCE solo almacena eventos relevantes para monitorización corporativa.
5.2.2. Histórico Corporativo y Reporting
●	Almacenamiento centralizado de eventos relevantes (últimos 12 meses)
●	Filtros avanzados por instalación, rango de fechas, tipo de evento
●	Exportación de informes en formato Excel y PDF
●	Gráficos de tendencias y estadísticas operativas
●	KPIs corporativos (uptime, tiempo medio entre fallos, etc.)
5.2.3. Control Remoto Avanzado
Acciones remotas adicionales, sujetas a permisos y confirmación:
●	Forzado a modo seguro ante situación crítica
●	Confirmación y reconocimiento de alarmas
●	Control directo de hardware desde el COCE (solo vía sistema local)
Seguridad: Todas las acciones remotas requieren confirmación del operador y quedan registradas con timestamp y usuario responsable.
5.2.4. Gestión Avanzada de Usuarios y Roles
Implementación de perfiles diferenciados:
●	Operador: Solo visualización de estado
●	Técnico: Visualización + actualizaciones software + mensajería
●	Supervisor: Técnico + control remoto avanzado
●	Administrador: Acceso total + gestión de usuarios
5.2.5. Alertas y Notificaciones
●	Notificaciones por email ante eventos críticos
●	SMS de emergencia para situaciones graves (opcional)
●	Configuración de reglas de alerta personalizables
●	Escalado de alertas si no hay respuesta en X minutos
 
6. FUNCIONALIDADES PRESCINDIBLES (NO REQUERIDAS)
Las siguientes funcionalidades NO forman parte del alcance actual y NO deben incluirse salvo petición expresa:
●	Dependencia permanente de conexión (sistema local es autónomo)
●	Videovigilancia o streaming de vídeo en tiempo real
●	Analítica avanzada con IA o machine learning
●	Integración con sistemas externos del Santander no definidos
●	Gestión multi-tenant para otros clientes (solo Santander)
 
7. COMUNICACIONES Y PROTOCOLOS
7.1. Protocolo de Comunicación
COMPONENTE	PROTOCOLO	DESCRIPCIÓN
Oficina → COCE (Heartbeat)	WebSocket (WSS)	Conexión persistente para estado en tiempo real Heartbeat cada 30 segundos
Oficina → COCE (Datos)	HTTPS REST	Envío de eventos, logs, actualizaciones de estado
COCE → Oficina (Comandos)	HTTPS REST	Actualizaciones software, mensajes, cambios configuración
Seguridad	TLS 1.3	Cifrado extremo a extremo Certificados autofirmados internos
Autenticación	Bearer Token	Cada oficina tiene token único Renovación automática cada 24h

7.2. Conectividad de las Oficinas
●	Conectividad primaria: VPN corporativa del Banco Santander
●	Conectividad secundaria: 4G/5G (fallback automático)
●	Modo autónomo: Si no hay conexión, el sistema local sigue funcionando normalmente
●	Sincronización: Al recuperar conectividad, envío automático de eventos pendientes

 
8. REQUISITOS DE INFRAESTRUCTURA
8.1. Servidor COCE (Datacenter Santander)
COMPONENTE	REQUISITO MÍNIMO	RECOMENDADO
CPU	4 cores	8 cores
RAM	8 GB	16 GB
Almacenamiento	100 GB SSD	250 GB SSD
Sistema Operativo	Ubuntu 22.04 LTS o superior	Ubuntu 24.04 LTS
Red	1 Gbps	10 Gbps
Backup	Diario incremental	Diario + semanal completo

8.2. Base de Datos PostgreSQL
●	•	PostgreSQL 14 o superior
●	•	TimescaleDB extension para series temporales (eventos)
●	•	Backup automático cada 6 horas
●	•	Retención de datos: 12 meses de eventos, ilimitado para configuración
8.3. Puertos y Firewall
●	•	Puerto 443 (HTTPS/WSS): Comunicación con oficinas
●	•	Puerto 80 (HTTP): Redirección automática a HTTPS
●	•	Puerto 5432 (PostgreSQL): Solo acceso local
●	•	Certificado SSL/TLS: Autofirmado o certificado interno del Santander
 
9. CRONOGRAMA ESTIMADO
FASE	DURACIÓN	ENTREGABLES
Análisis y Diseño	2 semanas	Especificaciones técnicas Diseño base de datos Diseño de interfaces
Desarrollo Backend	4-5 semanas	API REST completa WebSockets Gestión de versiones Sistema de actualizaciones
Desarrollo Frontend	3-4 semanas	Dashboard principal Gestión de oficinas Paneles de control
Integración y Pruebas	2 semanas	Pruebas unitarias Pruebas de integración Pruebas de carga (500 oficinas)
Documentación	1 semana	Manual técnico Manual de usuario Guía de despliegue
TOTAL FASE 1	12-14 semanas	Sistema COCE completo operativo

Nota: La Fase 2 (funcionalidades opcionales) añadiría 6-8 semanas adicionales de desarrollo.
 
10. ENTREGABLES DEL PROYECTO
10.1. Software
●	Código fuente completo del backend (Python + FastAPI)
●	Código fuente completo del frontend (React + Next.js)
●	Scripts de base de datos (schema, migraciones, seeds)
●	Scripts de despliegue automatizado (Docker Compose)
●	Pruebas unitarias y de integración
10.2. Documentación Técnica
●	Manual de instalación y configuración
●	Manual de administrador del sistema
●	Manual de usuario operador
●	Documentación API REST (Swagger/OpenAPI)
●	Guía de resolución de problemas (troubleshooting)
●	Diagrama de arquitectura actualizado
10.3. Soporte
●	Soporte técnico durante despliegue piloto (3 mes)
●	3 mes de garantía post-despliegue (corrección de bugs)
 
11. CRITERIOS DE ACEPTACIÓN
El sistema se considerará aceptado cuando cumpla los siguientes criterios:
11.1. Criterios Funcionales
●	Visualización correcta del estado de al menos 10 oficinas simultáneas
●	Actualización remota exitosa de software en oficina de prueba
●	Envío y recepción confirmada de mensajes a tablets
●	Gestión correcta de versiones de software
●	Sistema de logs y auditoría operativo
11.2. Criterios de Rendimiento
●	Tiempo de respuesta de dashboard < 2 segundos con 200 oficinas
●	Actualización de estado en tiempo real < 5 segundos
●	Soporte de al menos 500 conexiones WebSocket concurrentes
●	Disponibilidad del sistema > 99% durante piloto
11.3. Criterios de Seguridad
●	Todas las comunicaciones cifradas con TLS 1.3
●	Autenticación obligatoria para acceso al sistema
●	Registro completo de acciones administrativas
●	Validación de integridad en actualizaciones (SHA-256)
 
12. SUPUESTOS Y RESTRICCIONES
12.1. Supuestos
●	El software de control local (Python) ya está desarrollado y funcionando
●	La app Android de tablet ya está desarrollada y expone API REST
●	El datacenter del Santander proporciona infraestructura según requisitos de sección 8
●	Las oficinas tienen conectividad VPN o 4G estable
●	SAIMA proporciona acceso a 1-2 oficinas piloto para pruebas
12.2. Restricciones
●	El COCE NO debe ser elemento crítico (sistemas locales autónomos)
●	No se realizará integración con otros sistemas del Santander
●	La solución debe ser escalable a 500 oficinas sin rediseño
