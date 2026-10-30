-- Sistema de gestión de taller mecánico (multi-sucursal)
-- Motor: MySQL 8.0.16+ / MariaDB 10.5+

DROP DATABASE IF EXISTS taller_mecanico;
CREATE DATABASE taller_mecanico CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taller_mecanico;

-- 1. TABLAS BASE
CREATE TABLE PERSONAS (
  id_persona         INT AUTO_INCREMENT PRIMARY KEY,
  tipo_persona       VARCHAR(20) NOT NULL DEFAULT 'NATURAL',
  tipo_documento     VARCHAR(20) NOT NULL,
  documento          VARCHAR(20) NOT NULL,
  nombres            VARCHAR(150) NOT NULL,
  apellidos          VARCHAR(50),
  correo             VARCHAR(100),
  direccion          VARCHAR(100),
  telefono           VARCHAR(20),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (tipo_documento, documento),
  CONSTRAINT chk_tipo_persona CHECK (tipo_persona IN ('NATURAL', 'JURIDICA'))
);

CREATE TABLE ROLES (
  id_rol             INT AUTO_INCREMENT PRIMARY KEY,
  nombre             VARCHAR(50) NOT NULL UNIQUE,
  descripcion        VARCHAR(255),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE SUCURSALES (
  id_sucursal        INT AUTO_INCREMENT PRIMARY KEY,
  nombre             VARCHAR(60) NOT NULL,
  direccion          VARCHAR(60),
  telefono           VARCHAR(60),
  ruc                VARCHAR(11) NOT NULL,
  igv                DECIMAL(10,2) NOT NULL DEFAULT 18.00,
  hora_apertura      TIME,
  hora_cierre        TIME,
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE CATEGORIAS (
  id_categoria       INT AUTO_INCREMENT PRIMARY KEY,
  nombre             VARCHAR(50) NOT NULL,
  descripcion        VARCHAR(100),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE SERVICIOS (
  id_servicio        INT AUTO_INCREMENT PRIMARY KEY,
  nombre             VARCHAR(50) NOT NULL,
  precio_base        DECIMAL(10,2) NOT NULL,
  precio_regular     DECIMAL(10,2) NOT NULL,
  descripcion        VARCHAR(255),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. TABLAS CON DEPENDENCIAS
CREATE TABLE USUARIOS (
  id_usuario         INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  id_rol             INT NOT NULL,
  usuario            VARCHAR(60) NOT NULL UNIQUE,
  password           VARCHAR(255) NOT NULL,
  foto_url           VARCHAR(255),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  ultimo_acceso      DATETIME,
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona) REFERENCES PERSONAS(id_persona),
  FOREIGN KEY (id_rol)     REFERENCES ROLES(id_rol)
);

CREATE TABLE MECANICOS (
  id_mecanico        INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  especialidad       VARCHAR(50),
  horario            VARCHAR(100),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona) REFERENCES PERSONAS(id_persona)
);

CREATE TABLE VEHICULOS (
  id_vehiculo        INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  placa              VARCHAR(20) NOT NULL UNIQUE,
  vin                VARCHAR(20),
  marca              VARCHAR(50),
  modelo             VARCHAR(20),
  anio               VARCHAR(5),
  color              VARCHAR(20),
  numero_motor       VARCHAR(30),
  numero_chasis      VARCHAR(30),
  tipo_combustible   VARCHAR(20),
  observaciones      VARCHAR(255),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona) REFERENCES PERSONAS(id_persona)
);

CREATE TABLE PRODUCTOS (
  id_producto        INT AUTO_INCREMENT PRIMARY KEY,
  id_categoria       INT NOT NULL,
  codigo             VARCHAR(50) NOT NULL UNIQUE,
  nombre             VARCHAR(50) NOT NULL,
  marca              VARCHAR(50),
  descripcion        VARCHAR(255),
  precio_compra      DECIMAL(10,2) NOT NULL,
  precio_venta       DECIMAL(10,2) NOT NULL,
  precio_minimo      DECIMAL(10,2) NOT NULL,
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_categoria) REFERENCES CATEGORIAS(id_categoria)
);

-- 3. TABLAS INTERMEDIAS
CREATE TABLE usuarios_sucursales (
  id_usuario_sucursal INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT NOT NULL,
  id_sucursal         INT NOT NULL,
  UNIQUE (id_usuario, id_sucursal),
  FOREIGN KEY (id_usuario)  REFERENCES USUARIOS(id_usuario),
  FOREIGN KEY (id_sucursal) REFERENCES SUCURSALES(id_sucursal)
);

CREATE TABLE sucursal_mecanico (
  id_sucursal_mecanico INT AUTO_INCREMENT PRIMARY KEY,
  id_mecanico          INT NOT NULL,
  id_sucursal          INT NOT NULL,
  fecha_modificacion   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (id_mecanico, id_sucursal),
  FOREIGN KEY (id_mecanico) REFERENCES MECANICOS(id_mecanico),
  FOREIGN KEY (id_sucursal) REFERENCES SUCURSALES(id_sucursal)
);

CREATE TABLE sucursal_servicio (
  id_sucursal_servicio INT AUTO_INCREMENT PRIMARY KEY,
  id_servicio          INT NOT NULL,
  id_sucursal          INT NOT NULL,
  fecha_modificacion   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (id_servicio, id_sucursal),
  FOREIGN KEY (id_servicio) REFERENCES SERVICIOS(id_servicio),
  FOREIGN KEY (id_sucursal) REFERENCES SUCURSALES(id_sucursal)
);

CREATE TABLE sucursal_inventario (
  id_sucursal_inventario INT AUTO_INCREMENT PRIMARY KEY,
  id_sucursal            INT NOT NULL,
  id_producto            INT NOT NULL,
  stock                  INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  UNIQUE (id_sucursal, id_producto),
  FOREIGN KEY (id_sucursal) REFERENCES SUCURSALES(id_sucursal),
  FOREIGN KEY (id_producto) REFERENCES PRODUCTOS(id_producto)
);

-- 4. FLUJO DE ATENCIÓN
CREATE TABLE CITAS (
  id_cita            INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  id_sucursal        INT NOT NULL,
  id_vehiculo        INT NOT NULL,
  fecha_cita         DATE NOT NULL,
  hora_cita          TIME NOT NULL,
  motivo             VARCHAR(255),
  estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona)  REFERENCES PERSONAS(id_persona),
  FOREIGN KEY (id_sucursal) REFERENCES SUCURSALES(id_sucursal),
  FOREIGN KEY (id_vehiculo) REFERENCES VEHICULOS(id_vehiculo)
);

CREATE TABLE COTIZACIONES (
  id_cotizacion      INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  id_sucursal        INT NOT NULL,
  id_vehiculo        INT NOT NULL,
  observacion        VARCHAR(255),
  monto_cotizacion   DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  validez            VARCHAR(10),
  fecha_cotizacion   DATE NOT NULL,
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona)  REFERENCES PERSONAS(id_persona),
  FOREIGN KEY (id_sucursal) REFERENCES SUCURSALES(id_sucursal),
  FOREIGN KEY (id_vehiculo) REFERENCES VEHICULOS(id_vehiculo)
);

CREATE TABLE detalle_cotizacion (
  id_detalle_cotizacion INT AUTO_INCREMENT PRIMARY KEY,
  id_cotizacion         INT NOT NULL,
  id_producto           INT NULL,
  id_servicio           INT NULL,
  cantidad              INT NOT NULL CHECK (cantidad > 0),
  precio_unitario       DECIMAL(10,2) NOT NULL,
  subtotal              DECIMAL(10,2) NOT NULL,
  observacion           VARCHAR(255),
  FOREIGN KEY (id_cotizacion) REFERENCES COTIZACIONES(id_cotizacion),
  FOREIGN KEY (id_producto)   REFERENCES PRODUCTOS(id_producto),
  FOREIGN KEY (id_servicio)   REFERENCES SERVICIOS(id_servicio),
  CHECK ((id_producto IS NULL) <> (id_servicio IS NULL))
);

CREATE TABLE ORDENES_TRABAJO (
  id_orden_trabajo   INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  id_sucursal        INT NOT NULL,
  id_cita            INT NULL,
  id_cotizacion      INT NULL,
  id_vehiculo        INT NOT NULL,
  observacion        VARCHAR(255),
  fecha_atencion     DATE,
  estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona)    REFERENCES PERSONAS(id_persona),
  FOREIGN KEY (id_sucursal)   REFERENCES SUCURSALES(id_sucursal),
  FOREIGN KEY (id_cita)       REFERENCES CITAS(id_cita),
  FOREIGN KEY (id_cotizacion) REFERENCES COTIZACIONES(id_cotizacion),
  FOREIGN KEY (id_vehiculo)   REFERENCES VEHICULOS(id_vehiculo)
);

CREATE TABLE detalles_ot (
  id_detalle_ot      INT AUTO_INCREMENT PRIMARY KEY,
  id_orden_trabajo   INT NOT NULL,
  id_servicio        INT NULL,
  id_producto        INT NULL,
  cantidad           INT NOT NULL CHECK (cantidad > 0),
  precio_unitario    DECIMAL(10,2) NOT NULL,
  subtotal           DECIMAL(10,2) NOT NULL,
  observacion        VARCHAR(255),
  FOREIGN KEY (id_orden_trabajo) REFERENCES ORDENES_TRABAJO(id_orden_trabajo),
  FOREIGN KEY (id_servicio)      REFERENCES SERVICIOS(id_servicio),
  FOREIGN KEY (id_producto)      REFERENCES PRODUCTOS(id_producto),
  CHECK ((id_producto IS NULL) <> (id_servicio IS NULL))
);

CREATE TABLE mecanico_ot (
  id_mecanico_ot     INT AUTO_INCREMENT PRIMARY KEY,
  id_mecanico        INT NOT NULL,
  id_orden_trabajo   INT NOT NULL,
  UNIQUE (id_mecanico, id_orden_trabajo),
  FOREIGN KEY (id_mecanico)      REFERENCES MECANICOS(id_mecanico),
  FOREIGN KEY (id_orden_trabajo) REFERENCES ORDENES_TRABAJO(id_orden_trabajo)
);

CREATE TABLE INFORMES (
  id_informe         INT AUTO_INCREMENT PRIMARY KEY,
  id_orden_trabajo   INT NOT NULL,
  id_mecanico        INT NOT NULL,
  tipo_comprobante   VARCHAR(50),
  numero             INT,
  serie              VARCHAR(20),
  fecha_emision      DATE,
  subtotal           DECIMAL(10,2),
  igv                DECIMAL(10,2),
  total              DECIMAL(10,2),
  estado             VARCHAR(20) NOT NULL DEFAULT 'EMITIDO',
  observacion        VARCHAR(255),
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_orden_trabajo) REFERENCES ORDENES_TRABAJO(id_orden_trabajo),
  FOREIGN KEY (id_mecanico)      REFERENCES MECANICOS(id_mecanico)
);

CREATE TABLE EVIDENCIAS (
  id_evidencia       INT AUTO_INCREMENT PRIMARY KEY,
  id_informe         INT NOT NULL,
  url_archivo        VARCHAR(255) NOT NULL,
  descripcion        VARCHAR(255),
  fecha_registro     DATE,
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_informe) REFERENCES INFORMES(id_informe)
);

-- 5. VENTAS DIRECTAS
CREATE TABLE ORDENES_VENTA (
  id_orden_venta     INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  id_sucursal        INT NOT NULL,
  observacion        VARCHAR(255),
  monto_orden_venta  DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento          DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_atencion     DATE,
  estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona)  REFERENCES PERSONAS(id_persona),
  FOREIGN KEY (id_sucursal) REFERENCES SUCURSALES(id_sucursal)
);

CREATE TABLE detalle_venta (
  id_detalle_venta   INT AUTO_INCREMENT PRIMARY KEY,
  id_orden_venta     INT NOT NULL,
  id_producto        INT NOT NULL,
  cantidad           INT NOT NULL CHECK (cantidad > 0),
  precio_unitario    DECIMAL(10,2) NOT NULL,
  subtotal           DECIMAL(10,2) NOT NULL,
  observacion        VARCHAR(255),
  FOREIGN KEY (id_orden_venta) REFERENCES ORDENES_VENTA(id_orden_venta),
  FOREIGN KEY (id_producto)    REFERENCES PRODUCTOS(id_producto)
);

-- 6. FACTURACIÓN
CREATE TABLE COMPROBANTES (
  id_comprobante     INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL,
  id_sucursal        INT NOT NULL,
  id_orden_trabajo   INT NULL,
  id_orden_venta     INT NULL,
  tipo_comprobante   VARCHAR(50) NOT NULL,
  numero             INT NOT NULL,
  serie              VARCHAR(20) NOT NULL,
  fecha_emision      DATE NOT NULL,
  subtotal           DECIMAL(10,2) NOT NULL,
  igv                DECIMAL(10,2) NOT NULL,
  descuento          DECIMAL(10,2) NOT NULL DEFAULT 0,
  total              DECIMAL(10,2) NOT NULL,
  estado             VARCHAR(20) NOT NULL DEFAULT 'EMITIDO',
  observacion        VARCHAR(255),
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (tipo_comprobante, serie, numero),
  FOREIGN KEY (id_persona)       REFERENCES PERSONAS(id_persona),
  FOREIGN KEY (id_sucursal)      REFERENCES SUCURSALES(id_sucursal),
  FOREIGN KEY (id_orden_trabajo) REFERENCES ORDENES_TRABAJO(id_orden_trabajo),
  FOREIGN KEY (id_orden_venta)   REFERENCES ORDENES_VENTA(id_orden_venta),
  CHECK ((id_orden_trabajo IS NULL) <> (id_orden_venta IS NULL))
);

CREATE TABLE detalle_comprobante (
  id_detalle         INT AUTO_INCREMENT PRIMARY KEY,
  id_comprobante     INT NOT NULL,
  cantidad           INT NOT NULL CHECK (cantidad > 0),
  precio_unitario    DECIMAL(10,2) NOT NULL,
  subtotal           DECIMAL(10,2) NOT NULL,
  descripcion        VARCHAR(255),
  FOREIGN KEY (id_comprobante) REFERENCES COMPROBANTES(id_comprobante)
);

-- DATOS DE PRUEBA
INSERT INTO ROLES (nombre, descripcion) VALUES
 ('ADMINISTRADOR','Acceso total al sistema'),
 ('RECEPCIONISTA','Citas, cotizaciones y ventas'),
 ('MECANICO','Ejecuta órdenes de trabajo'),
 ('CLIENTE','Consulta sus citas, vehículos y comprobantes');

INSERT INTO SUCURSALES (nombre, direccion, telefono, ruc, igv, hora_apertura, hora_cierre) VALUES
 ('Taller Central','Av. Ejercito 123, Arequipa','054-222333','20123456789',18.00,'08:00','18:00'),
 ('Taller Cono Norte','Av. Aviacion 456, Arequipa','054-444555','20123456789',18.00,'08:00','17:00');

INSERT INTO PERSONAS (tipo_persona, tipo_documento, documento, nombres, apellidos, correo, direccion, telefono) VALUES
 ('NATURAL','DNI','70000001','Carlos','Ramirez Soto','carlos@taller.pe','Calle Lima 10','959000001'),
 ('NATURAL','DNI','70000002','Luis','Quispe Mamani','luis@taller.pe','Calle Cusco 22','959000002'),
 ('NATURAL','DNI','70000003','Ana','Flores Huaman','ana@taller.pe','Calle Puno 33','959000003'),
 ('NATURAL','DNI','45000001','Jorge','Mendoza Paredes','jorge@mail.com','Av. Parra 100','959111111'),
 ('NATURAL','DNI','45000002','Maria','Salas Choque','maria@mail.com','Av. Goyeneche 200','959222222'),
 ('JURIDICA','RUC','20555555551','Transportes Andinos S.A.C.',NULL,'contacto@andinos.pe','Parque Industrial 50','054555666');

INSERT INTO USUARIOS (id_persona, id_rol, usuario, password) VALUES
 (1,1,'admin','$2b$10$HASH_DE_EJEMPLO_ADMIN'),
 (3,2,'recepcion','$2b$10$HASH_DE_EJEMPLO_RECEP'),
 (2,3,'lquispe','$2b$10$HASH_DE_EJEMPLO_MEC'),
 (4,4,'jmendoza','$2b$10$HASH_DE_EJEMPLO_CLI1'),
 (5,4,'msalas','$2b$10$HASH_DE_EJEMPLO_CLI2'),
 (6,4,'andinos','$2b$10$HASH_DE_EJEMPLO_CLI3');

INSERT INTO usuarios_sucursales (id_usuario, id_sucursal) VALUES
 (1,1),(1,2),(2,1),(3,1);

INSERT INTO MECANICOS (id_persona, especialidad, horario) VALUES
 (2,'Motor y transmision','Lun-Sab 08:00-17:00');

INSERT INTO sucursal_mecanico (id_mecanico, id_sucursal) VALUES (1,1);

INSERT INTO CATEGORIAS (nombre, descripcion) VALUES
 ('Lubricantes','Aceites y grasas'),
 ('Filtros','Filtros de aceite, aire y combustible'),
 ('Frenos','Pastillas, discos y liquido');

INSERT INTO PRODUCTOS (id_categoria, codigo, nombre, marca, descripcion, precio_compra, precio_venta, precio_minimo) VALUES
 (1,'LUB-001','Aceite 10W40 1L','Castrol','Aceite semisintetico',25.00,38.00,32.00),
 (2,'FIL-001','Filtro de aceite','Bosch','Compatible con Toyota Hilux',12.00,22.00,18.00),
 (3,'FRE-001','Pastillas de freno delanteras','Brembo','Juego x4',90.00,150.00,125.00);

INSERT INTO SERVICIOS (nombre, precio_base, precio_regular, descripcion) VALUES
 ('Cambio de aceite',30.00,50.00,'Mano de obra cambio de aceite y filtro'),
 ('Cambio de pastillas',60.00,100.00,'Mano de obra cambio de pastillas'),
 ('Diagnostico general',40.00,70.00,'Escaneo y revision completa');

INSERT INTO sucursal_inventario (id_sucursal, id_producto, stock) VALUES
 (1,1,50),(1,2,30),(1,3,10),(2,1,20),(2,2,15);

INSERT INTO sucursal_servicio (id_servicio, id_sucursal) VALUES
 (1,1),(2,1),(3,1),(1,2),(3,2);

INSERT INTO VEHICULOS (id_persona, placa, vin, marca, modelo, anio, color, numero_motor, numero_chasis, tipo_combustible) VALUES
 (4,'ABC-123','JTFHX02P600000001','Toyota','Hilux','2018','Blanco','1GD-FTV123456','MR0FA3CD000001','Diesel'),
 (5,'XYZ-789','KMHD84LF5GU000002','Hyundai','Elantra','2016','Gris','G4NB654321','KMHD84000002','Gasolina');

-- Flujo: cita > cotización > orden de trabajo > informe > comprobante
INSERT INTO CITAS (id_persona, id_sucursal, id_vehiculo, fecha_cita, hora_cita, motivo, estado) VALUES
 (4,1,1,'2026-10-14','09:00','Cambio de aceite y revision de frenos','CONFIRMADA');

INSERT INTO COTIZACIONES (id_persona, id_sucursal, id_vehiculo, observacion, monto_cotizacion, estado, validez, fecha_cotizacion) VALUES
 (4,1,1,'Cambio de aceite + pastillas',452.00,'APROBADA','7 dias','2026-10-13');

INSERT INTO detalle_cotizacion (id_cotizacion, id_producto, id_servicio, cantidad, precio_unitario, subtotal) VALUES
 (1,1,NULL,4,38.00,152.00),
 (1,NULL,1,1,50.00,50.00),
 (1,3,NULL,1,150.00,150.00),
 (1,NULL,2,1,100.00,100.00);

INSERT INTO ORDENES_TRABAJO (id_persona, id_sucursal, id_cita, id_cotizacion, id_vehiculo, observacion, fecha_atencion, estado) VALUES
 (4,1,1,1,1,'Trabajo segun cotizacion 1','2026-10-14','FINALIZADA');

INSERT INTO detalles_ot (id_orden_trabajo, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES
 (1,NULL,1,4,38.00,152.00),
 (1,1,NULL,1,50.00,50.00),
 (1,NULL,3,1,150.00,150.00),
 (1,2,NULL,1,100.00,100.00);

UPDATE sucursal_inventario SET stock = stock - 4 WHERE id_sucursal = 1 AND id_producto = 1;
UPDATE sucursal_inventario SET stock = stock - 1 WHERE id_sucursal = 1 AND id_producto = 3;

INSERT INTO mecanico_ot (id_mecanico, id_orden_trabajo) VALUES (1,1);

INSERT INTO INFORMES (id_orden_trabajo, id_mecanico, fecha_emision, subtotal, igv, total, observacion) VALUES
 (1,1,'2026-10-14',383.05,68.95,452.00,'Se cambio aceite y pastillas. Discos en buen estado.');

INSERT INTO EVIDENCIAS (id_informe, url_archivo, descripcion, fecha_registro) VALUES
 (1,'/evidencias/ot1_pastillas_antes.jpg','Pastillas desgastadas','2026-10-14'),
 (1,'/evidencias/ot1_pastillas_despues.jpg','Pastillas nuevas instaladas','2026-10-14');

INSERT INTO COMPROBANTES (id_persona, id_sucursal, id_orden_trabajo, tipo_comprobante, numero, serie, fecha_emision, subtotal, igv, total) VALUES
 (4,1,1,'BOLETA',1,'B001','2026-10-14',383.05,68.95,452.00);

INSERT INTO detalle_comprobante (id_comprobante, cantidad, precio_unitario, subtotal, descripcion) VALUES
 (1,4,38.00,152.00,'Aceite 10W40 1L'),
 (1,1,50.00,50.00,'Servicio cambio de aceite'),
 (1,1,150.00,150.00,'Pastillas de freno delanteras'),
 (1,1,100.00,100.00,'Servicio cambio de pastillas');

-- Venta directa de mostrador
INSERT INTO ORDENES_VENTA (id_persona, id_sucursal, observacion, monto_orden_venta, descuento, fecha_atencion, estado) VALUES
 (5,2,'Venta de mostrador',44.00,0,'2026-10-13','PAGADA');

INSERT INTO detalle_venta (id_orden_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES
 (1,2,2,22.00,44.00);

UPDATE sucursal_inventario SET stock = stock - 2 WHERE id_sucursal = 2 AND id_producto = 2;

INSERT INTO COMPROBANTES (id_persona, id_sucursal, id_orden_venta, tipo_comprobante, numero, serie, fecha_emision, subtotal, igv, total) VALUES
 (5,2,1,'BOLETA',1,'B002','2026-10-13',37.29,6.71,44.00);

INSERT INTO detalle_comprobante (id_comprobante, cantidad, precio_unitario, subtotal, descripcion) VALUES
 (2,2,22.00,44.00,'Filtro de aceite');