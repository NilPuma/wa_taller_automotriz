const express = require('express');
const router = express.Router();

// ==========================================================
// MIDDLEWARES
// ==========================================================
const { verificarToken, verificarVista } = require('../middleware/authMiddleware');
const { upload: uploadEvidencias } = require('../middleware/evidenciaMiddleware');

// ==========================================================
// CONTROLLERS
// ==========================================================
const controllerAuth = require('../controllers/controllerAuth');
const controllerPersona = require('../controllers/controllerPersona');
const controllerVehiculo = require('../controllers/controllerVehiculo');
const controllerUsuario = require('../controllers/controllerUsuario');
const controllerMecanico = require('../controllers/controllerMecanico');
const controllerSucursal = require('../controllers/controllerSucursal');
const controllerCategoria = require('../controllers/controllerCategoria');
const controllerProducto = require('../controllers/controllerProducto');
const controllerServicio = require('../controllers/controllerServicio');
const controllerCita = require('../controllers/controllerCita');
const controllerCotizacion = require('../controllers/controllerCotizacion');
const controllerOT = require('../controllers/controllerOT');
const controllerInforme = require('../controllers/controllerInforme');
const controllerOV = require('../controllers/controllerOV');

// ==========================================================
// VISTAS DE RENDERIZADO (Protegidas)
// ==========================================================
router.get('/', (req, res) => {
    res.render('index');
});
router.get('/root', verificarVista, (req, res) => {
    res.render('root');
});
router.get('/admin', verificarVista, (req, res) => {
    res.render('administrador');
});
router.get('/mecanico', verificarVista, (req, res) => {
    res.render('mecanico');
});
router.get('/cliente', verificarVista, (req, res) => {
    res.render('cliente');
});

// ==========================================================
// API: AUTENTICACIÓN (Rutas Públicas)
// ==========================================================
router.post('/api/login', controllerAuth.login);
router.post('/api/logout', controllerAuth.logout);

// ==========================================================
// MIDDLEWARE GLOBAL DE PROTECCIÓN PARA LA API
// ==========================================================
// A partir de aquí, TODAS las rutas /api requerirán un token válido
router.use('/api', verificarToken);

// ==========================================================
// API: PERFIL (requiere token)
// ==========================================================
router.get('/api/perfil', controllerAuth.obtenerPerfil);

// ==========================================================
// API: PERSONAS
// ==========================================================
router.get('/api/personas', controllerPersona.listarPersonas);
router.get('/api/personas/rol/:idRol', controllerPersona.listarPersonasPorRol);
router.get('/api/personas/documento/:tipoDocumento/:documento', controllerPersona.buscarPersonaPorDocumento);
router.get('/api/personas/:id', controllerPersona.buscarPersonaPorId);

router.post('/api/personas', controllerPersona.registrarPersona);
router.put('/api/personas/:id', controllerPersona.actualizarPersona);
router.patch('/api/personas/:id/estado', controllerPersona.cambiarEstadoPersona);
router.delete('/api/personas/:id', controllerPersona.eliminarPersona);

// ==========================================================
// API: VEHÍCULOS
// ==========================================================
router.get('/api/vehiculos', controllerVehiculo.listarVehiculos);
router.get('/api/vehiculos/persona/:idPersona', controllerVehiculo.listarVehiculosPorPersona);
router.get('/api/vehiculos/placa/:placa', controllerVehiculo.buscarVehiculoPorPlaca);
router.get('/api/vehiculos/:id', controllerVehiculo.buscarVehiculoPorId);

router.post('/api/vehiculos', controllerVehiculo.registrarVehiculo);
router.put('/api/vehiculos/:id', controllerVehiculo.actualizarVehiculo);
router.patch('/api/vehiculos/:id/estado', controllerVehiculo.cambiarEstadoVehiculo);
router.delete('/api/vehiculos/:id', controllerVehiculo.eliminarVehiculo);

// ==========================================================
// API: USUARIOS + ROLES + SUCURSALES
// ==========================================================
router.get('/api/usuarios/roles', controllerUsuario.listarRoles);
router.get('/api/usuarios', controllerUsuario.listarUsuarios);
router.get('/api/usuarios/rol/:idRol', controllerUsuario.listarUsuariosPorRol);
router.get('/api/usuarios/usuario/:usuario', controllerUsuario.buscarUsuarioPorNombre);
router.get('/api/usuarios/:id', controllerUsuario.buscarUsuarioPorId);

router.post('/api/usuarios', controllerUsuario.registrarUsuario);
router.put('/api/usuarios/:id', controllerUsuario.actualizarUsuario);
router.patch('/api/usuarios/:id/estado', controllerUsuario.cambiarEstadoUsuario);
router.delete('/api/usuarios/:id', controllerUsuario.eliminarUsuario);

router.get('/api/usuarios/:id/sucursales', controllerUsuario.listarSucursalesDeUsuario);
router.put('/api/usuarios/:id/sucursales', controllerUsuario.asignarSucursalesAUsuario);
router.delete('/api/usuarios/:id/sucursales/:idSucursal', controllerUsuario.quitarSucursalAUsuario);

// ==========================================================
// API: MECÁNICOS + SUCURSALES
// ==========================================================
router.get('/api/mecanicos', controllerMecanico.listarMecanicos);
router.get('/api/mecanicos/sucursal/:idSucursal', controllerMecanico.listarMecanicosPorSucursal);
router.get('/api/mecanicos/persona/:idPersona', controllerMecanico.buscarMecanicoPorPersona);
router.get('/api/mecanicos/:id', controllerMecanico.buscarMecanicoPorId);

router.post('/api/mecanicos', controllerMecanico.registrarMecanico);
router.put('/api/mecanicos/:id', controllerMecanico.actualizarMecanico);
router.patch('/api/mecanicos/:id/estado', controllerMecanico.cambiarEstadoMecanico);
router.delete('/api/mecanicos/:id', controllerMecanico.eliminarMecanico);

router.get('/api/mecanicos/:id/sucursales', controllerMecanico.listarSucursalesDeMecanico);
router.put('/api/mecanicos/:id/sucursales', controllerMecanico.asignarSucursalesAMecanico);
router.delete('/api/mecanicos/:id/sucursales/:idSucursal', controllerMecanico.quitarSucursalAMecanico);

// ==========================================================
// API: SUCURSALES
// ==========================================================
router.get('/api/sucursales', controllerSucursal.listarSucursales);
router.get('/api/sucursales/:id', controllerSucursal.buscarSucursalPorId);

// ==========================================================
// API: CATEGORÍAS
// ==========================================================
router.get('/api/categorias', controllerCategoria.listarCategorias);
router.get('/api/categorias/:id', controllerCategoria.buscarCategoriaPorId);

router.post('/api/categorias', controllerCategoria.registrarCategoria);
router.put('/api/categorias/:id', controllerCategoria.actualizarCategoria);
router.patch('/api/categorias/:id/estado', controllerCategoria.cambiarEstadoCategoria);
router.delete('/api/categorias/:id', controllerCategoria.eliminarCategoria);

// ==========================================================
// API: PRODUCTOS + STOCK
// ==========================================================
router.get('/api/productos', controllerProducto.listarProductos);
router.get('/api/productos/sucursal/:idSucursal', controllerProducto.listarProductosPorSucursal);
router.get('/api/productos/codigo/:codigo', controllerProducto.buscarProductoPorCodigo);
router.get('/api/productos/:id/stock/:idSucursal', controllerProducto.obtenerStock);
router.get('/api/productos/:id', controllerProducto.buscarProductoPorId);

router.post('/api/productos', controllerProducto.registrarProducto);
router.put('/api/productos/:id', controllerProducto.actualizarProducto);
router.patch('/api/productos/:id/estado', controllerProducto.cambiarEstadoProducto);
router.delete('/api/productos/:id', controllerProducto.eliminarProducto);

router.post('/api/productos/:id/stock/descontar', controllerProducto.descontarStock);
router.post('/api/productos/:id/stock/aumentar', controllerProducto.aumentarStock);
router.put('/api/productos/:id/stock', controllerProducto.actualizarStock);

// ==========================================================
// API: SERVICIOS + SUCURSALES
// ==========================================================
router.get('/api/servicios', controllerServicio.listarServicios);
router.get('/api/servicios/sucursal/:idSucursal', controllerServicio.listarServiciosPorSucursal);
router.get('/api/servicios/:id/sucursales', controllerServicio.listarSucursalesDeServicio);
router.get('/api/servicios/:id', controllerServicio.buscarServicioPorId);

router.post('/api/servicios', controllerServicio.registrarServicio);
router.put('/api/servicios/:id', controllerServicio.actualizarServicio);
router.patch('/api/servicios/:id/estado', controllerServicio.cambiarEstadoServicio);
router.delete('/api/servicios/:id', controllerServicio.eliminarServicio);

router.put('/api/servicios/:id/sucursales', controllerServicio.asignarSucursalesAServicio);
router.delete('/api/servicios/:id/sucursales/:idSucursal', controllerServicio.quitarSucursalAServicio);

// ==========================================================
// API: CITAS
// ==========================================================
router.get('/api/citas', controllerCita.listarCitas);
router.get('/api/citas/sin-orden', controllerCita.listarCitasSinOrden);
router.get('/api/citas/sucursal/:idSucursal', controllerCita.listarCitasPorSucursal);
router.get('/api/citas/:id', controllerCita.buscarCitaPorId);

router.post('/api/citas', controllerCita.registrarCita);
router.put('/api/citas/:id', controllerCita.actualizarCita);
router.patch('/api/citas/:id/estado', controllerCita.actualizarEstadoCita);
router.delete('/api/citas/:id', controllerCita.eliminarCita);

// ==========================================================
// API: COTIZACIONES + DETALLE
// ==========================================================
router.get('/api/cotizaciones', controllerCotizacion.listarCotizaciones);
router.get('/api/cotizaciones/:id/detalle', controllerCotizacion.buscarCotizacionConDetalle);
router.get('/api/cotizaciones/:id', controllerCotizacion.buscarCotizacionPorId);

router.post('/api/cotizaciones', controllerCotizacion.registrarCotizacion);
router.put('/api/cotizaciones/:id', controllerCotizacion.actualizarCotizacion);
router.put('/api/cotizaciones/:id/detalles', controllerCotizacion.reemplazarDetallesCotizacion);
router.patch('/api/cotizaciones/:id/estado', controllerCotizacion.actualizarEstadoCotizacion);
router.delete('/api/cotizaciones/:id', controllerCotizacion.eliminarCotizacion);

// ==========================================================
// API: ÓRDENES DE TRABAJO (OT)
// ==========================================================
router.get('/api/ordenes', controllerOT.listarOrdenes);
router.get('/api/ordenes/mecanico/:idMecanico', controllerOT.listarOrdenesPorMecanico);
router.get('/api/ordenes/:id/detalle', controllerOT.buscarOrdenConDetalle);
router.get('/api/ordenes/:id', controllerOT.buscarOrdenPorId);

router.post('/api/ordenes', controllerOT.registrarOrden);
router.put('/api/ordenes/:id', controllerOT.actualizarOrden);
router.put('/api/ordenes/:id/detalles', controllerOT.reemplazarDetallesOrden);
router.put('/api/ordenes/:id/mecanicos', controllerOT.asignarMecanicosAOrden);
router.patch('/api/ordenes/:id/estado', controllerOT.cambiarEstadoOrden);
router.delete('/api/ordenes/:id', controllerOT.eliminarOrden);

// ==========================================================
// API: INFORMES + EVIDENCIAS
// ==========================================================
router.get('/api/informes', controllerInforme.listarInformes);
router.get('/api/informes/orden/:idOrden', controllerInforme.buscarInformePorOrden);
router.get('/api/informes/:id/evidencias', controllerInforme.listarEvidencias);
router.get('/api/informes/:id', controllerInforme.buscarInformePorId);

// Con middleware de evidencias (multipart/form-data)
router.post('/api/informes', uploadEvidencias.array('evidencias', 20), controllerInforme.registrarInforme);
router.post('/api/informes/orden/:idOrden', controllerInforme.obtenerOCrearInforme);
router.post('/api/informes/:id/evidencias', uploadEvidencias.array('evidencias', 20), controllerInforme.agregarEvidencias);

router.put('/api/informes/:id', controllerInforme.actualizarInforme);
router.delete('/api/informes/evidencias/:id', controllerInforme.eliminarEvidencia);
router.delete('/api/informes/:id', controllerInforme.eliminarInforme);

// ==========================================================
// API: VENTAS + COMPROBANTES (OV)
// ==========================================================
router.get('/api/ventas', controllerOV.listarOrdenesVenta);
router.get('/api/ventas/persona/:idPersona', controllerOV.listarVentasPorPersona);
router.get('/api/ventas/:id/detalle', controllerOV.buscarOrdenVentaConDetalle);
router.get('/api/ventas/:id', controllerOV.buscarOrdenVentaPorId);

router.post('/api/ventas', controllerOV.registrarVenta);
router.patch('/api/ventas/:id/estado', controllerOV.actualizarEstadoOrdenVenta);
router.delete('/api/ventas/:id', controllerOV.eliminarOrdenVenta);

// Comprobantes
router.get('/api/comprobantes', controllerOV.listarComprobantes);
router.get('/api/comprobantes/siguiente-numero', controllerOV.obtenerSiguienteNumero);
router.get('/api/comprobantes/:id', controllerOV.buscarComprobantePorId);

router.post('/api/comprobantes', controllerOV.emitirComprobante);
router.patch('/api/comprobantes/:id/estado', controllerOV.actualizarEstadoComprobante);

// ==========================================================
// EXPORT
// ==========================================================
module.exports = router;