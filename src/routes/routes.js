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
const controllerTicketOT = require('../controllers/controllerTicketOT');

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
router.get('/api/obtenerPerfil', controllerAuth.obtenerPerfil);

// ==========================================================
// API: PERSONAS
// ==========================================================
router.get('/api/listarPersonas', controllerPersona.listarPersonas);
router.get('/api/listarPersonasPorRol/:idRol', controllerPersona.listarPersonasPorRol);
router.get('/api/buscarPersonaPorDocumento/:tipoDocumento/:documento', controllerPersona.buscarPersonaPorDocumento);
router.get('/api/buscarPersonaPorId/:id', controllerPersona.buscarPersonaPorId);

router.post('/api/registrarPersona', controllerPersona.registrarPersona);
router.put('/api/editarPersona/:id', controllerPersona.actualizarPersona);
router.patch('/api/cambiarEstadoPersona/:id', controllerPersona.cambiarEstadoPersona);
router.delete('/api/eliminarPersona/:id', controllerPersona.eliminarPersona);

// ==========================================================
// API: VEHÍCULOS
// ==========================================================
router.get('/api/listarVehiculos', controllerVehiculo.listarVehiculos);
router.get('/api/listarVehiculosPorPersona/:idPersona', controllerVehiculo.listarVehiculosPorPersona);
router.get('/api/buscarVehiculoPorPlaca/:placa', controllerVehiculo.buscarVehiculoPorPlaca);
router.get('/api/buscarVehiculoPorId/:id', controllerVehiculo.buscarVehiculoPorId);

router.post('/api/registrarVehiculo', controllerVehiculo.registrarVehiculo);
router.put('/api/editarVehiculo/:id', controllerVehiculo.actualizarVehiculo);
router.patch('/api/cambiarEstadoVehiculo/:id', controllerVehiculo.cambiarEstadoVehiculo);
router.delete('/api/eliminarVehiculo/:id', controllerVehiculo.eliminarVehiculo);

// ==========================================================
// API: USUARIOS + ROLES + SUCURSALES
// ==========================================================
router.get('/api/listarRoles', controllerUsuario.listarRoles);
router.get('/api/listarUsuarios', controllerUsuario.listarUsuarios);
router.get('/api/listarUsuariosPorRol/:idRol', controllerUsuario.listarUsuariosPorRol);
router.get('/api/buscarUsuarioPorNombre/:usuario', controllerUsuario.buscarUsuarioPorNombre);
router.get('/api/buscarUsuarioPorId/:id', controllerUsuario.buscarUsuarioPorId);

router.post('/api/registrarUsuario', controllerUsuario.registrarUsuario);
router.put('/api/editarUsuario/:id', controllerUsuario.actualizarUsuario);
router.patch('/api/cambiarEstadoUsuario/:id', controllerUsuario.cambiarEstadoUsuario);
router.delete('/api/eliminarUsuario/:id', controllerUsuario.eliminarUsuario);

router.get('/api/listarSucursalesDeUsuario/:id', controllerUsuario.listarSucursalesDeUsuario);
router.put('/api/asignarSucursalesAUsuario/:id', controllerUsuario.asignarSucursalesAUsuario);
router.delete('/api/quitarSucursalAUsuario/:id/:idSucursal', controllerUsuario.quitarSucursalAUsuario);

// ==========================================================
// API: MECÁNICOS + SUCURSALES
// ==========================================================
router.get('/api/listarMecanicos', controllerMecanico.listarMecanicos);
router.get('/api/listarMecanicosPorSucursal/:idSucursal', controllerMecanico.listarMecanicosPorSucursal);
router.get('/api/buscarMecanicoPorPersona/:idPersona', controllerMecanico.buscarMecanicoPorPersona);
router.get('/api/buscarMecanicoPorId/:id', controllerMecanico.buscarMecanicoPorId);

router.post('/api/registrarMecanico', controllerMecanico.registrarMecanico);
router.put('/api/editarMecanico/:id', controllerMecanico.actualizarMecanico);
router.patch('/api/cambiarEstadoMecanico/:id', controllerMecanico.cambiarEstadoMecanico);
router.delete('/api/eliminarMecanico/:id', controllerMecanico.eliminarMecanico);

router.get('/api/listarSucursalesDeMecanico/:id', controllerMecanico.listarSucursalesDeMecanico);
router.put('/api/asignarSucursalesAMecanico/:id', controllerMecanico.asignarSucursalesAMecanico);
router.delete('/api/quitarSucursalAMecanico/:id/:idSucursal', controllerMecanico.quitarSucursalAMecanico);

// ==========================================================
// API: SUCURSALES
// ==========================================================
router.get('/api/listarSucursales', controllerSucursal.listarSucursales);
router.get('/api/buscarSucursalPorId/:id', controllerSucursal.buscarSucursalPorId);

// ==========================================================
// API: CATEGORÍAS
// ==========================================================
router.get('/api/listarCategorias', controllerCategoria.listarCategorias);
router.get('/api/buscarCategoriaPorId/:id', controllerCategoria.buscarCategoriaPorId);

router.post('/api/registrarCategoria', controllerCategoria.registrarCategoria);
router.put('/api/editarCategoria/:id', controllerCategoria.actualizarCategoria);
router.patch('/api/cambiarEstadoCategoria/:id', controllerCategoria.cambiarEstadoCategoria);
router.delete('/api/eliminarCategoria/:id', controllerCategoria.eliminarCategoria);

// ==========================================================
// API: PRODUCTOS + STOCK
// ==========================================================
router.get('/api/listarProductos', controllerProducto.listarProductos);
router.get('/api/listarProductosPorSucursal/:idSucursal', controllerProducto.listarProductosPorSucursal);
router.get('/api/buscarProductoPorCodigo/:codigo', controllerProducto.buscarProductoPorCodigo);
router.get('/api/obtenerStock/:id/:idSucursal', controllerProducto.obtenerStock);
router.get('/api/buscarProductoPorId/:id', controllerProducto.buscarProductoPorId);

router.post('/api/registrarProducto', controllerProducto.registrarProducto);
router.put('/api/editarProducto/:id', controllerProducto.actualizarProducto);
router.patch('/api/cambiarEstadoProducto/:id', controllerProducto.cambiarEstadoProducto);
router.delete('/api/eliminarProducto/:id', controllerProducto.eliminarProducto);

router.post('/api/descontarStock/:id', controllerProducto.descontarStock);
router.post('/api/aumentarStock/:id', controllerProducto.aumentarStock);
router.put('/api/actualizarStock/:id', controllerProducto.actualizarStock);

// ==========================================================
// API: SERVICIOS + SUCURSALES
// ==========================================================
router.get('/api/listarServicios', controllerServicio.listarServicios);
router.get('/api/listarServiciosPorSucursal/:idSucursal', controllerServicio.listarServiciosPorSucursal);
router.get('/api/listarSucursalesDeServicio/:id', controllerServicio.listarSucursalesDeServicio);
router.get('/api/buscarServicioPorId/:id', controllerServicio.buscarServicioPorId);

router.post('/api/registrarServicio', controllerServicio.registrarServicio);
router.put('/api/editarServicio/:id', controllerServicio.actualizarServicio);
router.patch('/api/cambiarEstadoServicio/:id', controllerServicio.cambiarEstadoServicio);
router.delete('/api/eliminarServicio/:id', controllerServicio.eliminarServicio);

router.put('/api/asignarSucursalesAServicio/:id', controllerServicio.asignarSucursalesAServicio);
router.delete('/api/quitarSucursalAServicio/:id/:idSucursal', controllerServicio.quitarSucursalAServicio);

// ==========================================================
// API: CITAS
// ==========================================================
router.get('/api/listarCitas', controllerCita.listarCitas);
router.get('/api/listarCitasSinOrden', controllerCita.listarCitasSinOrden);
router.get('/api/listarCitasPorSucursal/:idSucursal', controllerCita.listarCitasPorSucursal);
router.get('/api/buscarCitaPorId/:id', controllerCita.buscarCitaPorId);

router.post('/api/registrarCita', controllerCita.registrarCita);
router.put('/api/editarCita/:id', controllerCita.actualizarCita);
router.patch('/api/actualizarEstadoCita/:id', controllerCita.actualizarEstadoCita);
router.delete('/api/eliminarCita/:id', controllerCita.eliminarCita);

// ==========================================================
// API: COTIZACIONES + DETALLE
// ==========================================================
router.get('/api/listarCotizaciones', controllerCotizacion.listarCotizaciones);
router.get('/api/buscarCotizacionConDetalle/:id', controllerCotizacion.buscarCotizacionConDetalle);
router.get('/api/buscarCotizacionPorId/:id', controllerCotizacion.buscarCotizacionPorId);

router.post('/api/registrarCotizacion', controllerCotizacion.registrarCotizacion);
router.put('/api/editarCotizacion/:id', controllerCotizacion.actualizarCotizacion);
router.put('/api/reemplazarDetallesCotizacion/:id', controllerCotizacion.reemplazarDetallesCotizacion);
router.patch('/api/actualizarEstadoCotizacion/:id', controllerCotizacion.actualizarEstadoCotizacion);
router.delete('/api/eliminarCotizacion/:id', controllerCotizacion.eliminarCotizacion);

// ==========================================================
// API: ÓRDENES DE TRABAJO (OT)
// ==========================================================
router.get('/api/listarOrdenes', controllerOT.listarOrdenes);
router.get('/api/listarOrdenesPorMecanico/:idMecanico', controllerOT.listarOrdenesPorMecanico);
router.get('/api/buscarOrdenConDetalle/:id', controllerOT.buscarOrdenConDetalle);
router.get('/api/buscarOrdenPorId/:id', controllerOT.buscarOrdenPorId);

router.post('/api/registrarOrden', controllerOT.registrarOrden);
router.put('/api/editarOrden/:id', controllerOT.actualizarOrden);
router.put('/api/reemplazarDetallesOrden/:id', controllerOT.reemplazarDetallesOrden);
router.put('/api/asignarMecanicosAOrden/:id', controllerOT.asignarMecanicosAOrden);
router.patch('/api/cambiarEstadoOrden/:id', controllerOT.cambiarEstadoOrden);
router.delete('/api/eliminarOrden/:id', controllerOT.eliminarOrden);
// ==========================================================
// API: TICKETS PDF DE ÓRDENES DE TRABAJO
// ==========================================================
router.post('/api/emitirTicketOT/:idOrden', controllerTicketOT.emitirTicketOT);
router.get('/api/buscarTicketOTPorOrden/:idOrden', controllerTicketOT.buscarTicketOTPorOrden);
router.get('/api/buscarTicketOTPorId/:idTicket', controllerTicketOT.buscarTicketOTPorId);
router.get('/api/descargarTicketPDFOT/:idTicket', controllerTicketOT.descargarTicketPDFOT);

// ==========================================================
// API: INFORMES + EVIDENCIAS
// ==========================================================
router.get('/api/listarInformes', controllerInforme.listarInformes);
router.get('/api/buscarInformePorOrden/:idOrden', controllerInforme.buscarInformePorOrden);
router.get('/api/listarEvidencias/:id', controllerInforme.listarEvidencias);
router.get('/api/buscarInformePorId/:id', controllerInforme.buscarInformePorId);

// Con middleware de evidencias (multipart/form-data)
router.post('/api/registrarInforme', uploadEvidencias.array('evidencias', 20), controllerInforme.registrarInforme);
router.post('/api/obtenerOCrearInforme/:idOrden', controllerInforme.obtenerOCrearInforme);
router.post('/api/agregarEvidencias/:id', uploadEvidencias.array('evidencias', 20), controllerInforme.agregarEvidencias);

router.put('/api/editarInforme/:id', controllerInforme.actualizarInforme);
router.delete('/api/eliminarEvidencia/:id', controllerInforme.eliminarEvidencia);
router.delete('/api/eliminarInforme/:id', controllerInforme.eliminarInforme);

// ==========================================================
// API: VENTAS + COMPROBANTES (OV)
// ==========================================================
router.get('/api/listarOrdenesVenta', controllerOV.listarOrdenesVenta);
router.get('/api/listarVentasPorPersona/:idPersona', controllerOV.listarVentasPorPersona);
router.get('/api/buscarOrdenVentaConDetalle/:id', controllerOV.buscarOrdenVentaConDetalle);
router.get('/api/buscarOrdenVentaPorId/:id', controllerOV.buscarOrdenVentaPorId);

router.post('/api/registrarVenta', controllerOV.registrarVenta);
router.patch('/api/actualizarEstadoOrdenVenta/:id', controllerOV.actualizarEstadoOrdenVenta);
router.delete('/api/eliminarOrdenVenta/:id', controllerOV.eliminarOrdenVenta);

// Comprobantes
router.get('/api/listarComprobantes', controllerOV.listarComprobantes);
router.get('/api/obtenerSiguienteNumero', controllerOV.obtenerSiguienteNumero);
router.get('/api/buscarComprobantePorId/:id', controllerOV.buscarComprobantePorId);

router.post('/api/emitirComprobante', controllerOV.emitirComprobante);
router.patch('/api/actualizarEstadoComprobante/:id', controllerOV.actualizarEstadoComprobante);

// ==========================================================
// EXPORT
// ==========================================================
module.exports = router;
