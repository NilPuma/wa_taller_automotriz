// ============================================================
// CONFIGURACION
// ============================================================
const MAX_EVIDENCIAS = 20;
const MAX_MB_EVIDENCIA = 5;

// --- Validaciones ---
const REGEX_CORREO = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/;

// --- Paginación dinámica ---
const OPCIONES_POR_PAGINA = [5, 10, 25, 50, 100];
const DEFAULT_POR_PAGINA  = 5;

// Creación de fragmento para optimizar manipulaciones del DOM
const fragmento = document.createDocumentFragment();

// Capturar los templates de las secciones
const templateDashboard              = document.querySelector('#templateDashboardMecanico').content;
const templateContenedorOrdenes      = document.querySelector('#templateContenedorOrdenes').content;
const templateContenedorAgenda       = document.querySelector('#templateContenedorAgenda').content;
const templateContenedorHistorial    = document.querySelector('#templateContenedorHistorial').content;
const templateContenedorCotizaciones = document.querySelector('#templateContenedorCotizaciones').content;
const templateContenedorCitas        = document.querySelector('#templateContenedorCitas').content;
const templateContenedorClientes     = document.querySelector('#templateContenedorClientes').content;

// Capturar referencia al contenedor principal de renderizado
let contenedorReactivo = document.querySelector('#contenedorReactivo');

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let listadoGeneralPersonas       = [];
let listadoGeneralVehiculos      = [];
let listadoGeneralOrdenes        = [];
let listadoGeneralCotizaciones   = [];
let listadoGeneralCitas          = [];
let listadoGeneralProductos      = [];
let listadoGeneralServicios      = [];
let listadoGeneralMecanicos      = [];
let listadoGeneralInformes       = [];
let listadoGeneralSucursales     = [];
let listadoCitasSinOrden         = [];
let listadoCotizacionesAprobadas = [];

// Contexto
let perfilActual   = null;
let mecanicoActual = null;
let sucursalActual = { id_sucursal: 1, nombre: 'Taller Central', igv: 18.00 };

let ordenActual              = null;
let vehiculoBuscadoOT         = null;
let cotizacionActual         = null;
let citaActual               = null;
let clienteActual            = null;
let vehiculoActualCotizacion = null;
let vehiculosClienteActual   = [];

let itemsCotizacion              = [];
let itemsOT                      = [];
let evidenciasGuardadas          = [];
let evidenciasPendientes         = [];
let archivosEvidenciaPendientes  = [];
let idInformeActual              = null;
let ticketPDFActualURL           = null;
let ticketPDFActualNombre        = 'ticket-ot.pdf';
let ticketPDFActualComprobante   = null;
let ticketPDFActualTipo          = 'general';
let ticketPDFCargando            = false;
let detallesTicketHistorial      = [];
let tipoTicketHistorialActual    = 'general';

// Búsqueda local de servicios / productos
let busquedaServicioCotizacion = '';
let busquedaProductoCotizacion = '';
let busquedaServicioOT         = '';
let busquedaProductoOT         = '';

// Control para reabrir modalVerCliente al cerrar modalNuevoVehiculo
let reabrirVerClienteAlCerrar = false;

// Paginación / filtros de órdenes
let porPaginaOrdenes     = leerPreferencia('porPaginaOrdenes', DEFAULT_POR_PAGINA);
let paginaOrdenesActual  = 1;
let filtroOrdenActual    = 'todas';
let busquedaOrdenActual  = '';

// Historial
let porPaginaHistorial      = leerPreferencia('porPaginaHistorial', DEFAULT_POR_PAGINA);
let paginaHistorialActual   = 1;
let busquedaHistorialActual = '';

// Clientes
let porPaginaClientes     = leerPreferencia('porPaginaClientes', DEFAULT_POR_PAGINA);
let paginaClientesActual  = 1;
let busquedaClienteActual = '';

// Citas
let porPaginaCitas      = leerPreferencia('porPaginaCitas', DEFAULT_POR_PAGINA);
let paginaCitasActual   = 1;
let busquedaCitasActual = '';

// Cotizaciones
let porPaginaCotizaciones    = leerPreferencia('porPaginaCotizaciones', DEFAULT_POR_PAGINA);
let paginaCotizacionesActual = 1;
let filtroCotizacionActual   = 'todas';

// Flags
let _enviandoVehiculo   = false;
let _enviandoCliente    = false;
let _enviandoCita       = false;
let _enviandoCotizacion = false;
let _enviandoOrden      = false;
let _enviandoConsumo    = false;
let _enviandoEvidencias = false;

// Autoguardado de consumo (debounce)
let _autoguardadoConsumoTimer = null;
let _autoguardadoConsumoPendiente = false;
let _ultimoPayloadConsumo = null;

// ============================================================
// HELPERS: PAGINACION
// ============================================================
// Lee una preferencia de paginación y valida que sea una opción permitida.
function leerPreferencia(clave, porDefecto) {
    try {
        const valor = Number(localStorage.getItem(clave));
        if (Number.isFinite(valor) && OPCIONES_POR_PAGINA.includes(valor)) {
            return valor;
        }
    } catch (e) {
        // localStorage no disponible: usar default
    }
    return porDefecto;
}

// Guarda en localStorage la cantidad de registros elegida para una vista.
function guardarPreferencia(clave, valor) {
    try {
        localStorage.setItem(clave, String(valor));
    } catch (e) {
        // silencioso
    }
}

// Actualiza el selector de registros por página al abrir una vista.
function sincronizarSelectPorPagina(vista, valor) {
    const select = document.querySelector('.selector-por-pagina[data-vista="' + vista + '"]');
    if (select) select.value = String(valor);
}

// Muestra qué registros se ven y cuántos existen en total.
function actualizarInfoRango(idInfo, inicio, fin, total) {
    const el = document.querySelector('#' + idInfo);
    if (!el) return;
    if (total === 0) {
        el.textContent = '0–0 de 0';
    } else {
        el.textContent = `${inicio}–${fin} de ${total}`;
    }
}

// Configura el campo de salto directo según la página actual y el total disponible.
function actualizarIrPagina(idInput, pagina, totalPaginas) {
    const el = document.querySelector('#' + idInput);
    if (!el) return;
    el.value = String(pagina);
    el.max = String(totalPaginas);
}

// Actualiza los estados de los controles de paginación.
function actualizarBotonesPaginacion(prefijo, pagina, totalPaginas) {
    const liPrev  = document.querySelector('#li' + prefijo + 'Prev');
    const liNext  = document.querySelector('#li' + prefijo + 'Next');
    const liAct   = document.querySelector('#li' + prefijo + 'PaginaActual');

    if (liPrev) {
        liPrev.dataset.pagina = String(Math.max(1, pagina - 1));
        liPrev.classList.toggle('disabled', pagina <= 1);
    }

    if (liNext) {
        liNext.dataset.pagina = String(Math.min(totalPaginas, pagina + 1));
        liNext.classList.toggle('disabled', pagina >= totalPaginas);
    }

    if (liAct) liAct.dataset.pagina = String(pagina);
}

// ============================================================
// MENU LATERAL
// ============================================================
// Conecta las opciones del menú con las funciones que muestran cada sección.
function enlazarMenu() {
    const menuMap = {
        '#btnMenuInicio':       renderDashboard,
        '#btnMenuOrdenes':      renderOrdenes,
        '#btnMenuAgenda':       renderAgenda,
        '#btnMenuHistorial':    renderHistorial,
        '#btnMenuCotizaciones': renderCotizaciones,
        '#btnMenuCitas':        renderCitas,
        '#btnMenuClientes':     renderClientes
    };

    Object.entries(menuMap).forEach(([selector, fn]) => {
        const btn = document.querySelector(selector);
        if (btn && btn.dataset.menuBound !== '1') {
            btn.dataset.menuBound = '1';
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                fn();
            });
        }
    });

    if (document.body.dataset.sidebarBound === '1') return;
    document.body.dataset.sidebarBound = '1';

// Maneja el evento pointerdown del control #menuBtn.
    document.addEventListener('pointerdown', function (event) {
        const boton = event.target.closest('#menuBtn');
        if (!boton) return;

        const sideMenu  = document.querySelector('#sideMenu');
        const bodyAdmin = document.querySelector('#bodyAdministrador');
        if (!sideMenu || !bodyAdmin) return;

        const expandido = sideMenu.classList.toggle('menu-expandido');
        sideMenu.classList.toggle('menu-colapsado', !expandido);
        bodyAdmin.classList.toggle('body-expandido', expandido);
    });
}

// ============================================================
// ARRANQUE
// ============================================================
// Inicializa menú, alertas y datos antes de mostrar el dashboard.
document.addEventListener('DOMContentLoaded', async () => {
    enlazarMenu();

    const modalTicketPDF = document.querySelector('#modalTicketPDF');
    if (modalTicketPDF) {
        modalTicketPDF.addEventListener('hidden.bs.modal', limpiarTicketPDFActual);
    }

    const btnMenuCerrarSesion = document.querySelector('#btnMenuCerrarSesion');
    if (btnMenuCerrarSesion) {
        btnMenuCerrarSesion.addEventListener('click', function (e) {
            e.preventDefault();
            abrirModal('#modalCerrarSesion');
        });
    }

    const modalNuevoVehiculo = document.querySelector('#modalNuevoVehiculo');
    if (modalNuevoVehiculo) {
        modalNuevoVehiculo.addEventListener('hidden.bs.modal', function () {
            if (reabrirVerClienteAlCerrar) {
                reabrirVerClienteAlCerrar = false;
                abrirModal('#modalVerCliente');
            }
        });
    }

    inicializarToastCerrar();

    await cargarPerfil();
    await cargarSucursal();
    await cargarMecanico();
    await cargarDatosIniciales();

    renderDashboard();

    enlazarMenu();
});

// ============================================================
// FUNCIONES DE CARGA
// ============================================================
// Consulta la sesión actual y redirige al inicio si no se puede validar.
async function cargarPerfil() {
    try {
        const response = await axios.get("/api/obtenerPerfil");
        perfilActual = response.data.usuario;
    } catch (error) {
        console.error(error);
        window.location.href = '/';
    }
}

// Obtiene el registro de mecánico asociado al usuario autenticado.
async function cargarMecanico() {
    if (!perfilActual) return;
    if (perfilActual.id_rol !== 3 || !perfilActual.id_mecanico) return;

    try {
        const response = await axios.get("/api/buscarMecanicoPorId/" + perfilActual.id_mecanico);
        if (response.data.ok) mecanicoActual = response.data.mecanico;
    } catch (error) {
        console.error(error);
    }
}

// Obtiene la sucursal del usuario y usa la sucursal predeterminada como alternativa.
async function cargarSucursal() {
    if (!perfilActual) return;

    try {
        const response = await axios.get("/api/listarSucursalesDeUsuario/" + perfilActual.id_usuario);
        if (response.data.ok && response.data.sucursales && response.data.sucursales.length > 0) {
            sucursalActual = response.data.sucursales[0];
            return;
        }
    } catch (error) {
        console.error(error);
    }

    try {
        const response = await axios.get("/api/buscarSucursalPorId/1");
        if (response.data.ok) sucursalActual = response.data.sucursal;
    } catch (error) {
        console.error(error);
    }
}

// Carga las personas para las vistas y formularios del módulo.
async function cargarPersonas() {
    try {
        const response = await axios.get("/api/listarPersonas");
        listadoGeneralPersonas = [...response.data.personas];
    } catch (error) {
        console.error(error);
    }
}

// Carga la lista general de vehículos.
async function cargarVehiculos() {
    try {
        const response = await axios.get("/api/listarVehiculos");
        listadoGeneralVehiculos = [...response.data.vehiculos];
    } catch (error) {
        console.error(error);
    }
}

// Carga los vehículos asociados a una persona.
async function cargarVehiculosPorPersona(idPersona) {
    try {
        const response = await axios.get("/api/listarVehiculosPorPersona/" + idPersona);
        vehiculosClienteActual = [...response.data.vehiculos];
    } catch (error) {
        console.error(error);
        vehiculosClienteActual = [];
    }
}

// Carga las órdenes asignadas al mecánico autenticado.
async function cargarOrdenes() {
    if (!mecanicoActual) {
        listadoGeneralOrdenes = [];
        return;
    }

    try {
        const response = await axios.get("/api/listarOrdenesPorMecanico/" + mecanicoActual.id_mecanico);
        listadoGeneralOrdenes = [...response.data.ordenes];
    } catch (error) {
        console.error(error);
    }
}

// Carga las cotizaciones disponibles para el módulo.
async function cargarCotizaciones() {
    try {
        const response = await axios.get("/api/listarCotizaciones");
        listadoGeneralCotizaciones = [...response.data.cotizaciones];
    } catch (error) {
        console.error(error);
    }
}

// Carga cotizaciones aprobadas que se pueden asociar a una orden.
async function cargarCotizacionesAprobadas() {
    try {
        const response = await axios.get("/api/listarCotizaciones", {
            params: { estado: 'APROBADA' }
        });
        listadoCotizacionesAprobadas = [...(response.data.cotizaciones || [])];
    } catch (error) {
        console.error(error);
        listadoCotizacionesAprobadas = [];
    }
}

// Carga las citas disponibles para el módulo.
async function cargarCitas() {
    try {
        const response = await axios.get("/api/listarCitas");
        listadoGeneralCitas = [...response.data.citas];
    } catch (error) {
        console.error(error);
    }
}

// Carga citas sin orden de trabajo de la sucursal activa.
async function cargarCitasSinOrden() {
    try {
        const response = await axios.get("/api/listarCitasSinOrden", {
            params: { idSucursal: sucursalActual.id_sucursal }
        });
        listadoCitasSinOrden = [...(response.data.citas || [])];
    } catch (error) {
        console.error(error);
        listadoCitasSinOrden = [];
    }
}

// Carga los productos disponibles en la sucursal activa.
async function cargarProductos() {
    try {
        const response = await axios.get("/api/listarProductosPorSucursal/" + sucursalActual.id_sucursal);
        listadoGeneralProductos = [...response.data.productos];
    } catch (error) {
        console.error(error);
    }
}

// Carga los servicios disponibles en la sucursal activa.
async function cargarServicios() {
    try {
        const response = await axios.get("/api/listarServiciosPorSucursal/" + sucursalActual.id_sucursal);
        listadoGeneralServicios = [...response.data.servicios];
    } catch (error) {
        console.error(error);
    }
}

// Carga los mecánicos para las vistas de selección.
async function cargarMecanicos() {
    try {
        const response = await axios.get("/api/listarMecanicosPorSucursal/" + sucursalActual.id_sucursal);
        listadoGeneralMecanicos = [...response.data.mecanicos];
    } catch (error) {
        console.error(error);
    }
}

// Obtiene el informe y las evidencias vinculados a una orden.
async function cargarInformePorOrden(idOrden) {
    try {
        const response = await axios.get("/api/buscarInformePorOrden/" + idOrden);
        if (response.data.ok && response.data.informe) {
            idInformeActual = response.data.informe.id_informe;
            evidenciasGuardadas = [...(response.data.informe.evidencias || [])];
            listadoGeneralInformes = [response.data.informe];
        } else {
            idInformeActual = null;
            evidenciasGuardadas = [];
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            idInformeActual = null;
            evidenciasGuardadas = [];
            return;
        }
        console.error(error);
    }
}

// Carga las sucursales disponibles.
async function cargarSucursales() {
    try {
        const response = await axios.get("/api/listarSucursales");
        listadoGeneralSucursales = [...response.data.sucursales];
    } catch (error) {
        console.error(error);
    }
}

// Espera las consultas necesarias antes de iniciar la interfaz.
async function cargarDatosIniciales() {
    await Promise.all([
        cargarPersonas(),
        cargarVehiculos(),
        cargarOrdenes(),
        cargarCotizaciones(),
        cargarCitas(),
        cargarProductos(),
        cargarServicios(),
        cargarMecanicos(),
        cargarSucursales()
    ]);
}

// ============================================================
// HELPERS GENERALES
// ============================================================
// Devuelve la fecha actual con el formato usado en el encabezado.
function formatearFechaHoy() {
    const d = new Date();
    const opciones = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('es-PE', opciones);
}

// Convierte una fecha al formato legible que se muestra en pantalla.
function formatearFecha(fechaIso) {
    const d = new Date(fechaIso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Convierte una fecha al formato YYYY-MM-DD.
function fechaISO(fecha) {
    const d = new Date(fecha);
    if (isNaN(d)) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
}

// Selecciona las clases visuales de Bootstrap según el estado.
function claseBadgeEstado(estado) {
    switch (estado) {
        case 'PENDIENTE':   return 'bg-warning text-dark';
        case 'EN PROCESO':  return 'bg-primary';
        case 'FINALIZADA':  return 'bg-success';
        case 'CANCELADA':   return 'bg-danger';
        case 'CONFIRMADA':  return 'bg-info text-dark';
        case 'ATENDIDA':    return 'bg-success';
        case 'APROBADA':    return 'bg-success';
        case 'RECHAZADA':   return 'bg-danger';
        case 'ACTIVO':      return 'bg-success';
        case 'INACTIVO':    return 'bg-secondary';
        default:            return 'bg-secondary';
    }
}

// Calcula el promedio de días de las órdenes finalizadas recibidas.
function calcularTiempoPromedio(finalizadas) {
    if (!finalizadas || finalizadas.length === 0) return '--';

    const hoy = new Date();
    let sumaDias = 0;
    let contador = 0;

    finalizadas.forEach(o => {
        if (!o.fecha_atencion) return;
        const f = new Date(o.fecha_atencion);
        if (isNaN(f)) return;

        const diff = Math.floor((hoy - f) / (1000 * 60 * 60 * 24));
        if (diff >= 0) {
            sumaDias += diff;
            contador++;
        }
    });

    if (contador === 0) return '--';

    const promedio = sumaDias / contador;
    if (promedio < 1) return '< 1 día';
    return `${promedio.toFixed(1)} días`;
}

// Actualiza el texto de un elemento si existe en la vista actual.
function setTexto(selector, valor) {
    const el = document.querySelector(selector);
    if (el) el.textContent = valor;
}

// ============================================================
// HELPERS MODALES
// ============================================================
// Muestra un modal de Bootstrap identificado por su selector.
function abrirModal(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    bootstrap.Modal.getOrCreateInstance(el).show();
}

// Oculta un modal de Bootstrap identificado por su selector.
function cerrarModal(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    bootstrap.Modal.getOrCreateInstance(el).hide();
}

// ============================================================
// SECCION TOASTS
// ============================================================
var toastTimeoutId = null;

// Muestra una notificación temporal con tipo, título y mensaje.
function mostrarToast(tipo, titulo, mensaje) {
    var toast    = document.getElementById('toastCertificado');
    var icono    = document.getElementById('toastIcono');
    var elTitulo = document.getElementById('toastTitulo');
    var elMensaje= document.getElementById('toastMensaje');

    if (!toast || !icono || !elTitulo || !elMensaje) return;

    elTitulo.textContent  = titulo;
    elMensaje.textContent = mensaje;

    var iconosPorTipo = {
        exito: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        info: 'bi-info-circle-fill',
        advertencia: 'bi-exclamation-triangle-fill'
    };

    toast.classList.remove('toast-exito', 'toast-error', 'toast-info', 'toast-advertencia');
    icono.classList.remove('bi-check-circle-fill', 'bi-x-circle-fill', 'bi-info-circle-fill', 'bi-exclamation-triangle-fill');

    toast.classList.add('toast-' + tipo);
    icono.classList.add(iconosPorTipo[tipo] || 'bi-info-circle-fill');

    toast.classList.add('is-visible');

    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(function () {
        toast.classList.remove('is-visible');
    }, 4000);
}

// Conecta el botón que cierra la notificación.
function inicializarToastCerrar() {
    var btnCerrar = document.getElementById('toastCerrar');
    var toast     = document.getElementById('toastCertificado');
    if (!btnCerrar || !toast) return;

    btnCerrar.addEventListener('click', function () {
        toast.classList.remove('is-visible');
        if (toastTimeoutId) clearTimeout(toastTimeoutId);
    });
}

// ============================================================
// VALIDACIONES (NUEVO CLIENTE)
// ============================================================
// Valida el nombre o razón social y el formato del correo del cliente.
function validarCamposCliente(nombreCliente, correo, esRuc = false, apellidos = '', telefono = '') {
    const nombreLimpio = (nombreCliente || '').trim();
    const apellidosLimpios = (apellidos || '').trim();
    const correoLimpio = (correo || '').trim();
    const digitosTelefono = String(telefono || '').replace(/\D/g, '');

    if (nombreLimpio.length < 2 || (!esRuc && !REGEX_NOMBRE.test(nombreLimpio))) {
        mostrarToast('advertencia', esRuc ? 'Razón social inválida' : 'Nombre inválido',
            esRuc ? 'Ingrese una razón social de al menos 2 caracteres.' : 'Ingrese un nombre válido de al menos 2 caracteres.');
        return false;
    }
    if (!esRuc && (apellidosLimpios.length < 2 || !REGEX_NOMBRE.test(apellidosLimpios))) {
        mostrarToast('advertencia', 'Apellido inválido', 'Ingrese apellidos válidos de al menos 2 caracteres.');
        return false;
    }
    if (!REGEX_CORREO.test(correoLimpio)) {
        mostrarToast('advertencia', 'Correo inválido', 'Ingrese un correo con formato válido (ejemplo: usuario@dominio.com).');
        return false;
    }
    if (!/^[+0-9()\s-]+$/.test(String(telefono || '').trim()) || digitosTelefono.length < 7 || digitosTelefono.length > 15) {
        mostrarToast('advertencia', 'Teléfono inválido', 'Ingrese un teléfono con entre 7 y 15 dígitos.');
        return false;
    }
    return true;
}

// ============================================================
// SECCION DASHBOARD
// ============================================================
// Inserta la plantilla del dashboard y pinta sus métricas.
function renderDashboard() {
    if (!contenedorReactivo) return;

    contenedorReactivo.innerHTML = '';
    const clone = templateDashboard.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    pintarDashboard();
}

// Calcula y muestra las métricas de órdenes, citas y cotizaciones.
function pintarDashboard() {
    setTexto('#dashboardFecha', formatearFechaHoy());
    setTexto('#dashboardSucursal', sucursalActual.nombre);

    // Las órdenes cargadas corresponden al mecánico que inició sesión.
    const pendientes  = listadoGeneralOrdenes.filter(o => o.estado === 'PENDIENTE');
    const enProceso   = listadoGeneralOrdenes.filter(o => o.estado === 'EN PROCESO');
    const finalizadas = listadoGeneralOrdenes.filter(o => o.estado === 'FINALIZADA');

    setTexto('#totalOrdenesMecanico', listadoGeneralOrdenes.length);
    setTexto('#totalAsignadas', pendientes.length);
    setTexto('#totalEnProceso', enProceso.length);

    // Las citas y cotizaciones se cuentan solo para la sucursal activa.
    const idSucursalActual = Number(sucursalActual.id_sucursal);
    const citasPendientes = listadoGeneralCitas.filter(cita =>
        cita.estado === 'PENDIENTE' && Number(cita.id_sucursal) === idSucursalActual
    );
    const cotizacionesPendientes = listadoGeneralCotizaciones.filter(cotizacion =>
        cotizacion.estado === 'PENDIENTE' && Number(cotizacion.id_sucursal) === idSucursalActual
    );

    setTexto('#totalCitasPendientes', citasPendientes.length);
    setTexto('#totalCotizacionesPendientes', cotizacionesPendientes.length);

    const hoyIso = fechaISO(new Date());
    const finalizadasHoy = finalizadas.filter(o => {
        if (!o.fecha_atencion) return false;
        return fechaISO(new Date(o.fecha_atencion)) === hoyIso;
    });
    setTexto('#totalFinalizadasHoy', finalizadasHoy.length);

    // Se considera atrasada una orden pendiente cuya fecha de atención ya pasó.
    const ordenesAtrasadas = pendientes.filter(orden => {
        if (!orden.fecha_atencion) return false;

        // Se conserva la fecha YYYY-MM-DD del servidor para evitar desfases por zona horaria.
        const fechaAtencion = String(orden.fecha_atencion).slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(fechaAtencion) && fechaAtencion < hoyIso;
    });
    setTexto('#totalOrdenesAtrasadas', ordenesAtrasadas.length);

    setTexto('#tiempoPromedio', calcularTiempoPromedio(finalizadas));

    listarOrdenesPendientesDashboard(pendientes);
}

// Pinta la tabla de órdenes pendientes del dashboard.
function listarOrdenesPendientesDashboard(pendientes) {
    let contenedor = document.querySelector('#contenedorOrdenesPendientes');
    if (!contenedor) return;
    const templateFila = document.querySelector('#templateFilaOrdenesDashboard').content;
    contenedor.innerHTML = '';

    setTexto('#contadorOrdenesPendientes', pendientes.length);

    pendientes.forEach(orden => {
        templateFila.querySelector('.codigo-orden').textContent =
            'OT-' + String(orden.id_orden_trabajo).padStart(4, '0');
        templateFila.querySelector('.cliente-orden').textContent =
            `${orden.cliente_nombres || ''} ${orden.cliente_apellidos || ''}`.trim();
        templateFila.querySelector('.vehiculo-orden').textContent =
            `${orden.placa || ''} · ${orden.marca || ''} ${orden.modelo || ''}`.trim();
        templateFila.querySelector('.servicio-orden').textContent = orden.observacion || '—';
        templateFila.querySelector('.fecha-orden').textContent =
            orden.fecha_atencion ? formatearFecha(orden.fecha_atencion) : '—';

        const badge = templateFila.querySelector('.estado-orden');
        badge.textContent = orden.estado || '—';
        badge.className = 'estado-orden badge ' + claseBadgeEstado(orden.estado);

        const clone = templateFila.cloneNode(true);
        fragmento.appendChild(clone);
    });

    contenedor.appendChild(fragmento);
}

// ============================================================
// SECCION CLIENTES / VEHICULOS
// ============================================================
// Inserta la vista de clientes y prepara búsqueda y paginación.
function renderClientes() {
    contenedorReactivo.innerHTML = "";
    const clone = templateContenedorClientes.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    paginaClientesActual = 1;
    busquedaClienteActual = '';

    const inputBuscar = document.querySelector('#inputBuscarCliente');
    if (inputBuscar) inputBuscar.value = '';

    sincronizarSelectPorPagina('clientes', porPaginaClientes);

    listarClientes();
}

// Filtra, pagina y pinta las personas en la tabla.
function listarClientes(filtrados) {
    let contenedorTablaClientes = document.querySelector('#contenedorTablaClientes');
    if (!contenedorTablaClientes) return;
    const templateFilaCliente = document.querySelector('#templateFilaCliente').content;
    contenedorTablaClientes.innerHTML = "";

    let base = filtrados;

    if (!base) {
        base = listadoGeneralPersonas;

        if (busquedaClienteActual) {
            const q = busquedaClienteActual.toLowerCase();
            base = base.filter(p => {
                const nombre = `${p.nombres || ''} ${p.apellidos || ''}`.toLowerCase();
                const documento = (p.documento || '').toLowerCase();
                return nombre.includes(q) || documento.includes(q);
            });
        }
    }

    const totalPaginas = Math.max(1, Math.ceil(base.length / porPaginaClientes));
    if (paginaClientesActual > totalPaginas) paginaClientesActual = totalPaginas;
    const inicio = (paginaClientesActual - 1) * porPaginaClientes;
    const pagina = base.slice(inicio, inicio + porPaginaClientes);

    setTexto('#contadorClientes', String(base.length));

    pagina.forEach(persona => {
        const clone = templateFilaCliente.cloneNode(true);

        clone.querySelector('.id-cliente').textContent = persona.id_persona;
        clone.querySelector('.documento-cliente').textContent = persona.documento;
        clone.querySelector('.nombre-cliente').textContent =
            `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
        clone.querySelector('.telefono-cliente').textContent = persona.telefono;
        clone.querySelector('.correo-cliente').textContent = persona.correo;

        clone.querySelector('.btn-ver-cliente').dataset.id = persona.id_persona;
        clone.querySelector('.btn-agregar-vehiculo-cliente').dataset.id = persona.id_persona;

        contenedorTablaClientes.appendChild(clone);
    });

    actualizarPaginacionClientes(paginaClientesActual, totalPaginas, base.length, pagina.length);
}

// Actualiza controles y rango de la paginación de clientes.
function actualizarPaginacionClientes(pagina, totalPaginas, totalRegistros, registrosPagina) {
    const btnNum = document.querySelector('#btnClientesPaginaNumero');
    if (btnNum) btnNum.textContent = String(pagina);

    actualizarBotonesPaginacion('Clientes', pagina, totalPaginas);

    const inicio = totalRegistros === 0 ? 0 : ((pagina - 1) * porPaginaClientes) + 1;
    const fin    = totalRegistros === 0 ? 0 : inicio + registrosPagina - 1;
    actualizarInfoRango('infoRangoClientes', inicio, fin, totalRegistros);
    actualizarIrPagina('inputIrPaginaClientes', pagina, totalPaginas);
}

// Pinta los vehículos asociados al cliente seleccionado.
function listarVehiculosCliente() {
    let contenedorVehiculos = document.querySelector('#contenedorVehiculosCliente');
    if (!contenedorVehiculos) return;
    const templateFilaVehiculo = document.querySelector('#templateFilaVehiculoCliente').content;
    contenedorVehiculos.innerHTML = "";

    const vacio = document.querySelector('#contenedorVacioVehiculosCliente');
    if (vacio) {
        if (vehiculosClienteActual.length === 0) vacio.classList.remove('d-none');
        else vacio.classList.add('d-none');
    }

    vehiculosClienteActual.forEach(vehiculo => {
        const clone = templateFilaVehiculo.cloneNode(true);

        clone.querySelector('.placa-vehiculo').textContent = vehiculo.placa;
        clone.querySelector('.marca-modelo-vehiculo').textContent =
            `${vehiculo.marca || ''} ${vehiculo.modelo || ''}`.trim();
        clone.querySelector('.anio-vehiculo').textContent = vehiculo.anio;
        clone.querySelector('.color-vehiculo').textContent = vehiculo.color;

        const badge = clone.querySelector('.estado-vehiculo');
        badge.textContent = vehiculo.estado;
        badge.className = 'estado-vehiculo badge ' + claseBadgeEstado(vehiculo.estado);

        clone.querySelector('.btn-editar-vehiculo').dataset.id = vehiculo.id_vehiculo;
        clone.querySelector('.btn-eliminar-vehiculo').dataset.id = vehiculo.id_vehiculo;

        contenedorVehiculos.appendChild(clone);
    });
}

// ============================================================
// MODAL VEHICULO: ABRIR (crear / editar)
// ============================================================
// Prepara el formulario para registrar un vehículo de una persona.
function abrirModalCrearVehiculo(persona) {
    if (document.querySelector('#modalVerCliente') && document.querySelector('#modalVerCliente').classList.contains('show')) {
        reabrirVerClienteAlCerrar = true;
        cerrarModal('#modalVerCliente');
    }

    limpiarFormularioVehiculo();

    document.querySelector('#inputModoVehiculo').value = 'crear';
    document.querySelector('#inputIdVehiculoEditar').value = '';
    document.querySelector('#inputIdClienteVehiculo').value = persona.id_persona;

    document.querySelector('#nombreClienteVehiculo').textContent =
        `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
    document.querySelector('#modalNuevoVehiculoLabel').textContent = 'NUEVO VEHÍCULO';

    abrirModal('#modalNuevoVehiculo');
}

// Carga el vehículo seleccionado en el formulario de edición.
function abrirModalEditarVehiculo(persona, vehiculo) {
    if (document.querySelector('#modalVerCliente') && document.querySelector('#modalVerCliente').classList.contains('show')) {
        reabrirVerClienteAlCerrar = true;
        cerrarModal('#modalVerCliente');
    }

    document.querySelector('#inputModoVehiculo').value = 'editar';
    document.querySelector('#inputIdVehiculoEditar').value = vehiculo.id_vehiculo;
    document.querySelector('#inputIdClienteVehiculo').value = persona.id_persona;

    document.querySelector('#nombreClienteVehiculo').textContent =
        `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
    document.querySelector('#modalNuevoVehiculoLabel').textContent = 'EDITAR VEHÍCULO';

    document.querySelector('#inputPlacaVehiculo').value = vehiculo.placa || '';
    document.querySelector('#inputVinVehiculo').value = vehiculo.vin || '';
    document.querySelector('#inputMarcaVehiculo').value = vehiculo.marca || '';
    document.querySelector('#inputModeloVehiculo').value = vehiculo.modelo || '';
    document.querySelector('#inputAnioVehiculo').value = vehiculo.anio || '';
    document.querySelector('#inputColorVehiculo').value = vehiculo.color || '';
    document.querySelector('#inputNumeroMotorVehiculo').value = vehiculo.numero_motor || '';
    document.querySelector('#inputNumeroChasisVehiculo').value = vehiculo.numero_chasis || '';
    document.querySelector('#inputObservacionesVehiculo').value = vehiculo.observaciones || '';

    abrirModal('#modalNuevoVehiculo');
}

// ============================================================
// MODAL VEHICULO: GUARDAR (crear / editar)
// ============================================================
// Envía un vehículo nuevo al servidor y actualiza las listas.
async function guardarVehiculoNuevo(datos) {
    const res = await axios.post('/api/registrarVehiculo', datos);

    if (!res.data.ok) {
        mostrarToast('error', 'Error', res.data.mensaje);
        return false;
    }

    await refrescarVehiculosYTabla();

    cerrarModal('#modalNuevoVehiculo');
    mostrarToast('exito', 'Correcto', res.data.mensaje);
    return true;
}

// Envía los cambios del vehículo al servidor y actualiza las listas.
async function actualizarVehiculo(idVehiculo, datos) {
    const res = await axios.put('/api/editarVehiculo/' + idVehiculo, datos);

    if (!res.data.ok) {
        mostrarToast('error', 'Error', res.data.mensaje);
        return false;
    }

    await refrescarVehiculosYTabla();

    cerrarModal('#modalNuevoVehiculo');
    mostrarToast('exito', 'Correcto', res.data.mensaje);
    return true;
}

// ============================================================
// MODAL VEHICULO: utilidades compartidas
// ============================================================
// Vacía los campos del formulario de vehículo.
function limpiarFormularioVehiculo() {
    document.querySelector('#inputPlacaVehiculo').value = '';
    document.querySelector('#inputVinVehiculo').value = '';
    document.querySelector('#inputMarcaVehiculo').value = '';
    document.querySelector('#inputModeloVehiculo').value = '';
    document.querySelector('#inputAnioVehiculo').value = '';
    document.querySelector('#inputColorVehiculo').value = '';
    document.querySelector('#inputNumeroMotorVehiculo').value = '';
    document.querySelector('#inputNumeroChasisVehiculo').value = '';
    document.querySelector('#inputObservacionesVehiculo').value = '';
}

// Lee y normaliza los datos del formulario de vehículo.
function leerDatosFormularioVehiculo() {
    const idPersona    = document.querySelector('#inputIdClienteVehiculo').value;
    const placa        = document.querySelector('#inputPlacaVehiculo').value.trim().toUpperCase();
    const vin          = document.querySelector('#inputVinVehiculo').value.trim();
    const marca        = document.querySelector('#inputMarcaVehiculo').value.trim();
    const modelo       = document.querySelector('#inputModeloVehiculo').value.trim();
    const anio         = document.querySelector('#inputAnioVehiculo').value;
    const color        = document.querySelector('#inputColorVehiculo').value.trim();
    const numeroMotor  = document.querySelector('#inputNumeroMotorVehiculo').value.trim();
    const numeroChasis = document.querySelector('#inputNumeroChasisVehiculo').value.trim();
    const observaciones = document.querySelector('#inputObservacionesVehiculo').value.trim();

    return {
        id_persona: idPersona,
        placa,
        vin,
        marca,
        modelo,
        anio,
        color,
        numeroMotor,
        numeroChasis,
        observaciones
    };
}

// Comprueba que el formulario del vehículo tenga los datos requeridos.
function validarFormularioVehiculo(datos, idVehiculoActual = null) {
    if (!datos.id_persona || !datos.placa || !datos.vin || !datos.marca || !datos.modelo
        || !datos.anio || !datos.color || !datos.numeroMotor || !datos.numeroChasis) {
        mostrarToast('advertencia', 'Campos incompletos',
            'Placa, VIN, marca, modelo, año, color, N° motor y N° chasis son obligatorios.');
        return false;
    }

    const anio = Number(datos.anio);
    const anioMaximo = new Date().getFullYear() + 1;
    if (!Number.isInteger(anio) || anio < 1900 || anio > anioMaximo) {
        mostrarToast('advertencia', 'Año inválido', 'Ingrese un año entre 1900 y ' + anioMaximo + '.');
        return false;
    }

    if (!/^[A-Z0-9-]{5,10}$/.test(datos.placa)) {
        mostrarToast('advertencia', 'Placa inválida', 'Use entre 5 y 10 letras, números o guiones.');
        return false;
    }

    const duplicado = listadoGeneralVehiculos.find(vehiculo =>
        Number(vehiculo.id_vehiculo) !== Number(idVehiculoActual) &&
        (String(vehiculo.placa || '').trim().toUpperCase() === datos.placa ||
         String(vehiculo.vin || '').trim().toUpperCase() === datos.vin.toUpperCase())
    );
    if (duplicado) {
        mostrarToast('advertencia', 'Vehículo duplicado', 'La placa o el VIN ya están registrados.');
        return false;
    }
    return true;
}

// Forma el objeto de datos que se envía para crear o editar un vehículo.
function construirBodyVehiculo(datos) {
    return {
        id_persona: datos.id_persona,
        placa: datos.placa,
        vin: datos.vin,
        marca: datos.marca,
        modelo: datos.modelo,
        anio: datos.anio ? Number(datos.anio) : null,
        color: datos.color,
        numero_motor: datos.numeroMotor,
        numero_chasis: datos.numeroChasis,
        observaciones: datos.observaciones
    };
}

// Recarga vehículos y actualiza la lista del cliente activo.
async function refrescarVehiculosYTabla() {
    await cargarVehiculos();

    if (clienteActual) {
        await cargarVehiculosPorPersona(clienteActual.id_persona);
        listarVehiculosCliente();
    }
}

// ============================================================
// HANDLERS CLIENTES
// ============================================================
// Maneja el evento click del control #btnNuevoCliente.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('#btnNuevoCliente');
    if (!boton) return;

    limpiarModalNuevoCliente();
    abrirModal('#modalNuevoCliente');
});

// Maneja el evento change del control #chkVehiculoTambien.
document.addEventListener('change', function (event) {
    const chk = event.target.closest('#chkVehiculoTambien');
    if (!chk) return;

    const seccion = document.querySelector('#seccionVehiculoNuevo');
    if (seccion) seccion.classList.toggle('d-none', !chk.checked);
});

// Cambia entre los campos de persona natural y persona jurídica.
document.addEventListener('change', function (event) {
    const selector = event.target.closest('#selectTipoDocumentoCliente');
    if (!selector) return;

    actualizarCamposTipoDocumentoCliente();
});

// Maneja el evento click del control #btnGuardarCliente.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnGuardarCliente');
    if (!boton) return;

    const tipoDocumento = document.querySelector('#selectTipoDocumentoCliente').value;
    const esRuc = tipoDocumento === 'RUC';
    const documento = document.querySelector('#inputDocumentoCliente').value.trim();
    const razonSocial = esRuc
        ? document.querySelector('#inputRazonSocialCliente').value.trim()
        : '';
    const nombres = esRuc
        ? razonSocial
        : document.querySelector('#inputNombresCliente').value.trim();
    const apellidos = esRuc
        ? null
        : document.querySelector('#inputApellidosCliente').value.trim();
    const correo = document.querySelector('#inputCorreoCliente').value.trim();
    const telefono = document.querySelector('#inputTelefonoCliente').value.trim();
    const direccion = document.querySelector('#inputDireccionCliente').value.trim();
    const chkVehiculo = document.querySelector('#chkVehiculoTambien').checked;
    if (_enviandoCliente) return;

    if (!documento || !nombres || (!esRuc && !apellidos) || !correo || !telefono) {
        const persona = esRuc ? 'razón social' : 'nombres, apellidos';
        mostrarToast('advertencia', 'Campos Vacíos',
            'Documento, ' + persona + ', correo y teléfono son obligatorios');
        return;
    }

    const documentoValido = esRuc ? /^\d{11}$/.test(documento) : /^\d{8}$/.test(documento);
    if (!documentoValido) {
        mostrarToast('advertencia', 'Documento inválido',
            esRuc ? 'El RUC debe contener exactamente 11 dígitos.' : 'El DNI debe contener exactamente 8 dígitos.');
        return;
    }

    if (!validarCamposCliente(nombres, correo, esRuc, apellidos, telefono)) return;

    const datosVehiculo = chkVehiculo ? leerDatosVehiculoNuevo() : null;
    if (chkVehiculo && !validarFormularioVehiculo({ ...datosVehiculo, id_persona: 'nuevo' })) return;

    _enviandoCliente = true;
    boton.disabled = true;
    try {
        const res = await axios.post('/api/registrarPersona', {
            tipo_persona: esRuc ? 'JURIDICA' : 'NATURAL',
            tipo_documento: tipoDocumento,
            documento,
            nombres,
            apellidos,
            correo,
            direccion,
            telefono
        });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        const idPersona = res.data.id_persona;

        if (chkVehiculo) {
            const okVehiculo = await guardarVehiculoDesdeModalCliente(idPersona, datosVehiculo);
            if (!okVehiculo) return;
        }

        await cargarPersonas();
        await cargarVehiculos();
        listarClientes();

        limpiarModalNuevoCliente();
        cerrarModal('#modalNuevoCliente');

        mostrarToast('exito', 'Registro Exitoso', 'Cliente registrado correctamente');

    } catch (error) {
        console.error(error);
        const mensaje = error.response?.data?.mensaje || 'No se pudo registrar el cliente.';
        mostrarToast('error', 'Error', mensaje);
    } finally {
        _enviandoCliente = false;
        boton.disabled = false;
    }
});

// Maneja el evento click del control .btn-ver-cliente.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.btn-ver-cliente');
    if (!boton) return;

    const idPersona = boton.dataset.id;
    const persona = listadoGeneralPersonas.find(p => p.id_persona == idPersona);
    if (!persona) {
        mostrarToast('error', 'Error', 'No se encontró el cliente');
        return;
    }

    clienteActual = persona;

    document.querySelector('#inputIdClienteVer').value = persona.id_persona;
    document.querySelector('#verClienteDocumento').textContent = persona.documento;
    document.querySelector('#verClienteTipoDocumento').textContent = persona.tipo_documento;
    document.querySelector('#verClienteNombre').textContent =
        `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
    document.querySelector('#verClienteTelefono').textContent = persona.telefono;
    document.querySelector('#verClienteCorreo').textContent = persona.correo;
    document.querySelector('#verClienteDireccion').textContent = persona.direccion;

    const badge = document.querySelector('#verClienteEstado');
    badge.textContent = persona.estado;
    badge.className = 'badge ' + claseBadgeEstado(persona.estado);

    await cargarVehiculosPorPersona(persona.id_persona);
    listarVehiculosCliente();

    abrirModal('#modalVerCliente');
});

// ============================================================
// HANDLERS VEHICULOS (crear / editar)
// ============================================================
// Maneja el evento click del control #btnAgregarVehiculoCliente.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('#btnAgregarVehiculoCliente');
    if (!boton) return;

    const idPersona = document.querySelector('#inputIdClienteVer').value;
    const persona = listadoGeneralPersonas.find(p => p.id_persona == idPersona);
    if (!persona) return;

    abrirModalCrearVehiculo(persona);
});

// Maneja el evento click del control .btn-agregar-vehiculo-cliente.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-agregar-vehiculo-cliente');
    if (!boton) return;

    const idPersona = boton.dataset.id;
    const persona = listadoGeneralPersonas.find(p => p.id_persona == idPersona);
    if (!persona) return;

    abrirModalCrearVehiculo(persona);
});

// Maneja el evento click del control .btn-editar-vehiculo.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-editar-vehiculo');
    if (!boton) return;

    const idVehiculo = boton.dataset.id;
    const vehiculo = vehiculosClienteActual.find(v => v.id_vehiculo == idVehiculo);
    if (!vehiculo) return;

    const persona = clienteActual;
    if (!persona) return;

    abrirModalEditarVehiculo(persona, vehiculo);
});

// Maneja el evento click del control #btnGuardarVehiculo.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnGuardarVehiculo');
    if (!boton) return;

    if (_enviandoVehiculo) return;
    _enviandoVehiculo = true;

    try {
        const datos = leerDatosFormularioVehiculo();

        const modo = document.querySelector('#inputModoVehiculo').value;
        const idVehiculo = document.querySelector('#inputIdVehiculoEditar').value;
        if (!validarFormularioVehiculo(datos, modo === 'editar' ? idVehiculo : null)) return;

        const body = construirBodyVehiculo(datos);

        if (modo === 'editar') {
            if (!idVehiculo) {
                mostrarToast('error', 'Error', 'No se encontró el vehículo a editar');
                return;
            }
            await actualizarVehiculo(idVehiculo, body);
        } else {
            await guardarVehiculoNuevo(body);
        }

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    } finally {
        _enviandoVehiculo = false;
    }
});

// Maneja el evento click del control .btn-eliminar-vehiculo.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.btn-eliminar-vehiculo');
    if (!boton) return;

    const idVehiculo = boton.dataset.id;
    if (!idVehiculo) return;

    const confirmar = confirm('¿Está seguro de eliminar este vehículo?');
    if (!confirmar) return;

    try {
        const res = await axios.delete('/api/eliminarVehiculo/' + idVehiculo);
        if (res.data.ok) {
            mostrarToast('exito', 'Correcto', res.data.mensaje);
            await refrescarVehiculosYTabla();
        }
    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento input del control #inputBuscarCliente.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarCliente');
    if (!input) return;

    busquedaClienteActual = input.value.trim();
    paginaClientesActual = 1;
    listarClientes();
});

// Maneja el evento keypress del control #inputIrPaginaClientes.
document.addEventListener('keypress', function (event) {
    const input = event.target.closest('#inputIrPaginaClientes');
    if (!input) return;
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const pagina = Number(input.value);
    if (!pagina || isNaN(pagina) || pagina < 1) return;

    const totalPaginas = Math.max(1, Math.ceil(listadoGeneralPersonas.length / porPaginaClientes));
    paginaClientesActual = Math.min(pagina, totalPaginas);
    listarClientes();
});

// ============================================================
// HELPERS: NUEVO CLIENTE
// ============================================================
// Sincroniza los campos visibles y obligatorios con el tipo de documento elegido.
function actualizarCamposTipoDocumentoCliente() {
    const tipoDocumento = document.querySelector('#selectTipoDocumentoCliente');
    if (!tipoDocumento) return;

    const esRuc = tipoDocumento.value === 'RUC';
    const camposNatural = document.querySelector('#camposClienteNatural');
    const camposJuridica = document.querySelector('#camposClienteJuridica');
    const documento = document.querySelector('#inputDocumentoCliente');
    const labelDocumento = document.querySelector('#labelDocumentoCliente');
    const nombres = document.querySelector('#inputNombresCliente');
    const apellidos = document.querySelector('#inputApellidosCliente');
    const razonSocial = document.querySelector('#inputRazonSocialCliente');

    if (camposNatural) camposNatural.classList.toggle('d-none', esRuc);
    if (camposJuridica) camposJuridica.classList.toggle('d-none', !esRuc);
    if (documento) documento.maxLength = esRuc ? 11 : 8;
    if (labelDocumento) {
        labelDocumento.innerHTML = '<i class="bi bi-card-text"></i> ' +
            (esRuc ? 'RUC (11 dígitos)' : 'DNI (8 dígitos)');
    }
    if (nombres) nombres.required = !esRuc;
    if (apellidos) apellidos.required = !esRuc;
    if (razonSocial) razonSocial.required = esRuc;
}

// Restablece los campos del formulario de cliente y vehículo.
function limpiarModalNuevoCliente() {
    document.querySelector('#selectTipoDocumentoCliente').value = 'DNI';
    document.querySelector('#inputDocumentoCliente').value = '';
    document.querySelector('#inputNombresCliente').value = '';
    document.querySelector('#inputApellidosCliente').value = '';
    document.querySelector('#inputRazonSocialCliente').value = '';
    actualizarCamposTipoDocumentoCliente();
    document.querySelector('#inputCorreoCliente').value = '';
    document.querySelector('#inputTelefonoCliente').value = '';
    document.querySelector('#inputDireccionCliente').value = '';

    const chk = document.querySelector('#chkVehiculoTambien');
    if (chk) chk.checked = false;

    const seccion = document.querySelector('#seccionVehiculoNuevo');
    if (seccion) seccion.classList.add('d-none');

    document.querySelector('#inputPlacaNuevo').value = '';
    document.querySelector('#inputVinNuevo').value = '';
    document.querySelector('#inputMarcaNuevo').value = '';
    document.querySelector('#inputModeloNuevo').value = '';
    document.querySelector('#inputAnioNuevo').value = '';
    document.querySelector('#inputColorNuevo').value = '';
    document.querySelector('#inputNumeroMotorNuevo').value = '';
    document.querySelector('#inputNumeroChasisNuevo').value = '';
    document.querySelector('#inputObservacionesNuevo').value = '';
}

// Lee y valida el vehículo opcional antes de registrar al cliente.
function leerDatosVehiculoNuevo() {
    return {
        placa: document.querySelector('#inputPlacaNuevo').value.trim().toUpperCase(),
        vin: document.querySelector('#inputVinNuevo').value.trim(),
        marca: document.querySelector('#inputMarcaNuevo').value.trim(),
        modelo: document.querySelector('#inputModeloNuevo').value.trim(),
        anio: document.querySelector('#inputAnioNuevo').value,
        color: document.querySelector('#inputColorNuevo').value.trim(),
        numeroMotor: document.querySelector('#inputNumeroMotorNuevo').value.trim(),
        numeroChasis: document.querySelector('#inputNumeroChasisNuevo').value.trim(),
        observaciones: document.querySelector('#inputObservacionesNuevo').value.trim()
    };
}

// Registra el vehículo opcional con el ID del cliente recién creado.
async function guardarVehiculoDesdeModalCliente(idPersona, datos) {
    try {
        const res = await axios.post('/api/registrarVehiculo', {
            id_persona: idPersona,
            placa: datos.placa,
            vin: datos.vin,
            marca: datos.marca,
            modelo: datos.modelo,
            anio: Number(datos.anio),
            color: datos.color,
            numero_motor: datos.numeroMotor,
            numero_chasis: datos.numeroChasis,
            observaciones: datos.observaciones
        });
        if (!res.data.ok) {
            mostrarToast('error', 'Error al registrar vehículo', res.data.mensaje || 'Revise los datos del vehículo.');
            return false;
        }
        return true;
    } catch (error) {
        console.error(error);
        mostrarToast('error', 'Error al registrar vehículo', error.response?.data?.mensaje || 'No se pudo registrar el vehículo.');
        return false;
    }
}

// ============================================================
// SECCION CITAS
// ============================================================
// Inserta la vista de citas y prepara búsqueda y paginación.
function renderCitas() {
    contenedorReactivo.innerHTML = "";
    const clone = templateContenedorCitas.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    paginaCitasActual = 1;
    busquedaCitasActual = '';

    const inputBuscar = document.querySelector('#inputBuscarCita');
    if (inputBuscar) inputBuscar.value = '';

    sincronizarSelectPorPagina('citas', porPaginaCitas);

    listarCitas();
    poblarSelectPersonasCita();
}

// Indica si una cita ya está vinculada a una orden de trabajo.
function citaTieneOrden(idCita) {
    return listadoGeneralOrdenes.some(o => Number(o.id_cita) === Number(idCita));
}

// Filtra, pagina y pinta las citas.
function listarCitas(filtradas) {
    let contenedorTablaCitas = document.querySelector('#contenedorTablaCitas');
    if (!contenedorTablaCitas) return;
    const templateFilaCita = document.querySelector('#templateFilaCita').content;
    contenedorTablaCitas.innerHTML = "";

    let base = filtradas;

    if (!base) {
        base = listadoGeneralCitas;

        if (busquedaCitasActual) {
            const q = busquedaCitasActual.toLowerCase();
            base = base.filter(c => {
                const nombre = `${c.cliente_nombres || ''} ${c.cliente_apellidos || ''}`.toLowerCase();
                const telefono = (c.cliente_telefono || '').toLowerCase();
                const placa = (c.placa || '').toLowerCase();
                return nombre.includes(q) || telefono.includes(q) || placa.includes(q);
            });
        }
    }

    const totalPaginas = Math.max(1, Math.ceil(base.length / porPaginaCitas));
    if (paginaCitasActual > totalPaginas) paginaCitasActual = totalPaginas;
    const inicio = (paginaCitasActual - 1) * porPaginaCitas;
    const pagina = base.slice(inicio, inicio + porPaginaCitas);

    pagina.forEach(cita => {
        const clone = templateFilaCita.cloneNode(true);

        const tieneOrden = citaTieneOrden(cita.id_cita);

        clone.querySelector('.id-cita').textContent = cita.id_cita;
        clone.querySelector('.cliente-cita').textContent =
            `${cita.cliente_nombres || ''} ${cita.cliente_apellidos || ''}`.trim();
        clone.querySelector('.telefono-cita').textContent = cita.cliente_telefono;
        clone.querySelector('.vehiculo-cita').textContent =
            `${cita.placa || ''} · ${cita.marca || ''} ${cita.modelo || ''}`.trim();
        clone.querySelector('.fecha-cita').textContent =
            cita.fecha_cita ? formatearFecha(cita.fecha_cita) : '—';
        clone.querySelector('.hora-cita').textContent = cita.hora_cita;

        const badge = clone.querySelector('.estado-cita');
        badge.textContent = cita.estado;
        badge.className = 'estado-cita badge ' + claseBadgeEstado(cita.estado);

        const btnVer      = clone.querySelector('.btn-ver-cita');
        const btnTomar    = clone.querySelector('.btn-tomar-cita');
        const btnCancelar = clone.querySelector('.btn-cancelar-cita');
        const btnEliminar = clone.querySelector('.btn-eliminar-cita');

        btnVer.dataset.id      = cita.id_cita;
        btnTomar.dataset.id    = cita.id_cita;
        btnCancelar.dataset.id = cita.id_cita;
        btnEliminar.dataset.id = cita.id_cita;

        const estado = cita.estado || '';

        // 1) Ver: siempre visible (único botón que NUNCA se oculta)
        btnVer.classList.remove('d-none');
        btnVer.disabled = false;

        // 2) Tomar: solo si PENDIENTE y sin orden asociada
        if (estado === 'PENDIENTE' && !tieneOrden) {
            btnTomar.classList.remove('d-none');
            btnTomar.disabled = false;
        } else {
            btnTomar.classList.add('d-none');
        }

        // 3) Cancelar: solo si PENDIENTE o CONFIRMADA y sin orden asociada
        if ((estado === 'PENDIENTE' || estado === 'CONFIRMADA') && !tieneOrden) {
            btnCancelar.classList.remove('d-none');
            btnCancelar.disabled = false;
        } else {
            btnCancelar.classList.add('d-none');
        }

        // 4) Eliminar: solo si NO ATENDIDA y sin orden asociada
        if (estado !== 'ATENDIDA' && !tieneOrden) {
            btnEliminar.classList.remove('d-none');
            btnEliminar.disabled = false;
        } else {
            btnEliminar.classList.add('d-none');
        }

        contenedorTablaCitas.appendChild(clone);
    });

    actualizarPaginacionCitas(paginaCitasActual, totalPaginas, base.length, pagina.length);
}

// Actualiza controles y rango de la paginación de citas.
function actualizarPaginacionCitas(pagina, totalPaginas, totalRegistros, registrosPagina) {
    const btnNum = document.querySelector('#btnCitasPaginaNumero');
    if (btnNum) btnNum.textContent = String(pagina);

    actualizarBotonesPaginacion('Citas', pagina, totalPaginas);

    const inicio = totalRegistros === 0 ? 0 : ((pagina - 1) * porPaginaCitas) + 1;
    const fin    = totalRegistros === 0 ? 0 : inicio + registrosPagina - 1;
    actualizarInfoRango('infoRangoCitas', inicio, fin, totalRegistros);
    actualizarIrPagina('inputIrPaginaCitas', pagina, totalPaginas);
}

// Carga personas en el selector del formulario de cita.
function poblarSelectPersonasCita() {
    const select = document.querySelector('#selectPersonaCita');
    if (!select) return;

    const opciones = select.querySelectorAll('option:not([disabled])');
    opciones.forEach(o => o.remove());

    const templateOption = document.querySelector('#templateOptionPersona').content;

    listadoGeneralPersonas.forEach(persona => {
        const clone = templateOption.cloneNode(true);
        const option = clone.querySelector('option');
        option.value = persona.id_persona;
        option.textContent = `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
        select.appendChild(clone);
    });
}

// Carga los vehículos pertenecientes a una persona en el selector.
async function poblarSelectVehiculosCita(idPersona) {
    const select = document.querySelector('#selectVehiculoCita');
    if (!select) return;

    const opciones = select.querySelectorAll('option:not([disabled])');
    opciones.forEach(o => o.remove());

    if (!idPersona) return;

    await cargarVehiculosPorPersona(idPersona);

    const templateOption = document.querySelector('#templateOptionVehiculo').content;

    vehiculosClienteActual.forEach(vehiculo => {
        const clone = templateOption.cloneNode(true);
        const option = clone.querySelector('option');
        option.value = vehiculo.id_vehiculo;
        option.textContent = `${vehiculo.placa} · ${vehiculo.marca || ''} ${vehiculo.modelo || ''}`.trim();
        select.appendChild(clone);
    });
}

// Maneja el evento change del control #selectPersonaCita.
document.addEventListener('change', async function (event) {
    const select = event.target.closest('#selectPersonaCita');
    if (!select) return;

    await poblarSelectVehiculosCita(select.value);
});

// Maneja el evento click del control #btnNuevaCita.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('#btnNuevaCita');
    if (!boton) return;

    limpiarModalNuevaCita();
    poblarSelectPersonasCita();
    abrirModal('#modalNuevaCita');
});

// Abre una cita nueva con cliente y vehículo de la cotización seleccionada.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnAgendarCitaCotizacion');
    if (!boton || !cotizacionActual) return;

    const cot = cotizacionActual;
    const citaActiva = listadoGeneralCitas.find(cita =>
        Number(cita.id_vehiculo) === Number(cot.id_vehiculo) &&
        Number(cita.id_sucursal) === Number(sucursalActual.id_sucursal) &&
        ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA'].includes(String(cita.estado || '').toUpperCase()) &&
        Number(cita.tiene_ot) !== 1 && !citaTieneOrden(cita.id_cita)
    );
    if (citaActiva) {
        mostrarToast('advertencia', 'Cita activa existente', 'El vehículo ya tiene la cita #' + citaActiva.id_cita + ' activa.');
        return;
    }

    limpiarModalNuevaCita();
    poblarSelectPersonasCita();
    document.querySelector('#selectPersonaCita').value = cot.id_persona;
    await poblarSelectVehiculosCita(cot.id_persona);
    document.querySelector('#selectVehiculoCita').value = cot.id_vehiculo;
    document.querySelector('#inputMotivoCita').value = 'Seguimiento de cotización COT-' + String(cot.id_cotizacion).padStart(4, '0');

    const contexto = document.querySelector('#contextoCitaCotizacion');
    if (contexto) {
        contexto.textContent = 'Cliente y vehículo cargados desde la cotización. La cita se guardará como registro independiente.';
        contexto.classList.remove('d-none');
    }
    abrirModal('#modalNuevaCita');
});

// Valida que la cita no se programe en el pasado.
function validarFechaHoraCita(fecha, hora) {
    if (!fecha || !hora) {
        mostrarToast('advertencia', 'Falta fecha u hora', 'Seleccione la fecha y la hora de la cita.');
        return false;
    }
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const [horas, minutos] = hora.split(':').map(Number);
    const seleccionada = new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
    if (Number.isNaN(seleccionada.getTime())) {
        mostrarToast('advertencia', 'Fecha u hora inválida', 'Revise la fecha y la hora seleccionadas.');
        return false;
    }
    if (seleccionada < new Date()) {
        mostrarToast('advertencia', 'Fecha u hora pasada', 'La cita debe programarse para ahora o una fecha futura.');
        return false;
    }
    return true;
}

// Maneja el evento click del control #btnRegistrarCita.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnRegistrarCita');
    if (!boton) return;

    if (_enviandoCita) return;
    _enviandoCita = true;

    try {
        const idPersona = document.querySelector('#selectPersonaCita').value;
        const idVehiculo = document.querySelector('#selectVehiculoCita').value;
        const fechaCita  = document.querySelector('#inputFechaCita').value;
        const horaCita   = document.querySelector('#inputHoraCita').value;
        const motivo     = document.querySelector('#inputMotivoCita').value.trim();

        if (!idPersona || !idVehiculo) {
            mostrarToast('advertencia', 'Faltan datos', 'Seleccione un cliente y un vehículo para la cita.');
            return;
        }
        if (!validarFechaHoraCita(fechaCita, horaCita)) return;

        await cargarCitas();
        const citaActiva = listadoGeneralCitas.find(cita =>
            Number(cita.id_vehiculo) === Number(idVehiculo) && Number(cita.id_sucursal) === Number(sucursalActual.id_sucursal) &&
            ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA'].includes(String(cita.estado || '').toUpperCase()) &&
            Number(cita.tiene_ot) !== 1 && !citaTieneOrden(cita.id_cita)
        );
        if (citaActiva) {
            mostrarToast('advertencia', 'Cita activa existente', 'El vehículo ya tiene la cita #' + citaActiva.id_cita + ' activa.');
            return;
        }

        const res = await axios.post('/api/registrarCita', {
            id_persona: idPersona,
            id_sucursal: sucursalActual.id_sucursal,
            id_vehiculo: idVehiculo,
            fecha_cita: fechaCita,
            hora_cita: horaCita,
            motivo
        });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        await cargarCitas();
        listarCitas();

        limpiarModalNuevaCita();
        cerrarModal('#modalNuevaCita');

        mostrarToast('exito', 'Registro Exitoso', 'Cita registrada correctamente');

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    } finally {
        _enviandoCita = false;
    }
});

// Prepara una cotización con los datos de la cita seleccionada.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnCrearCotizacionDesdeCita');
    if (!boton || !citaActual) return;

    const cita = citaActual;
    const cotActiva = listadoGeneralCotizaciones.find(cot =>
        Number(cot.id_vehiculo) === Number(cita.id_vehiculo) &&
        Number(cot.id_sucursal) === Number(cita.id_sucursal || sucursalActual.id_sucursal) &&
        ['PENDIENTE', 'APROBADA'].includes(String(cot.estado || '').toUpperCase()) &&
        Number(cot.tiene_ot) !== 1
    );
    if (cotActiva) {
        const codigo = 'COT-' + String(cotActiva.id_cotizacion).padStart(4, '0');
        mostrarToast('advertencia', 'Cotización activa existente', 'El vehículo ya tiene la cotización ' + codigo + ' activa.');
        return;
    }

    try {
        const respuesta = await axios.get('/api/buscarVehiculoPorId/' + cita.id_vehiculo);
        const vehiculo = respuesta.data && respuesta.data.vehiculo;
        if (!respuesta.data.ok || !vehiculo) throw new Error('No se pudo cargar el vehículo de la cita.');

        cerrarModal('#modalVerCita');
        renderCotizaciones();
        clienteActual = { id_persona: cita.id_persona, nombres: cita.cliente_nombres, apellidos: cita.cliente_apellidos, correo: cita.cliente_correo, telefono: cita.cliente_telefono };
        vehiculoActualCotizacion = vehiculo;
        mostrarInfoClienteCotizacion(clienteActual, vehiculo);
        document.querySelector('#inputPlacaCotizacion').value = vehiculo.placa || cita.placa || '';
        document.querySelector('#textareaObservacionesCotizacion').value = cita.motivo || '';
        mostrarToast('exito', 'Cotización preparada', 'Cliente y vehículo cargados. Añada los productos o servicios antes de generarla.');
    } catch (error) {
        console.error(error);
        const mensaje = error.response && error.response.data && error.response.data.mensaje;
        mostrarToast('error', 'No se pudo preparar la cotización', mensaje || error.message);
    }
});

// Maneja el evento click del control .btn-ver-cita.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.btn-ver-cita');
    if (!boton) return;

    const idCita = boton.dataset.id;

    try {
        const res = await axios.get('/api/buscarCitaPorId/' + idCita);
        if (!res.data.ok || !res.data.cita) {
            mostrarToast('error', 'Error', 'No se pudo obtener la cita');
            return;
        }

        const cita = res.data.cita;
        citaActual = cita;

        document.querySelector('#verCitaId').value = cita.id_cita;
        document.querySelector('#verCitaCodigo').textContent = cita.id_cita;
        document.querySelector('#verCitaFecha').textContent =
            cita.fecha_cita ? formatearFecha(cita.fecha_cita) : '—';
        document.querySelector('#verCitaHora').textContent = cita.hora_cita;

        const badge = document.querySelector('#verCitaEstado');
        badge.textContent = cita.estado;
        badge.className = 'badge ' + claseBadgeEstado(cita.estado);

        document.querySelector('#verCitaClienteDocumento').textContent = cita.documento || '—';
        document.querySelector('#verCitaClienteNombre').textContent =
            `${cita.cliente_nombres || ''} ${cita.cliente_apellidos || ''}`.trim();
        document.querySelector('#verCitaClienteTelefono').textContent = cita.cliente_telefono || '—';
        document.querySelector('#verCitaClienteCorreo').textContent = cita.cliente_correo || '—';
        document.querySelector('#verCitaClienteDireccion').textContent = cita.cliente_direccion || '—';

        document.querySelector('#verCitaVehiculoPlaca').textContent = cita.placa || '—';
        document.querySelector('#verCitaVehiculoMarcaModelo').textContent =
            `${cita.marca || ''} ${cita.modelo || ''}`.trim() || '—';
        document.querySelector('#verCitaVehiculoAnio').textContent = cita.anio || '—';
        document.querySelector('#verCitaVehiculoColor').textContent = cita.color || '—';
        document.querySelector('#verCitaVehiculoVin').textContent = cita.vin || '—';
        document.querySelector('#verCitaSucursal').textContent = cita.sucursal_nombre || '—';

        document.querySelector('#verCitaMotivo').textContent = cita.motivo || '—';

        abrirModal('#modalVerCita');

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control .btn-tomar-cita.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.btn-tomar-cita');
    if (!boton) return;

    const idCita = boton.dataset.id;

    const cita = listadoGeneralCitas.find(c => Number(c.id_cita) === Number(idCita));
    if (cita) {
        if (cita.estado !== 'PENDIENTE') {
            mostrarToast('advertencia', 'No permitido', 'Solo puede tomar citas pendientes');
            return;
        }
        if (citaTieneOrden(idCita)) {
            mostrarToast('advertencia', 'No permitido', 'Esta cita ya tiene una orden de trabajo asociada');
            return;
        }
    }

    const confirmar = confirm('¿Desea confirmar (tomar) esta cita?');
    if (!confirmar) return;

    try {
        const res = await axios.patch('/api/actualizarEstadoCita/' + idCita, { estado: 'CONFIRMADA' });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        await cargarCitas();
        listarCitas();

        mostrarToast('exito', 'Correcto', 'Cita confirmada correctamente');

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control .btn-cancelar-cita.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.btn-cancelar-cita');
    if (!boton) return;

    const idCita = boton.dataset.id;

    if (citaTieneOrden(idCita)) {
        mostrarToast('advertencia', 'No permitido', 'Esta cita ya tiene una orden de trabajo asociada');
        return;
    }

    const confirmar = confirm('¿Está seguro de cancelar esta cita?');
    if (!confirmar) return;

    try {
        const res = await axios.patch('/api/actualizarEstadoCita/' + idCita, { estado: 'CANCELADA' });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        await cargarCitas();
        listarCitas();

        mostrarToast('exito', 'Correcto', 'Cita cancelada correctamente');

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control .btn-eliminar-cita.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.btn-eliminar-cita');
    if (!boton) return;

    const idCita = boton.dataset.id;

    const cita = listadoGeneralCitas.find(c => Number(c.id_cita) === Number(idCita));
    if (cita && cita.estado === 'ATENDIDA') {
        mostrarToast('advertencia', 'No permitido', 'No se puede eliminar una cita atendida');
        return;
    }

    if (citaTieneOrden(idCita)) {
        mostrarToast('advertencia', 'No permitido', 'No se puede eliminar una cita con orden de trabajo asociada');
        return;
    }

    const confirmar = confirm('¿Está seguro de eliminar esta cita?');
    if (!confirmar) return;

    try {
        const res = await axios.delete('/api/eliminarCita/' + idCita);

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        await cargarCitas();
        listarCitas();

        mostrarToast('exito', 'Correcto', 'Cita eliminada correctamente');

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento input del control #inputBuscarCita.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarCita');
    if (!input) return;

    busquedaCitasActual = input.value.trim();
    paginaCitasActual = 1;
    listarCitas();
});

// Maneja el evento keypress del control #inputIrPaginaCitas.
document.addEventListener('keypress', function (event) {
    const input = event.target.closest('#inputIrPaginaCitas');
    if (!input) return;
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const pagina = Number(input.value);
    if (!pagina || isNaN(pagina) || pagina < 1) return;

    const totalPaginas = Math.max(1, Math.ceil(listadoGeneralCitas.length / porPaginaCitas));
    paginaCitasActual = Math.min(pagina, totalPaginas);
    listarCitas();
});

// Restablece el formulario de nueva cita.
function limpiarModalNuevaCita() {
    document.querySelector('#selectPersonaCita').value = '';
    const contexto = document.querySelector('#contextoCitaCotizacion');
    if (contexto) { contexto.textContent = ''; contexto.classList.add('d-none'); }

    const selectVehiculo = document.querySelector('#selectVehiculoCita');
    const opciones = selectVehiculo.querySelectorAll('option:not([disabled])');
    opciones.forEach(o => o.remove());

    document.querySelector('#inputFechaCita').value = '';
    document.querySelector('#inputHoraCita').value = '';
    document.querySelector('#inputMotivoCita').value = '';
}

// ============================================================
// SECCION COTIZACIONES
// ============================================================
// Inserta la vista de cotizaciones y prepara sus filtros.
function renderCotizaciones() {
    contenedorReactivo.innerHTML = "";
    const clone = templateContenedorCotizaciones.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    itemsCotizacion = [];
    cotizacionActual = null;
    clienteActual = null;
    vehiculoActualCotizacion = null;

    paginaCotizacionesActual = 1;
    filtroCotizacionActual = 'todas';

    const btnTodasCot = document.querySelector('.filtro-cotizacion[data-filtro="todas"]');
    if (btnTodasCot) {
        document.querySelectorAll('.filtro-cotizacion').forEach(b => b.classList.remove('active'));
        btnTodasCot.classList.add('active');
    }

    busquedaServicioCotizacion = '';
    busquedaProductoCotizacion = '';
    const inpServCot = document.querySelector('#inputBuscarServicioCotizacion');
    if (inpServCot) inpServCot.value = '';
    const inpProdCot = document.querySelector('#inputBuscarProductoCotizacion');
    if (inpProdCot) inpProdCot.value = '';

    sincronizarSelectPorPagina('cotizaciones', porPaginaCotizaciones);

    poblarListasDisponiblesCotizacion();

    document.querySelector('#inputFechaCotizacion').value = fechaISO(new Date());

    listarCotizacionesSidebar();
    listarItemsCotizacion();
    recalcularTotalesCotizacion();
}

// Filtra, pagina y pinta cotizaciones en el panel lateral.
function listarCotizacionesSidebar(filtradas) {
    let contenedor = document.querySelector('#contenedorListaCotizaciones');
    if (!contenedor) return;
    const templateFilaCotizacion = document.querySelector('#templateFilaCotizacion').content;
    contenedor.innerHTML = "";

    let base = filtradas || listadoGeneralCotizaciones;

    if (!filtradas && filtroCotizacionActual && filtroCotizacionActual !== 'todas') {
        const estadoMap = {
            aprobada: 'APROBADA',
            pendiente: 'PENDIENTE',
            rechazada: 'RECHAZADA'
        };
        const estadoBuscado = estadoMap[filtroCotizacionActual];
        if (estadoBuscado) {
            base = base.filter(c => c.estado === estadoBuscado);
        }
    }

    const totalPaginas = Math.max(1, Math.ceil(base.length / porPaginaCotizaciones));
    if (paginaCotizacionesActual > totalPaginas) paginaCotizacionesActual = totalPaginas;
    const inicio = (paginaCotizacionesActual - 1) * porPaginaCotizaciones;
    const pagina = base.slice(inicio, inicio + porPaginaCotizaciones);

    setTexto('#contadorCotizaciones', String(base.length));

    const vacio = document.querySelector('#contenedorVacioPlaca');
    if (vacio) {
        if (base.length === 0) vacio.classList.remove('d-none');
        else vacio.classList.add('d-none');
    }

    pagina.forEach(cot => {
        const clone = templateFilaCotizacion.cloneNode(true);

        clone.querySelector('.codigo-cotizacion').textContent =
            'COT-' + String(cot.id_cotizacion).padStart(4, '0');

        clone.querySelector('.cliente-cotizacion').textContent =
            `${cot.cliente_nombres || ''} ${cot.cliente_apellidos || ''}`.trim();
        clone.querySelector('.vehiculo-cotizacion').textContent =
            `${cot.placa || ''} · ${cot.marca || ''} ${cot.modelo || ''}`.trim();

        clone.querySelector('.monto-cotizacion').textContent =
            'S/ ' + Number(cot.monto_cotizacion || 0).toFixed(2);
        clone.querySelector('.fecha-cotizacion').textContent =
            cot.fecha_cotizacion ? formatearFecha(cot.fecha_cotizacion) : '—';

        const badge = clone.querySelector('.estado-cotizacion');
        badge.textContent = cot.estado || '—';
        badge.className = 'estado-cotizacion badge ' + claseBadgeEstado(cot.estado);

        const badgeOcupada = clone.querySelector('.ocupada-cotizacion');
        if (cot.tiene_ot) badgeOcupada.classList.remove('d-none');
        else badgeOcupada.classList.add('d-none');

        const btnAprobar   = clone.querySelector('.btn-aprobar-cotizacion');
        const btnRechazar  = clone.querySelector('.btn-rechazar-cotizacion');
        const btnPendiente = clone.querySelector('.btn-pendiente-cotizacion');
        const itemCot      = clone.querySelector('.item-cotizacion');

        btnAprobar.dataset.id   = cot.id_cotizacion;
        btnRechazar.dataset.id  = cot.id_cotizacion;
        btnPendiente.dataset.id = cot.id_cotizacion;
        itemCot.dataset.id      = cot.id_cotizacion;

        const soloLectura = Boolean(cot.tiene_ot) || cot.estado === 'APROBADA';

        [btnAprobar, btnRechazar, btnPendiente].forEach(btn => {
            if (soloLectura) {
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.title = cot.tiene_ot
                    ? 'Cotización con orden de trabajo asociada (solo lectura)'
                    : 'Cotización aprobada (solo lectura)';
            } else {
                btn.disabled = false;
                btn.classList.remove('disabled');
                btn.title = '';
            }
        });

        if (cotizacionActual && Number(cotizacionActual.id_cotizacion) === Number(cot.id_cotizacion)) {
            itemCot.classList.add('active');
        }

        contenedor.appendChild(clone);
    });

    actualizarPaginacionCotizaciones(paginaCotizacionesActual, totalPaginas, base.length, pagina.length);
}

// Actualiza controles y rango de la paginación de cotizaciones.
function actualizarPaginacionCotizaciones(pagina, totalPaginas, totalRegistros, registrosPagina) {
    const btnNum = document.querySelector('#btnCotizacionesPaginaNumero');
    if (btnNum) btnNum.textContent = String(pagina);

    actualizarBotonesPaginacion('Cotizaciones', pagina, totalPaginas);

    const inicio = totalRegistros === 0 ? 0 : ((pagina - 1) * porPaginaCotizaciones) + 1;
    const fin    = totalRegistros === 0 ? 0 : inicio + registrosPagina - 1;
    actualizarInfoRango('infoRangoCotizaciones', inicio, fin, totalRegistros);
    actualizarIrPagina('inputIrPaginaCotizaciones', pagina, totalPaginas);
}

// Pinta productos y servicios de la cotización actual.
function listarItemsCotizacion() {
    let contenedor = document.querySelector('#contenedorItemsCotizacion');
    if (!contenedor) return;
    const templateFilaItem = document.querySelector('#templateFilaItemCotizacion').content;
    contenedor.innerHTML = "";

    const hayItems = itemsCotizacion.length > 0;

    const vacio = document.querySelector('#contenedorVacioItemsCotizacion');
    if (vacio) {
        if (hayItems) vacio.classList.add('d-none');
        else vacio.classList.remove('d-none');
    }

    const tabla = document.querySelector('#contenedorTablaItemsCotizacion');
    if (tabla) {
        if (hayItems) tabla.classList.remove('d-none');
        else tabla.classList.add('d-none');
    }

    itemsCotizacion.forEach((item, index) => {
        const clone = templateFilaItem.cloneNode(true);

        clone.querySelector('.tipo-item').textContent = item.tipo;
        clone.querySelector('.descripcion-item').textContent = item.descripcion;

        const inputCant = clone.querySelector('.input-cantidad-item');
        inputCant.value = item.cantidad;
        inputCant.dataset.index = index;

        clone.querySelector('.precio-item').textContent = 'S/ ' + Number(item.precio_unitario).toFixed(2);
        clone.querySelector('.subtotal-item').textContent = 'S/ ' + Number(item.subtotal).toFixed(2);

        clone.querySelector('.btn-restar-item').dataset.index = index;
        clone.querySelector('.btn-sumar-item').dataset.index = index;
        clone.querySelector('.btn-quitar-item').dataset.index = index;

        contenedor.appendChild(clone);
    });
}

// Carga las listas de servicios y productos para cotizar.
function poblarListasDisponiblesCotizacion() {
    poblarListaServiciosDisponibles();
    poblarListaProductosDisponibles();
}

// Pinta servicios disponibles para añadir a la cotización.
function poblarListaServiciosDisponibles() {
    let contenedor = document.querySelector('#listaServiciosDisponibles');
    if (!contenedor) return;

    const wrap = document.querySelector('#contenedorResultadosServiciosCotizacion');
    const vacio = document.querySelector('#contenedorVacioServiciosDisponibles');
    if (!wrap || !vacio) return;

    const q = busquedaServicioCotizacion.toLowerCase().trim();

    // Sin búsqueda → ocultar todo
    if (!q) {
        wrap.classList.add('d-none');
        contenedor.innerHTML = '';
        vacio.classList.add('d-none');
        return;
    }

    // Con búsqueda → mostrar contenedor y pintar coincidencias
    wrap.classList.remove('d-none');
    contenedor.innerHTML = '';

    const templateServicio = document.querySelector('#templateItemServicioDisponible').content;
    const servicios = listadoGeneralServicios.filter(s =>
        (s.nombre || '').toLowerCase().includes(q)
    );

    if (servicios.length === 0) {
        vacio.classList.remove('d-none');
        return;
    }
    vacio.classList.add('d-none');

    servicios.forEach(serv => {
        const precio = Number(serv.precio_regular || serv.precio_base || 0);
        const clone = templateServicio.cloneNode(true);

        clone.querySelector('.nombre-servicio').textContent = serv.nombre;
        clone.querySelector('.precio-servicio').textContent = 'S/ ' + precio.toFixed(2);
        clone.querySelector('.btn-agregar-servicio-lista').dataset.id = serv.id_servicio;

        contenedor.appendChild(clone);
    });
}

// Pinta productos disponibles para añadir a la cotización.
function poblarListaProductosDisponibles() {
    let contenedor = document.querySelector('#listaProductosDisponibles');
    if (!contenedor) return;

    const wrap = document.querySelector('#contenedorResultadosProductosCotizacion');
    const vacio = document.querySelector('#contenedorVacioProductosDisponibles');
    if (!wrap || !vacio) return;

    const q = busquedaProductoCotizacion.toLowerCase().trim();

    if (!q) {
        wrap.classList.add('d-none');
        contenedor.innerHTML = '';
        vacio.classList.add('d-none');
        return;
    }

    wrap.classList.remove('d-none');
    contenedor.innerHTML = '';

    const templateProducto = document.querySelector('#templateItemProductoDisponible').content;
    const productos = listadoGeneralProductos.filter(p =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.marca || '').toLowerCase().includes(q) ||
        (p.codigo || '').toLowerCase().includes(q)
    );

    if (productos.length === 0) {
        vacio.classList.remove('d-none');
        return;
    }
    vacio.classList.add('d-none');

    productos.forEach(prod => {
        const precio = Number(prod.precio_venta || 0);
        const clone = templateProducto.cloneNode(true);

        clone.querySelector('.nombre-producto').textContent = prod.nombre;
        clone.querySelector('.precio-producto').textContent = 'S/ ' + precio.toFixed(2);
        clone.querySelector('.btn-agregar-producto-lista').dataset.id = prod.id_producto;

        contenedor.appendChild(clone);
    });
}

// ============================================================
// HANDLERS COTIZACIONES
// ============================================================
// Maneja el evento input del control #inputBuscarServicioCotizacion.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarServicioCotizacion');
    if (!input) return;
    busquedaServicioCotizacion = input.value.trim();
    poblarListaServiciosDisponibles();
});

// Maneja el evento input del control #inputBuscarProductoCotizacion.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarProductoCotizacion');
    if (!input) return;
    busquedaProductoCotizacion = input.value.trim();
    poblarListaProductosDisponibles();
});

// Maneja el evento click del control #btnBuscarPlaca.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnBuscarPlaca');
    if (!boton) return;

    const placa = document.querySelector('#inputPlacaCotizacion').value.trim().toUpperCase();
    if (!placa) {
        mostrarToast('advertencia', 'Placa vacía', 'Ingrese una placa para buscar');
        return;
    }

    try {
        const res = await axios.get('/api/buscarVehiculoPorPlaca/' + placa);
        if (!res.data.ok || !res.data.vehiculo) {
            mostrarToast('error', 'No encontrado', 'No existe un vehículo con esa placa');
            limpiarInfoClienteCotizacion();
            setTexto('#contenedorPlacaActiva', '--');
            return;
        }

        const vehiculo = res.data.vehiculo;
        const persona = listadoGeneralPersonas.find(p => p.id_persona == vehiculo.id_persona);
        if (!persona) {
            mostrarToast('error', 'Error', 'No se encontró el cliente asociado');
            return;
        }

        clienteActual = persona;
        vehiculoActualCotizacion = vehiculo;

        setTexto('#contenedorPlacaActiva', vehiculo.placa);
        mostrarInfoClienteCotizacion(persona, vehiculo);

        mostrarToast('exito', 'Vehículo encontrado',
            `${vehiculo.placa} · ${persona.nombres || ''} ${persona.apellidos || ''}`.trim());

    } catch (error) {
        console.error(error);
        if (error.response && error.response.status === 404) {
            mostrarToast('error', 'No encontrado', 'No existe un vehículo con esa placa');
            limpiarInfoClienteCotizacion();
            setTexto('#contenedorPlacaActiva', '--');
        } else if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control .btn-agregar-servicio-lista.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-agregar-servicio-lista');
    if (!boton) return;

    const idServicio = boton.dataset.id;
    if (!idServicio) return;

    const servicio = listadoGeneralServicios.find(s => s.id_servicio == idServicio);
    if (!servicio) return;

    const precio = Number(servicio.precio_regular || servicio.precio_base || 0);

    // Si ya existe el servicio en la lista → solo incrementar cantidad
    const existente = itemsCotizacion.find(it => it.id_servicio == idServicio);

    if (existente) {
        existente.cantidad = Number(existente.cantidad) + 1;
        existente.subtotal = Number(existente.precio_unitario) * existente.cantidad;
    } else {
        itemsCotizacion.push({
            id_producto: null,
            id_servicio: Number(idServicio),
            tipo: 'SERVICIO',
            descripcion: servicio.nombre,
            cantidad: 1,
            precio_unitario: precio,
            subtotal: precio
        });
    }

    listarItemsCotizacion();
    recalcularTotalesCotizacion();

    // Reset búsqueda servicios
    busquedaServicioCotizacion = '';
    const inp = document.querySelector('#inputBuscarServicioCotizacion');
    if (inp) inp.value = '';
    poblarListaServiciosDisponibles();
});

// Maneja el evento click del control .btn-agregar-producto-lista.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-agregar-producto-lista');
    if (!boton) return;

    const idProducto = boton.dataset.id;
    if (!idProducto) return;

    const producto = listadoGeneralProductos.find(p => p.id_producto == idProducto);
    if (!producto) return;

    const precio = Number(producto.precio_venta || 0);

    // Si ya existe el producto en la lista → solo incrementar cantidad
    const existente = itemsCotizacion.find(it => it.id_producto == idProducto);

    if (existente) {
        existente.cantidad = Number(existente.cantidad) + 1;
        existente.subtotal = Number(existente.precio_unitario) * existente.cantidad;
    } else {
        itemsCotizacion.push({
            id_producto: Number(idProducto),
            id_servicio: null,
            tipo: 'PRODUCTO',
            descripcion: producto.nombre,
            cantidad: 1,
            precio_unitario: precio,
            subtotal: precio
        });
    }

    listarItemsCotizacion();
    recalcularTotalesCotizacion();

    // Reset búsqueda productos
    busquedaProductoCotizacion = '';
    const inp = document.querySelector('#inputBuscarProductoCotizacion');
    if (inp) inp.value = '';
    poblarListaProductosDisponibles();
});

// Maneja el evento click del control .btn-sumar-item.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-sumar-item');
    if (!boton) return;

    const index = Number(boton.dataset.index);
    if (isNaN(index)) return;

    const item = itemsCotizacion[index];
    if (!item) return;

    item.cantidad = Number(item.cantidad) + 1;
    item.subtotal = Number(item.precio_unitario) * item.cantidad;

    listarItemsCotizacion();
    recalcularTotalesCotizacion();
});

// Maneja el evento click del control .btn-restar-item.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-restar-item');
    if (!boton) return;

    const index = Number(boton.dataset.index);
    if (isNaN(index)) return;

    const item = itemsCotizacion[index];
    if (!item) return;

    item.cantidad = Number(item.cantidad) - 1;
    if (item.cantidad < 1) item.cantidad = 1;
    item.subtotal = Number(item.precio_unitario) * item.cantidad;

    listarItemsCotizacion();
    recalcularTotalesCotizacion();
});

// Maneja el evento change del control .input-cantidad-item.
document.addEventListener('change', function (event) {
    const input = event.target.closest('.input-cantidad-item');
    if (!input) return;

    const index = Number(input.dataset.index);
    if (isNaN(index)) return;

    const item = itemsCotizacion[index];
    if (!item) return;

    let cant = Number(input.value);
    if (!cant || cant < 1) cant = 1;

    item.cantidad = cant;
    item.subtotal = Number(item.precio_unitario) * cant;

    listarItemsCotizacion();
    recalcularTotalesCotizacion();
});

// Maneja el evento click del control .btn-quitar-item.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-quitar-item');
    if (!boton) return;

    const index = Number(boton.dataset.index);
    if (isNaN(index)) return;

    itemsCotizacion.splice(index, 1);

    listarItemsCotizacion();
    recalcularTotalesCotizacion();
});

// Registra una cotización después de validar cliente, vehículo, fecha e ítems.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnGenerarCotizacion');
    if (!boton || _enviandoCotizacion) return;

    _enviandoCotizacion = true;
    boton.disabled = true;
    try {
        const idVehiculo = vehiculoActualCotizacion ? vehiculoActualCotizacion.id_vehiculo : null;
        const idPersona = clienteActual ? clienteActual.id_persona : null;
        if (!idPersona || !idVehiculo) {
            mostrarToast('advertencia', 'Falta vehículo', 'Busque y seleccione la placa antes de generar la cotización.');
            return;
        }

        const fechaCotizacion = document.querySelector('#inputFechaCotizacion').value;
        if (!fechaCotizacion) {
            mostrarToast('advertencia', 'Falta fecha', 'Seleccione una fecha para la cotización.');
            return;
        }
        if (fechaCotizacion < fechaISO(new Date())) {
            mostrarToast('advertencia', 'Fecha inválida', 'La fecha de la cotización no puede ser anterior a hoy.');
            return;
        }
        if (!itemsCotizacion.length) {
            mostrarToast('advertencia', 'Sin conceptos', 'Agregue al menos un servicio o producto.');
            return;
        }
        const itemsValidos = itemsCotizacion.every(item =>
            Number.isFinite(Number(item.cantidad)) && Number(item.cantidad) > 0 &&
            Number.isFinite(Number(item.precio_unitario)) && Number(item.precio_unitario) >= 0
        );
        if (!itemsValidos) {
            mostrarToast('advertencia', 'Ítems inválidos', 'Revise cantidades y precios de los conceptos agregados.');
            return;
        }

        const validez = document.querySelector('#selectValidezCotizacion').value;
        if (!['7', '15', '30', '60'].includes(validez)) {
            mostrarToast('advertencia', 'Vigencia inválida', 'Seleccione una vigencia disponible para la cotización.');
            return;
        }

        await cargarCotizaciones();
        const cotizacionActiva = listadoGeneralCotizaciones.find(cotizacion =>
            Number(cotizacion.id_vehiculo) === Number(idVehiculo) &&
            Number(cotizacion.id_sucursal) === Number(sucursalActual.id_sucursal) &&
            ['PENDIENTE', 'APROBADA'].includes(String(cotizacion.estado || '').toUpperCase()) &&
            Number(cotizacion.tiene_ot) !== 1
        );
        if (cotizacionActiva) {
            const codigo = 'COT-' + String(cotizacionActiva.id_cotizacion).padStart(4, '0');
            mostrarToast('advertencia', 'Cotización activa existente', 'El vehículo ya tiene la cotización ' + codigo + ' activa.');
            return;
        }

        const observacion = document.querySelector('#textareaObservacionesCotizacion').value.trim();
        const res = await axios.post('/api/registrarCotizacion', {
            id_persona: idPersona,
            id_sucursal: sucursalActual.id_sucursal,
            id_vehiculo: idVehiculo,
            observacion,
            validez: Number(validez),
            fecha_cotizacion: fechaCotizacion,
            items: itemsCotizacion.map(item => ({
                id_producto: item.id_producto,
                id_servicio: item.id_servicio,
                cantidad: Number(item.cantidad),
                precio_unitario: Number(item.precio_unitario),
                observacion: null
            }))
        });
        if (!res.data || !res.data.ok) {
            mostrarToast('error', 'No se pudo crear la cotización', res.data?.mensaje || 'Revise los datos e inténtelo nuevamente.');
            return;
        }

        await cargarCotizaciones();
        listarCotizacionesSidebar();
        limpiarFormularioCotizacion();
        mostrarToast('exito', 'Cotización registrada',
            'COT-' + String(res.data.id_cotizacion).padStart(4, '0') + ' creada correctamente.');
    } catch (error) {
        console.error(error);
        mostrarToast('error', 'Error de cotización', error.response?.data?.mensaje || 'No se pudo registrar la cotización.');
    } finally {
        _enviandoCotizacion = false;
        boton.disabled = false;
    }
});

// Maneja el evento click del control #btnLimpiarCotizacion.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('#btnLimpiarCotizacion');
    if (!boton) return;

    limpiarFormularioCotizacion();
});

// Maneja el evento click del control .btn-aprobar-cotizacion.
document.addEventListener('click', async function (event) {
    const botonAprobar   = event.target.closest('.btn-aprobar-cotizacion');
    const botonRechazar  = event.target.closest('.btn-rechazar-cotizacion');
    const botonPendiente = event.target.closest('.btn-pendiente-cotizacion');

    const boton = botonAprobar || botonRechazar || botonPendiente;
    if (!boton) return;

    if (boton.disabled) return;

    const idCotizacion = boton.dataset.id;
    if (!idCotizacion) return;

    const cot = listadoGeneralCotizaciones.find(c => Number(c.id_cotizacion) === Number(idCotizacion));
    if (cot && (cot.tiene_ot || cot.estado === 'APROBADA')) {
        mostrarToast('advertencia', 'No permitido',
            'La cotización está aprobada u ocupada; solo puede visualizarse.');
        return;
    }

    let nuevoEstado = 'PENDIENTE';
    if (botonAprobar) nuevoEstado = 'APROBADA';
    if (botonRechazar) nuevoEstado = 'RECHAZADA';

    try {
        const res = await axios.patch('/api/actualizarEstadoCotizacion/' + idCotizacion, {
            estado: nuevoEstado
        });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        await cargarCotizaciones();
        listarCotizacionesSidebar();

        mostrarToast('exito', 'Correcto', 'Estado actualizado a ' + nuevoEstado);

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control .item-cotizacion.
document.addEventListener('click', async function (event) {
    const itemCotizacion = event.target.closest('.item-cotizacion');
    if (!itemCotizacion) return;

    if (event.target.closest('.btn-aprobar-cotizacion')
        || event.target.closest('.btn-rechazar-cotizacion')
        || event.target.closest('.btn-pendiente-cotizacion')) {
        return;
    }

    const idCotizacion = itemCotizacion.dataset.id;
    if (!idCotizacion) return;

    try {
        const res = await axios.get('/api/buscarCotizacionConDetalle/' + idCotizacion);
        if (!res.data.ok || !res.data.cotizacion) {
            mostrarToast('error', 'Error', 'No se pudo cargar la cotización');
            return;
        }

        const cot = res.data.cotizacion;
        cotizacionActual = cot;
        const btnAgendarCita = document.querySelector('#btnAgendarCitaCotizacion');
        if (btnAgendarCita) btnAgendarCita.disabled = false;

        setTexto('#contenedorPlacaActiva', cot.placa || '--');

        const persona = {
            id_persona: cot.id_persona,
            nombres: cot.cliente_nombres,
            apellidos: cot.cliente_apellidos,
            correo: cot.cliente_correo,
            telefono: cot.cliente_telefono
        };

        let vehiculo = {
            id_vehiculo: cot.id_vehiculo,
            placa: cot.placa,
            marca: cot.marca,
            modelo: cot.modelo,
            anio: cot.anio,
            color: cot.color || null,
            vin: cot.vin || null,
            numero_motor: cot.numero_motor || null,
            numero_chasis: cot.numero_chasis || null,
            observaciones: cot.observaciones || null
        };

        try {
            const resVeh = await axios.get('/api/buscarVehiculoPorId/' + cot.id_vehiculo);
            if (resVeh.data.ok && resVeh.data.vehiculo) {
                vehiculo = resVeh.data.vehiculo;
            }
        } catch (e) {
            // nos quedamos con lo que trajo la cotización
        }

        clienteActual = persona;
        vehiculoActualCotizacion = vehiculo;
        mostrarInfoClienteCotizacion(persona, vehiculo);

        document.querySelector('#inputPlacaCotizacion').value = cot.placa || '';
        document.querySelector('#inputFechaCotizacion').value =
            cot.fecha_cotizacion ? fechaISO(new Date(cot.fecha_cotizacion)) : fechaISO(new Date());
        document.querySelector('#selectValidezCotizacion').value = String(cot.validez || 7);
        document.querySelector('#textareaObservacionesCotizacion').value = cot.observacion || '';

        itemsCotizacion = (cot.items || []).map(it => ({
            id_producto: it.id_producto,
            id_servicio: it.id_servicio,
            tipo: it.tipo,
            descripcion: it.descripcion,
            cantidad: Number(it.cantidad),
            precio_unitario: Number(it.precio_unitario),
            subtotal: Number(it.subtotal)
        }));

        listarItemsCotizacion();
        recalcularTotalesCotizacion();
        listarCotizacionesSidebar();

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control .filtro-cotizacion.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.filtro-cotizacion');
    if (!boton) return;

    document.querySelectorAll('.filtro-cotizacion').forEach(b => b.classList.remove('active'));
    boton.classList.add('active');

    aplicarFiltroCotizacion(boton.dataset.filtro);
});

// Maneja el evento keypress del control #inputIrPaginaCotizaciones.
document.addEventListener('keypress', function (event) {
    const input = event.target.closest('#inputIrPaginaCotizaciones');
    if (!input) return;
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const pagina = Number(input.value);
    if (!pagina || isNaN(pagina) || pagina < 1) return;

    let base = [...listadoGeneralCotizaciones];
    if (filtroCotizacionActual && filtroCotizacionActual !== 'todas') {
        const estadoMap = {
            aprobada: 'APROBADA',
            pendiente: 'PENDIENTE',
            rechazada: 'RECHAZADA'
        };
        const estadoBuscado = estadoMap[filtroCotizacionActual];
        if (estadoBuscado) {
            base = base.filter(c => c.estado === estadoBuscado);
        }
    }

    const totalPaginas = Math.max(1, Math.ceil(base.length / porPaginaCotizaciones));
    paginaCotizacionesActual = Math.min(pagina, totalPaginas);
    listarCotizacionesSidebar();
});

// ============================================================
// HELPERS COTIZACIONES
// ============================================================
// Aplica el filtro de estado seleccionado a las cotizaciones.
function aplicarFiltroCotizacion(filtro) {
    filtroCotizacionActual = filtro || 'todas';
    paginaCotizacionesActual = 1;
    listarCotizacionesSidebar();
}

// Recalcula subtotales, impuestos y total de la cotización.
function recalcularTotalesCotizacion() {
    const subtotal = itemsCotizacion.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    setTexto('#contenedorSubtotalCotizacion', 'S/ ' + subtotal.toFixed(2));
    setTexto('#contenedorResumenSubtotal', 'S/ ' + subtotal.toFixed(2));
    setTexto('#contenedorResumenIGV', 'S/ ' + igv.toFixed(2));
    setTexto('#contenedorTotalFinalCotizacion', 'S/ ' + total.toFixed(2));
    setTexto('#pillTotalCotizacion', 'S/ ' + total.toFixed(2));
}

// Muestra el cliente y vehículo asociados a la cotización.
function mostrarInfoClienteCotizacion(persona, vehiculo) {
    const contCliente  = document.querySelector('#contenedorInfoClienteCotizacion');
    const contVehiculo = document.querySelector('#contenedorInfoVehiculoCotizacion');
    const vacio        = document.querySelector('#contenedorVacioCliente');
    if (!contCliente || !contVehiculo || !vacio) return;

    contCliente.classList.remove('d-none');
    contVehiculo.classList.remove('d-none');
    vacio.classList.add('d-none');

    document.querySelector('#clienteNombre').textContent =
        `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || '—';
    document.querySelector('#clienteTelefono').textContent = persona.telefono || '—';

    document.querySelector('#vehiculoPlaca').textContent = vehiculo.placa || '—';
    document.querySelector('#vehiculoMarcaModelo').textContent =
        `${vehiculo.marca || ''} ${vehiculo.modelo || ''}`.trim() || '—';
    document.querySelector('#vehiculoAnio').textContent = vehiculo.anio || '—';
    document.querySelector('#vehiculoVin').textContent = vehiculo.vin || '—';
    document.querySelector('#vehiculoMotor').textContent = vehiculo.numero_motor || '—';
    document.querySelector('#vehiculoChasis').textContent = vehiculo.numero_chasis || '—';
    document.querySelector('#vehiculoObservaciones').textContent = vehiculo.observaciones || '—';
}

// Quita de la vista el cliente y vehículo seleccionados.
function limpiarInfoClienteCotizacion() {
    const contCliente  = document.querySelector('#contenedorInfoClienteCotizacion');
    const contVehiculo = document.querySelector('#contenedorInfoVehiculoCotizacion');
    const vacio        = document.querySelector('#contenedorVacioCliente');
    if (!contCliente || !contVehiculo || !vacio) return;

    contCliente.classList.add('d-none');
    contVehiculo.classList.add('d-none');
    vacio.classList.remove('d-none');

    document.querySelector('#clienteNombre').textContent = '--';
    document.querySelector('#clienteTelefono').textContent = '--';

    document.querySelector('#vehiculoPlaca').textContent = '--';
    document.querySelector('#vehiculoMarcaModelo').textContent = '--';
    document.querySelector('#vehiculoAnio').textContent = '--';
    document.querySelector('#vehiculoVin').textContent = '--';
    document.querySelector('#vehiculoMotor').textContent = '--';
    document.querySelector('#vehiculoChasis').textContent = '--';
    document.querySelector('#vehiculoObservaciones').textContent = '--';
}

// Restablece el formulario y los artículos de la cotización.
function limpiarFormularioCotizacion() {
    itemsCotizacion = [];
    cotizacionActual = null;
    clienteActual = null;
    vehiculoActualCotizacion = null;
    const btnAgendarCita = document.querySelector('#btnAgendarCitaCotizacion');
    if (btnAgendarCita) btnAgendarCita.disabled = true;

    const inputPlaca = document.querySelector('#inputPlacaCotizacion');
    if (inputPlaca) inputPlaca.value = '';

    const fecha = document.querySelector('#inputFechaCotizacion');
    if (fecha) fecha.value = fechaISO(new Date());

    const validez = document.querySelector('#selectValidezCotizacion');
    if (validez) validez.value = '7';

    const obs = document.querySelector('#textareaObservacionesCotizacion');
    if (obs) obs.value = '';

    setTexto('#contenedorPlacaActiva', '--');
    limpiarInfoClienteCotizacion();

    busquedaServicioCotizacion = '';
    busquedaProductoCotizacion = '';
    const inpServCot = document.querySelector('#inputBuscarServicioCotizacion');
    if (inpServCot) inpServCot.value = '';
    const inpProdCot = document.querySelector('#inputBuscarProductoCotizacion');
    if (inpProdCot) inpProdCot.value = '';

    poblarListasDisponiblesCotizacion();
    listarItemsCotizacion();
    recalcularTotalesCotizacion();
    listarCotizacionesSidebar();
}

// ============================================================
// SECCION ORDENES DE TRABAJO
// ============================================================
// Inserta la vista de órdenes y prepara sus filtros y controles.
function renderOrdenes() {
    // Flush del autoguardado pendiente antes de salir de la vista
    if (_autoguardadoConsumoPendiente) {
        if (_autoguardadoConsumoTimer) {
            clearTimeout(_autoguardadoConsumoTimer);
            _autoguardadoConsumoTimer = null;
        }
        ejecutarAutoguardadoConsumo();
    }

    contenedorReactivo.innerHTML = "";
    const clone = templateContenedorOrdenes.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    ordenActual = null;
    itemsOT = [];
    evidenciasGuardadas = [];
    evidenciasPendientes = [];
    archivosEvidenciaPendientes = [];
    idInformeActual = null;
    paginaOrdenesActual = 1;
    filtroOrdenActual = 'todas';
    busquedaOrdenActual = '';

    busquedaServicioOT = '';
    busquedaProductoOT = '';
    const inpServOT = document.querySelector('#inputBuscarServicioOT');
    if (inpServOT) inpServOT.value = '';
    const inpProdOT = document.querySelector('#inputBuscarProductoOT');
    if (inpProdOT) inpProdOT.value = '';

    const botonesFiltro = document.querySelectorAll('.filtro-orden');
    botonesFiltro.forEach(b => b.classList.remove('active'));
    const btnTodas = document.querySelector('.filtro-orden[data-filtro="todas"]');
    if (btnTodas) btnTodas.classList.add('active');

    const inputBuscar = document.querySelector('#inputBuscarOrden');
    if (inputBuscar) inputBuscar.value = '';

    sincronizarSelectPorPagina('ordenes', porPaginaOrdenes);

    poblarListasOT();
    listarOrdenes();
    limpiarDetalleOrden();
}

// Limpia el panel de detalle de la orden seleccionada.
function limpiarDetalleOrden() {
    setTexto('#consumoOrdenCodigo', '--');
    setTexto('#consumoOrdenFecha', '--');
    setTexto('#consumoOrdenCliente', '--');
    setTexto('#consumoOrdenDocumento', '--');
    setTexto('#consumoOrdenVehiculo', '--');
    setTexto('#consumoOrdenMecanico', '--');
    setTexto('#consumoOrdenServicio', '--');
    const descripcionOrden = document.querySelector('#consumoOrdenDescripcion');
    if (descripcionOrden) descripcionOrden.value = '';

    const badge = document.querySelector('#consumoOrdenEstado');
    if (badge) {
        badge.textContent = '--';
        badge.className = 'badge bg-secondary';
    }

    vehiculoBuscadoOT = null;
    const tarjetaVehiculo = document.querySelector('#contenedorVehiculoBuscadoOT');
    if (tarjetaVehiculo) tarjetaVehiculo.classList.add('d-none');
    const accionCrearOT = document.querySelector('#contenedorAccionCrearOrdenDirecta');
    if (accionCrearOT) accionCrearOT.classList.add('d-none');

    const info = document.querySelector('#contenedorInfoOrden');
    if (info) info.classList.add('d-none');

    const vacioOrden = document.querySelector('#contenedorVacioOrden');
    if (vacioOrden) vacioOrden.classList.remove('d-none');

    const acciones = document.querySelector('#contenedorAccionesOrden');
    if (acciones) acciones.classList.add('d-none');

    const contEvid = document.querySelector('#contenedorEvidencias');
    if (contEvid) contEvid.classList.add('d-none');

    const observacionDirecta = document.querySelector('#contenedorObservacionOrdenDirecta');
    if (observacionDirecta) observacionDirecta.classList.add('d-none');
    const observacionOrden = document.querySelector('#contenedorObservacionOrdenActual');
    if (observacionOrden) observacionOrden.classList.add('d-none');

    const formListas = document.querySelector('#contenedorListasDisponiblesOT');
    if (formListas) formListas.classList.add('d-none');

    const vacioConsumo = document.querySelector('#contenedorVacioConsumo');
    if (vacioConsumo) vacioConsumo.classList.remove('d-none');

    const consumoActivo = document.querySelector('#contenedorConsumoActivo');
    if (consumoActivo) consumoActivo.classList.add('d-none');

    const vacioItems = document.querySelector('#contenedorVacioItemsConsumo');
    if (vacioItems) vacioItems.classList.remove('d-none');

    const tablaConsumo = document.querySelector('#contenedorTablaConsumo');
    if (tablaConsumo) tablaConsumo.classList.add('d-none');

    const footerConsumo = document.querySelector('#contenedorFooterConsumo');
    if (footerConsumo) footerConsumo.classList.add('d-none');

    const inputTitulo = document.querySelector('#inputTituloEvidencia');
    if (inputTitulo) inputTitulo.value = '';
    const txtDesc = document.querySelector('#textareaDescripcionEvidencia');
    if (txtDesc) txtDesc.value = '';
    const inpFile = document.querySelector('#inputEvidencias');
    if (inpFile) inpFile.value = '';

    const album = document.querySelector('#albumEvidencias');
    if (album) {
        album.innerHTML = '';
        album.classList.add('d-none');
    }

    const contVacioEvid = document.querySelector('#contenedorVacioEvidencias');
    if (contVacioEvid) contVacioEvid.classList.remove('d-none');

    const footerEvid = document.querySelector('#contenedorFooterEvidencias');
    if (footerEvid) footerEvid.classList.add('d-none');

    setTexto('#contadorEvidencias', '0');
    setTexto('#resumenSubtotalOT', 'S/ 0.00');
    setTexto('#resumenIGVOT', 'S/ 0.00');
    setTexto('#resumenTotalConsumo', 'S/ 0.00');

    setIndicadorAutoguardado('');
}

// Filtra, pagina y pinta las órdenes de trabajo.
function listarOrdenes() {
    let contenedor = document.querySelector('#contenedorListaOrdenes');
    if (!contenedor) return;
    const templateItem = document.querySelector('#templateItemOrden').content;
    contenedor.innerHTML = "";

    let filtradas = [...listadoGeneralOrdenes];

    if (filtroOrdenActual && filtroOrdenActual !== 'todas') {
        const estadoMap = {
            pendiente: 'PENDIENTE',
            proceso: 'EN PROCESO',
            finalizada: 'FINALIZADA'
        };
        const estadoBuscado = estadoMap[filtroOrdenActual];
        if (estadoBuscado) {
            filtradas = filtradas.filter(o => o.estado === estadoBuscado);
        }
    }

    if (busquedaOrdenActual) {
        const q = busquedaOrdenActual.toLowerCase();
        filtradas = filtradas.filter(o => {
            const codigo = 'OT-' + String(o.id_orden_trabajo).padStart(4, '0').toLowerCase();
            const cliente = `${o.cliente_nombres || ''} ${o.cliente_apellidos || ''}`.toLowerCase();
            const placa = (o.placa || '').toLowerCase();
            return codigo.includes(q) || cliente.includes(q) || placa.includes(q);
        });
    }

    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPaginaOrdenes));
    if (paginaOrdenesActual > totalPaginas) paginaOrdenesActual = totalPaginas;
    const inicio = (paginaOrdenesActual - 1) * porPaginaOrdenes;
    const pagina = filtradas.slice(inicio, inicio + porPaginaOrdenes);

    pagina.forEach(orden => {
        const clone = templateItem.cloneNode(true);

        clone.querySelector('.codigo-orden').textContent =
            'OT-' + String(orden.id_orden_trabajo).padStart(4, '0');
        clone.querySelector('.cliente-orden').textContent =
            `${orden.cliente_nombres || ''} ${orden.cliente_apellidos || ''}`.trim();
        clone.querySelector('.placa-orden').textContent =
            `${orden.placa || ''} · ${orden.marca || ''} ${orden.modelo || ''}`.trim();

        const badge = clone.querySelector('.estado-orden');
        badge.textContent = orden.estado || '—';
        badge.className = 'estado-orden badge ' + claseBadgeEstado(orden.estado);

        const btn = clone.querySelector('.item-orden');
        btn.dataset.id = orden.id_orden_trabajo;

        if (ordenActual && Number(ordenActual.id_orden_trabajo) === Number(orden.id_orden_trabajo)) {
            btn.classList.add('active');
        }

        contenedor.appendChild(clone);
    });

    actualizarPaginacionOrdenes(paginaOrdenesActual, totalPaginas, filtradas.length, pagina.length);
}

// Actualiza controles y rango de la paginación de órdenes.
function actualizarPaginacionOrdenes(pagina, totalPaginas, totalRegistros, registrosPagina) {
    const btnNum = document.querySelector('#btnOrdenesPaginaNumero');
    if (btnNum) btnNum.textContent = String(pagina);

    actualizarBotonesPaginacion('Ordenes', pagina, totalPaginas);

    const inicio = totalRegistros === 0 ? 0 : ((pagina - 1) * porPaginaOrdenes) + 1;
    const fin    = totalRegistros === 0 ? 0 : inicio + registrosPagina - 1;
    actualizarInfoRango('infoRangoOrdenes', inicio, fin, totalRegistros);
    actualizarIrPagina('inputIrPaginaOrdenes', pagina, totalPaginas);
}

// Consulta y selecciona una orden para mostrar su detalle.
async function cargarOrdenActual(idOrden) {
    try {
        const res = await axios.get('/api/buscarOrdenConDetalle/' + idOrden);
        if (!res.data.ok || !res.data.orden) {
            mostrarToast('error', 'Error', 'No se pudo cargar la orden');
            return;
        }

        const orden = res.data.orden;
        ordenActual = orden;
        vehiculoBuscadoOT = null;
        const tarjetaVehiculo = document.querySelector('#contenedorVehiculoBuscadoOT');
        if (tarjetaVehiculo) tarjetaVehiculo.classList.add('d-none');
        const observacionDirecta = document.querySelector('#contenedorObservacionOrdenDirecta');
        if (observacionDirecta) observacionDirecta.classList.add('d-none');

        await cargarInformePorOrden(idOrden);

        pintarDetalleOrden(orden);
        const observacionOrden = document.querySelector('#contenedorObservacionOrdenActual');
        if (observacionOrden) observacionOrden.classList.remove('d-none');

        itemsOT = (orden.detalles || []).map(it => ({
            id_producto: it.id_producto,
            id_servicio: it.id_servicio,
            tipo: it.tipo,
            descripcion: it.descripcion,
            cantidad: Number(it.cantidad),
            precio_unitario: Number(it.precio_unitario),
            subtotal: Number(it.subtotal)
        }));

        // Sincronizar estado del autoguardado con la orden cargada
        _ultimoPayloadConsumo = JSON.stringify(construirPayloadConsumo());
        _autoguardadoConsumoPendiente = false;
        if (_autoguardadoConsumoTimer) {
            clearTimeout(_autoguardadoConsumoTimer);
            _autoguardadoConsumoTimer = null;
        }
        setIndicadorAutoguardado('guardado');

        listarItemsOT();
        recalcularTotalesOT();
        pintarEvidenciasOT();

        const info = document.querySelector('#contenedorInfoOrden');
        if (info) info.classList.remove('d-none');
        const vacioOrden = document.querySelector('#contenedorVacioOrden');
        if (vacioOrden) vacioOrden.classList.add('d-none');
        const acciones = document.querySelector('#contenedorAccionesOrden');
        if (acciones) acciones.classList.remove('d-none');
        const contEvid = document.querySelector('#contenedorEvidencias');
        if (contEvid) contEvid.classList.remove('d-none');

        const vacioConsumo = document.querySelector('#contenedorVacioConsumo');
        if (vacioConsumo) vacioConsumo.classList.add('d-none');
        const consumoActivo = document.querySelector('#contenedorConsumoActivo');
        if (consumoActivo) consumoActivo.classList.remove('d-none');

        aplicarReglasEstadoOrden(orden);

        listarOrdenes();

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
}

// Ajusta botones y campos disponibles según el estado de la orden.
function aplicarReglasEstadoOrden(orden) {
    const estado = orden.estado || '';
    const esPendiente = estado === 'PENDIENTE';
    const esEnProceso = estado === 'EN PROCESO';

    document.querySelectorAll('.cambiar-estado-orden').forEach(b => {
        const destino = b.dataset.estado || '';
        b.classList.add('d-none');
        b.disabled = false;

        if (esPendiente && destino === 'EN PROCESO') {
            b.classList.remove('d-none');
        }
        if (esEnProceso && destino === 'FINALIZADA') {
            b.classList.remove('d-none');
        }
    });

    const formListas = document.querySelector('#contenedorListasDisponiblesOT');
    if (formListas) {
        if (esEnProceso) formListas.classList.remove('d-none');
        else formListas.classList.add('d-none');
    }

    const btnSubir = document.querySelector('#btnSubirEvidencias');
    if (btnSubir) btnSubir.disabled = !esEnProceso;

    const btnGuardarEvid = document.querySelector('#btnGuardarEvidencias');
    if (btnGuardarEvid) btnGuardarEvid.disabled = !esEnProceso;

    const inputTitulo = document.querySelector('#inputTituloEvidencia');
    if (inputTitulo) inputTitulo.disabled = !esEnProceso;
    const txtDesc = document.querySelector('#textareaDescripcionEvidencia');
    if (txtDesc) txtDesc.disabled = !esEnProceso;

    document.querySelectorAll('#albumEvidencias .evidencia-card__quitar').forEach(btn => {
        if (btn.classList.contains('btn-quitar-evidencia-pendiente')) return;
        btn.disabled = !esEnProceso;
        btn.classList.toggle('d-none', !esEnProceso);
    });

    document.querySelectorAll('.btn-sumar-ot, .btn-restar-ot, .btn-quitar-ot, .input-cantidad-ot')
        .forEach(el => {
            el.disabled = !esEnProceso;
            if (el.tagName === 'BUTTON') {
                el.classList.toggle('d-none', !esEnProceso);
            }
        });
}

// Pinta la información principal de la orden seleccionada.
function pintarDetalleOrden(orden) {
    setTexto('#consumoOrdenCodigo', 'OT-' + String(orden.id_orden_trabajo).padStart(4, '0'));
    setTexto('#consumoOrdenFecha', orden.fecha_atencion ? formatearFecha(orden.fecha_atencion) : '—');
    setTexto('#consumoOrdenCliente',
        `${orden.cliente_nombres || ''} ${orden.cliente_apellidos || ''}`.trim() || '—');
    setTexto('#consumoOrdenDocumento', orden.documento || '—');
    setTexto('#consumoOrdenVehiculo',
        `${orden.placa || ''} · ${orden.marca || ''} ${orden.modelo || ''}`.trim() || '—');

    const mecanicos = (orden.mecanicos || []).map(m =>
        `${m.nombres || ''} ${m.apellidos || ''}`.trim()
    ).filter(Boolean);
    setTexto('#consumoOrdenMecanico', mecanicos.length ? mecanicos.join(', ') : '—');

    setTexto('#consumoOrdenServicio', orden.observacion || '—');
    const descripcionOrden = document.querySelector('#consumoOrdenDescripcion');
    if (descripcionOrden) descripcionOrden.value = orden.observacion || '';

    const badge = document.querySelector('#consumoOrdenEstado');
    if (badge) {
        badge.textContent = orden.estado || '—';
        badge.className = 'badge ' + claseBadgeEstado(orden.estado);
    }
}

// Prepara los productos y servicios disponibles para una orden.
function poblarListasOT() {
    poblarListaServiciosOT();
    poblarListaProductosOT();
}

// Pinta los servicios que se pueden añadir a la orden.
function poblarListaServiciosOT() {
    let contenedor = document.querySelector('#listaServiciosOT');
    if (!contenedor) return;

    const wrap = document.querySelector('#contenedorResultadosServiciosOT');
    const vacio = document.querySelector('#contenedorVacioServiciosOT');
    if (!wrap || !vacio) return;

    const q = busquedaServicioOT.toLowerCase().trim();

    if (!q) {
        wrap.classList.add('d-none');
        contenedor.innerHTML = '';
        vacio.classList.add('d-none');
        return;
    }

    wrap.classList.remove('d-none');
    contenedor.innerHTML = '';

    const templateServicio = document.querySelector('#templateItemServicioDisponible').content;
    const servicios = listadoGeneralServicios.filter(s =>
        (s.nombre || '').toLowerCase().includes(q)
    );

    if (servicios.length === 0) {
        vacio.classList.remove('d-none');
        return;
    }
    vacio.classList.add('d-none');

    servicios.forEach(serv => {
        const precio = Number(serv.precio_regular || serv.precio_base || 0);
        const clone = templateServicio.cloneNode(true);

        clone.querySelector('.nombre-servicio').textContent = serv.nombre;
        clone.querySelector('.precio-servicio').textContent = 'S/ ' + precio.toFixed(2);

        const boton = clone.querySelector('.btn-agregar-servicio-lista');
        boton.dataset.id = serv.id_servicio;
        boton.classList.remove('btn-agregar-servicio-lista');
        boton.classList.add('btn-agregar-servicio-ot');

        contenedor.appendChild(clone);
    });
}

// Pinta los productos que se pueden añadir a la orden.
function poblarListaProductosOT() {
    let contenedor = document.querySelector('#listaProductosOT');
    if (!contenedor) return;

    const wrap = document.querySelector('#contenedorResultadosProductosOT');
    const vacio = document.querySelector('#contenedorVacioProductosOT');
    if (!wrap || !vacio) return;

    const q = busquedaProductoOT.toLowerCase().trim();

    if (!q) {
        wrap.classList.add('d-none');
        contenedor.innerHTML = '';
        vacio.classList.add('d-none');
        return;
    }

    wrap.classList.remove('d-none');
    contenedor.innerHTML = '';

    const templateProducto = document.querySelector('#templateItemProductoDisponible').content;
    const productos = listadoGeneralProductos.filter(p =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.marca || '').toLowerCase().includes(q) ||
        (p.codigo || '').toLowerCase().includes(q)
    );

    if (productos.length === 0) {
        vacio.classList.remove('d-none');
        return;
    }
    vacio.classList.add('d-none');

    productos.forEach(prod => {
        const precio = Number(prod.precio_venta || 0);
        const clone = templateProducto.cloneNode(true);

        clone.querySelector('.nombre-producto').textContent = prod.nombre;
        clone.querySelector('.precio-producto').textContent = 'S/ ' + precio.toFixed(2);

        const boton = clone.querySelector('.btn-agregar-producto-lista');
        boton.dataset.id = prod.id_producto;
        boton.classList.remove('btn-agregar-producto-lista');
        boton.classList.add('btn-agregar-producto-ot');

        contenedor.appendChild(clone);
    });
}

// Pinta los productos y servicios registrados como consumo.
function listarItemsOT() {
    let contenedor = document.querySelector('#contenedorItemsConsumo');
    if (!contenedor) return;
    const templateFilaItem = document.querySelector('#templateFilaItemCotizacion').content;
    contenedor.innerHTML = "";

    const hayItems = itemsOT.length > 0;

    const vacio = document.querySelector('#contenedorVacioItemsConsumo');
    if (vacio) {
        if (hayItems) vacio.classList.add('d-none');
        else vacio.classList.remove('d-none');
    }

    const tabla = document.querySelector('#contenedorTablaConsumo');
    if (tabla) {
        if (hayItems) tabla.classList.remove('d-none');
        else tabla.classList.add('d-none');
    }

    // Footer visible siempre que haya orden cargada (permite finalizar con consumo vacío)
    const footer = document.querySelector('#contenedorFooterConsumo');
    if (footer) {
        if (ordenActual) footer.classList.remove('d-none');
        else footer.classList.add('d-none');
    }

    itemsOT.forEach((item, index) => {
        const clone = templateFilaItem.cloneNode(true);

        clone.querySelector('.tipo-item').textContent = item.tipo;
        clone.querySelector('.descripcion-item').textContent = item.descripcion;

        const inputCant = clone.querySelector('.input-cantidad-item');
        inputCant.value = item.cantidad;
        inputCant.dataset.index = index;
        inputCant.classList.remove('input-cantidad-item');
        inputCant.classList.add('input-cantidad-ot');

        clone.querySelector('.precio-item').textContent = 'S/ ' + Number(item.precio_unitario).toFixed(2);
        clone.querySelector('.subtotal-item').textContent = 'S/ ' + Number(item.subtotal).toFixed(2);

        const btnRestar = clone.querySelector('.btn-restar-item');
        btnRestar.dataset.index = index;
        btnRestar.classList.remove('btn-restar-item');
        btnRestar.classList.add('btn-restar-ot');

        const btnSumar = clone.querySelector('.btn-sumar-item');
        btnSumar.dataset.index = index;
        btnSumar.classList.remove('btn-sumar-item');
        btnSumar.classList.add('btn-sumar-ot');

        const btnQuitar = clone.querySelector('.btn-quitar-item');
        btnQuitar.dataset.index = index;
        btnQuitar.classList.remove('btn-quitar-item');
        btnQuitar.classList.add('btn-quitar-ot');

        contenedor.appendChild(clone);
    });

    if (ordenActual) aplicarReglasEstadoOrden(ordenActual);
}

// Recalcula los importes del consumo de la orden actual.
function recalcularTotalesOT() {
    const subtotal = itemsOT.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    setTexto('#resumenSubtotalOT', 'S/ ' + subtotal.toFixed(2));
    setTexto('#resumenIGVOT', 'S/ ' + igv.toFixed(2));
    setTexto('#resumenTotalConsumo', 'S/ ' + total.toFixed(2));
}

// ============================================================
// AUTOGUARDADO DE CONSUMO (debounce)
// ============================================================
// Construye los datos que se guardan como consumo de la orden.
function construirPayloadConsumo() {
    return itemsOT.map(it => ({
        id_producto: it.id_producto,
        id_servicio: it.id_servicio,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        subtotal: Number(it.subtotal),
        observacion: null
    }));
}

// Actualiza el mensaje visual del estado de autoguardado.
function setIndicadorAutoguardado(estado) {
    const el = document.querySelector('#indicadorAutoguardadoConsumo');
    if (!el) return;

    switch (estado) {
        case 'guardando':
            el.textContent = 'Guardando…';
            el.className = 'd-block text-muted text-center mt-1';
            break;
        case 'guardado':
            el.textContent = 'Guardado ✓';
            el.className = 'd-block text-success text-center mt-1';
            break;
        case 'pendiente':
            el.textContent = 'Cambios sin guardar';
            el.className = 'd-block text-warning text-center mt-1';
            break;
        case 'error':
            el.textContent = 'No se pudo guardar';
            el.className = 'd-block text-danger text-center mt-1';
            break;
        default:
            el.textContent = '';
            el.className = 'd-block text-muted text-center mt-1';
    }
}

// Programa el guardado tras una pausa en los cambios.
function programarAutoguardadoConsumo() {
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') return;

    _autoguardadoConsumoPendiente = true;
    setIndicadorAutoguardado('pendiente');

    if (_autoguardadoConsumoTimer) clearTimeout(_autoguardadoConsumoTimer);
    _autoguardadoConsumoTimer = setTimeout(ejecutarAutoguardadoConsumo, 700);
}

// Envía al servidor el consumo pendiente de la orden.
async function ejecutarAutoguardadoConsumo() {
    if (!_autoguardadoConsumoPendiente) return;
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') {
        _autoguardadoConsumoPendiente = false;
        return;
    }
    if (_enviandoConsumo) return;

    const itemsPayload = construirPayloadConsumo();
    const serializado = JSON.stringify(itemsPayload);

    if (serializado === _ultimoPayloadConsumo) {
        _autoguardadoConsumoPendiente = false;
        setIndicadorAutoguardado('guardado');
        return;
    }

    _enviandoConsumo = true;
    setIndicadorAutoguardado('guardando');

    try {
        const res = await axios.put(
            '/api/reemplazarDetallesOrden/' + ordenActual.id_orden_trabajo,
            { id_sucursal: ordenActual.id_sucursal, items: itemsPayload }
        );

        if (!res.data.ok) {
            setIndicadorAutoguardado('error');
            mostrarToast('error', 'No se pudo guardar', res.data.mensaje);
            return;
        }

        _ultimoPayloadConsumo = serializado;
        _autoguardadoConsumoPendiente = false;
        setIndicadorAutoguardado('guardado');

    } catch (error) {
        console.error(error);
        setIndicadorAutoguardado('error');
        if (error.response) {
            mostrarToast('error', 'No se pudo guardar', error.response.data.mensaje);
        }
    } finally {
        _enviandoConsumo = false;
        if (_autoguardadoConsumoPendiente) {
            programarAutoguardadoConsumo();
        }
    }
}

// Completa de inmediato el autoguardado que esté pendiente.
async function flushAutoguardadoConsumo() {
    if (_autoguardadoConsumoTimer) {
        clearTimeout(_autoguardadoConsumoTimer);
        _autoguardadoConsumoTimer = null;
    }
    if (_autoguardadoConsumoPendiente) {
        await ejecutarAutoguardadoConsumo();
    }
}

// Pinta las evidencias guardadas y pendientes de la orden.
function pintarEvidenciasOT() {
    const album    = document.querySelector('#albumEvidencias');
    const contVacio= document.querySelector('#contenedorVacioEvidencias');
    const footer   = document.querySelector('#contenedorFooterEvidencias');

    if (!album) return;
    album.innerHTML = '';

    const total = evidenciasGuardadas.length + evidenciasPendientes.length;

    if (total === 0) {
        album.classList.add('d-none');
        if (contVacio) contVacio.classList.remove('d-none');
        if (footer) footer.classList.add('d-none');
    } else {
        album.classList.remove('d-none');
        if (contVacio) contVacio.classList.add('d-none');
        if (footer && evidenciasPendientes.length > 0) footer.classList.remove('d-none');
        else if (footer) footer.classList.add('d-none');
    }

    setTexto('#contadorEvidencias', String(total));

    const templateGuardada = document.querySelector('#templateEvidenciaGuardada').content;
    evidenciasGuardadas.forEach(ev => {
        const clone = templateGuardada.cloneNode(true);

        clone.querySelector('.evidencia-card__img').src = ev.url_archivo || '';
        clone.querySelector('.evidencia-card__desc').textContent = ev.descripcion || '';
        clone.querySelector('.evidencia-card__fecha').textContent =
            ev.fecha_registro ? formatearFecha(ev.fecha_registro) : '';

        clone.querySelector('.evidencia-card__quitar').dataset.id = ev.id_evidencia;

        album.appendChild(clone);
    });

    const templatePendiente = document.querySelector('#templateEvidenciaPendiente').content;
    evidenciasPendientes.forEach((ev, index) => {
        const clone = templatePendiente.cloneNode(true);

        clone.querySelector('.evidencia-card__img').src = ev.urlPreview || '';

        const btn = clone.querySelector('.evidencia-card__quitar');
        btn.dataset.index = index;
        btn.classList.add('btn-quitar-evidencia-pendiente');

        album.appendChild(btn ? clone : clone);
    });

    if (ordenActual) aplicarReglasEstadoOrden(ordenActual);
}

// Prepara y muestra el formulario para crear una orden.
async function abrirModalNuevaOrden() {
    limpiarModalNuevaOrden();
    await poblarSelectCitasOrden();
    await poblarSelectCotizacionesOrden();
    abrirModal('#modalNuevaOrden');
}

// Carga citas que se pueden asociar a una orden nueva.
async function poblarSelectCitasOrden() {
    const select = document.querySelector('#selectCitaOrden');
    if (!select) return;

    select.querySelectorAll('option:not(:first-child)').forEach(option => option.remove());
    await cargarCitas();

    const idCotizacion = document.querySelector('#selectCotizacionOrden')?.value;
    const cot = listadoGeneralCotizaciones.find(item => Number(item.id_cotizacion) === Number(idCotizacion));
    const disponibles = listadoGeneralCitas.filter(cita =>
        Number(cita.id_sucursal) === Number(sucursalActual.id_sucursal) &&
        ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA'].includes(String(cita.estado || '').toUpperCase()) &&
        Number(cita.tiene_ot) !== 1 && !citaTieneOrden(cita.id_cita) &&
        (!cot || (Number(cita.id_vehiculo) === Number(cot.id_vehiculo) && Number(cita.id_persona) === Number(cot.id_persona) && Number(cita.id_sucursal) === Number(cot.id_sucursal)))
    );

    const templateOption = document.querySelector('#templateOptionCita').content;
    disponibles.forEach(cita => {
        const clone = templateOption.cloneNode(true);
        const option = clone.querySelector('option');
        option.value = cita.id_cita;
        option.textContent = '#' + cita.id_cita + ' · ' + (cita.fecha_cita ? formatearFecha(cita.fecha_cita) : '—') + ' ' + (cita.hora_cita || '') + ' · ' + (cita.placa || '') + ' · ' + (cita.cliente_nombres || '') + ' ' + (cita.cliente_apellidos || '');
        select.appendChild(clone);
    });
}

// Carga cotizaciones que se pueden asociar a una orden nueva.
async function poblarSelectCotizacionesOrden() {
    const select = document.querySelector('#selectCotizacionOrden');
    if (!select) return;

    const opciones = select.querySelectorAll('option:not(:first-child)');
    opciones.forEach(o => o.remove());

    await cargarCotizacionesAprobadas();

    const idCita = document.querySelector('#selectCitaOrden')?.value;
    const cita = listadoGeneralCitas.find(item => Number(item.id_cita) === Number(idCita));
    const disponibles = listadoCotizacionesAprobadas.filter(cot => !cot.tiene_ot && Number(cot.id_sucursal) === Number(sucursalActual.id_sucursal) && (!cita ||
        (Number(cot.id_vehiculo) === Number(cita.id_vehiculo) && Number(cot.id_persona) === Number(cita.id_persona) && Number(cot.id_sucursal) === Number(cita.id_sucursal))));

    const templateOption = document.querySelector('#templateOptionCotizacion').content;

    disponibles.forEach(cot => {
        const clone = templateOption.cloneNode(true);
        const option = clone.querySelector('option');
        option.value = cot.id_cotizacion;
        option.textContent =
            `COT-${String(cot.id_cotizacion).padStart(4, '0')} · ${cot.placa || ''} · ${cot.cliente_nombres || ''} ${cot.cliente_apellidos || ''}`.trim();
        select.appendChild(clone);
    });
}

// Mantiene las opciones de cita y cotización compatibles al cambiar la selección.
document.addEventListener('change', async function (event) {
    if (event.target.closest('#selectCitaOrden')) {
        const selectCot = document.querySelector('#selectCotizacionOrden');
        const seleccion = selectCot ? selectCot.value : '';
        await poblarSelectCotizacionesOrden();
        if (selectCot && Array.from(selectCot.options).some(option => option.value === seleccion)) selectCot.value = seleccion;
    } else if (event.target.closest('#selectCotizacionOrden')) {
        const selectCita = document.querySelector('#selectCitaOrden');
        const seleccion = selectCita ? selectCita.value : '';
        await poblarSelectCitasOrden();
        if (selectCita && Array.from(selectCita.options).some(option => option.value === seleccion)) selectCita.value = seleccion;
    }
});

// Restablece los campos del formulario de orden.
function limpiarModalNuevaOrden() {
    const selectCita = document.querySelector('#selectCitaOrden');
    if (selectCita) selectCita.value = '';

    const selectCot = document.querySelector('#selectCotizacionOrden');
    if (selectCot) selectCot.value = '';

    const desc = document.querySelector('#textareaDescripcion');
    if (desc) desc.value = '';

    const wrapCita = document.querySelector('#wrapperSelectCita');
    if (wrapCita) wrapCita.classList.remove('d-none');

    const wrapCot = document.querySelector('#wrapperSelectCotizacion');
    if (wrapCot) wrapCot.classList.remove('d-none');
}

// Maneja el evento click del control .filtro-orden.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.filtro-orden');
    if (!boton) return;

    document.querySelectorAll('.filtro-orden').forEach(b => b.classList.remove('active'));
    boton.classList.add('active');

    filtroOrdenActual = boton.dataset.filtro || 'todas';
    paginaOrdenesActual = 1;
    listarOrdenes();
});

// Maneja el evento input del control #inputBuscarOrden.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarOrden');
    if (!input) return;

    busquedaOrdenActual = input.value.trim();
    paginaOrdenesActual = 1;
    listarOrdenes();
});

// Muestra únicamente las citas y cotizaciones disponibles para crear la OT.
function pintarOrigenesVehiculoOT(vehiculo) {
    const contenedor = document.querySelector('#listaOrigenesVehiculoOT');
    const mensajeVacio = document.querySelector('#mensajeSinOrigenVehiculoOT');
    const botonCrear = document.querySelector('#btnCrearOrdenDesdeVehiculo');
    const contenedorAccionCrear = document.querySelector('#contenedorAccionCrearOrdenDirecta');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    const sucursalId = Number(sucursalActual.id_sucursal);
    const citasDisponibles = listadoGeneralCitas
        .filter(cita => Number(cita.id_vehiculo) === Number(vehiculo.id_vehiculo) &&
            Number(cita.id_sucursal) === sucursalId &&
            ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA'].includes(String(cita.estado || '').toUpperCase()) &&
            Number(cita.tiene_ot) !== 1)
        .sort((a, b) => Number(b.id_cita) - Number(a.id_cita));
    const cotizacionesDisponibles = listadoGeneralCotizaciones
        .filter(cotizacion => Number(cotizacion.id_vehiculo) === Number(vehiculo.id_vehiculo) &&
            Number(cotizacion.id_sucursal) === sucursalId &&
            String(cotizacion.estado || '').toUpperCase() === 'APROBADA' &&
            Number(cotizacion.tiene_ot) !== 1)
        .sort((a, b) => Number(b.id_cotizacion) - Number(a.id_cotizacion));

    const agregarOpcion = (tipo, registro, seleccionada) => {
        const id = tipo === 'CITA' ? registro.id_cita : registro.id_cotizacion;
        const opcion = document.createElement('label');
        opcion.className = 'opcion-origen-ot form-check';

        const icono = document.createElement('span');
        icono.className = 'opcion-origen-ot__icono';
        icono.innerHTML = tipo === 'CITA'
            ? '<i class="bi bi-calendar-check"></i>'
            : '<i class="bi bi-file-earmark-text"></i>';

        const texto = document.createElement('span');
        texto.className = 'opcion-origen-ot__texto';
        const titulo = document.createElement('strong');
        const detalle = document.createElement('small');

        if (tipo === 'CITA') {
            titulo.textContent = 'Cita disponible';
            const fecha = registro.fecha_cita ? formatearFecha(registro.fecha_cita) : '—';
            detalle.textContent = 'N° ' + registro.id_cita + ' · ' + fecha +
                (registro.hora_cita ? ' · ' + registro.hora_cita : '');
        } else {
            titulo.textContent = 'Cotización disponible';
            const fecha = registro.fecha_cotizacion ? formatearFecha(registro.fecha_cotizacion) : '—';
            detalle.textContent = 'COT-' + String(registro.id_cotizacion).padStart(4, '0') +
                ' · ' + fecha + ' · S/ ' + Number(registro.monto_cotizacion || 0).toFixed(2);
        }

        texto.append(titulo, detalle);
        opcion.append(icono, texto);

        const radio = document.createElement('input');
        radio.type = 'checkbox';
        radio.className = 'form-check-input';
        radio.name = 'origenOrdenVehiculo';
        radio.value = (tipo === 'CITA' ? 'CITA:' : 'COTIZACION:') + id;
        radio.checked = seleccionada;
        opcion.prepend(radio);
        opcion.classList.toggle('is-seleccionada', seleccionada);
        contenedor.appendChild(opcion);
    };

    const citaSeleccionada = citasDisponibles[0] || null;
    const cotizacionSeleccionada = cotizacionesDisponibles[0] || null;

    if (citaSeleccionada) agregarOpcion('CITA', citaSeleccionada, false);
    if (cotizacionSeleccionada) agregarOpcion('COTIZACION', cotizacionSeleccionada, false);

    if (mensajeVacio) {
        mensajeVacio.classList.toggle('d-none', Boolean(citaSeleccionada || cotizacionSeleccionada));
    }

    const tieneOrdenActiva = Number(vehiculo.tiene_orden_activa) === 1 ||
        vehiculo.tiene_orden_activa === true;
    const vehiculoActivo = String(vehiculo.estado || '').toUpperCase() === 'ACTIVO';
    if (botonCrear) botonCrear.disabled = !vehiculoActivo || tieneOrdenActiva;
    if (contenedorAccionCrear) contenedorAccionCrear.classList.toggle('d-none', tieneOrdenActiva || !vehiculoActivo);
}
// Mantiene visible la selección actual del origen.
document.addEventListener('change', function (event) {
    const radio = event.target.closest('input[name="origenOrdenVehiculo"]');
    if (!radio) return;
    document.querySelectorAll('.opcion-origen-ot').forEach(opcion => {
        opcion.classList.toggle('is-seleccionada', opcion.contains(radio));
    });
});

// Busca un vehículo por placa para iniciar una OT desde la misma vista.
async function buscarVehiculoParaNuevaOrden() {
    const input = document.querySelector('#inputBuscarOrden');
    const placa = input ? input.value.trim().toUpperCase() : '';
    if (!placa) {
        mostrarToast('advertencia', 'Falta la placa', 'Ingresa la placa del vehículo para buscarlo.');
        return;
    }

    try {
        const respuesta = await axios.get('/api/buscarVehiculoPorPlaca/' + encodeURIComponent(placa));
        const vehiculo = respuesta.data && respuesta.data.vehiculo;
        if (!respuesta.data.ok || !vehiculo) throw new Error('No se encontró un vehículo con esa placa.');

        if (ordenActual) {
            await flushAutoguardadoConsumo();
            if (_autoguardadoConsumoPendiente) {
                mostrarToast('advertencia', 'Guardado pendiente', 'Espera a que se guarden los cambios de la orden actual.');
                return;
            }
        }

        ordenActual = null;
        itemsOT = [];
        limpiarDetalleOrden();
        vehiculoBuscadoOT = vehiculo;
        document.querySelectorAll('.item-orden').forEach(item => item.classList.remove('active'));

        setTexto('#vehiculoBuscadoPlaca', vehiculo.placa || placa);
        setTexto('#vehiculoBuscadoCliente', ((vehiculo.cliente_nombres || '') + ' ' + (vehiculo.cliente_apellidos || '')).trim() || '—');
        setTexto('#vehiculoBuscadoDocumento', vehiculo.cliente_documento || '—');
        setTexto('#vehiculoBuscadoDescripcion', ((vehiculo.marca || '') + ' ' + (vehiculo.modelo || '')).trim() || '—');
        setTexto('#vehiculoBuscadoAnioColor', [vehiculo.anio, vehiculo.color].filter(Boolean).join(' · ') || '—');
        pintarOrigenesVehiculoOT(vehiculo);

        const tarjeta = document.querySelector('#contenedorVehiculoBuscadoOT');
        if (tarjeta) tarjeta.classList.remove('d-none');
        const observacionDirecta = document.querySelector('#contenedorObservacionOrdenDirecta');
        if (observacionDirecta) observacionDirecta.classList.remove('d-none');

        const botonCrear = document.querySelector('#btnCrearOrdenDesdeVehiculo');
        if (botonCrear) botonCrear.title = botonCrear.disabled ? 'El vehículo está inactivo' : '';

        const observacion = document.querySelector('#textareaObservacionOrdenDirecta');
        if (observacion) observacion.value = '';
    } catch (error) {
        console.error(error);
        vehiculoBuscadoOT = null;
        const tarjeta = document.querySelector('#contenedorVehiculoBuscadoOT');
        if (tarjeta) tarjeta.classList.add('d-none');
        const mensaje = error.response && error.response.data && error.response.data.mensaje;
        mostrarToast('error', 'No se encontró el vehículo', mensaje || error.message || 'Verifica la placa e inténtalo nuevamente.');
    }
}

// Ejecuta la búsqueda desde el botón al lado del buscador.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnBuscarVehiculoOT');
    if (!boton) return;
    await buscarVehiculoParaNuevaOrden();
});

// También permite buscar la placa presionando Enter.
document.addEventListener('keydown', async function (event) {
    const input = event.target.closest('#inputBuscarOrden');
    if (!input || event.key !== 'Enter') return;
    event.preventDefault();
    await buscarVehiculoParaNuevaOrden();
});

// Crea una OT desde el origen elegido o genera una cita de ingreso automáticamente.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnCrearOrdenDesdeVehiculo');
    if (!boton || !vehiculoBuscadoOT || boton.disabled) return;

    boton.disabled = true;
    const observacion = document.querySelector('#textareaObservacionOrdenDirecta')?.value.trim();
    const body = {
        id_persona: vehiculoBuscadoOT.id_persona,
        id_sucursal: sucursalActual.id_sucursal,
        id_vehiculo: vehiculoBuscadoOT.id_vehiculo,
        observacion: observacion || ('Ingreso directo del vehículo ' + vehiculoBuscadoOT.placa + '.'),
        fecha_atencion: fechaISO(new Date()),
        ids_mecanicos: mecanicoActual ? [mecanicoActual.id_mecanico] : [],
        items: []
    };

    try {
        const origenesElegidos = Array.from(document.querySelectorAll('input[name="origenOrdenVehiculo"]:checked'));
        const origenesDisponibles = document.querySelectorAll('input[name="origenOrdenVehiculo"]').length;
        if (origenesElegidos.length === 0 && origenesDisponibles > 0) {
            mostrarToast('advertencia', 'Seleccione un origen', 'Marque la cita, la cotización aprobada o ambas antes de crear la OT.');
            return;
        }
        if (origenesElegidos.length === 0) {
            const citaActiva = listadoGeneralCitas.find(cita =>
                Number(cita.id_vehiculo) === Number(vehiculoBuscadoOT.id_vehiculo) &&
                Number(cita.id_sucursal) === Number(sucursalActual.id_sucursal) &&
                ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA'].includes(String(cita.estado || '').toUpperCase()) &&
                Number(cita.tiene_ot) !== 1 && !citaTieneOrden(cita.id_cita)
            );
            if (citaActiva) {
                mostrarToast('advertencia', 'Cita activa existente', 'Seleccione la cita activa que ya tiene este vehículo.');
                return;
            }
            body.crear_cita_automatica = true;
        } else {
            for (const origenElegido of origenesElegidos) {
                const [tipo, id] = origenElegido.value.split(':');
                if (tipo === 'CITA') {
                    const cita = listadoGeneralCitas.find(item => Number(item.id_cita) === Number(id));
                    if (!cita || Number(cita.id_vehiculo) !== Number(vehiculoBuscadoOT.id_vehiculo)) throw new Error('La cita seleccionada ya no está disponible.');
                    body.id_cita = Number(cita.id_cita);
                    if (!observacion && cita.motivo) body.observacion = cita.motivo;
                } else {
                    const respuesta = await axios.get('/api/buscarCotizacionConDetalle/' + id);
                    const cot = respuesta.data && respuesta.data.cotizacion;
                    if (!respuesta.data.ok || !cot || Number(cot.id_vehiculo) !== Number(vehiculoBuscadoOT.id_vehiculo) ||
                        Number(cot.id_persona) !== Number(vehiculoBuscadoOT.id_persona) || Number(cot.id_sucursal) !== Number(sucursalActual.id_sucursal)) {
                        throw new Error('La cotización seleccionada ya no está disponible para este vehículo.');
                    }
                    body.id_cotizacion = Number(cot.id_cotizacion);
                    if (!observacion && !body.id_cita && cot.observacion) body.observacion = cot.observacion;
                    body.items = (cot.items || []).map(item => ({ id_producto: item.id_producto, id_servicio: item.id_servicio, cantidad: Number(item.cantidad), precio_unitario: Number(item.precio_unitario), observacion: item.observacion || null }));
                }
            }
        }

        const respuesta = await axios.post('/api/registrarOrden', body);
        if (!respuesta.data || !respuesta.data.ok || !respuesta.data.id_orden_trabajo) {
            throw new Error((respuesta.data && respuesta.data.mensaje) || 'No se pudo crear la orden.');
        }

        mostrarToast('exito', 'Orden creada', 'La orden de trabajo quedó vinculada a su origen.');
        const tarjeta = document.querySelector('#contenedorVehiculoBuscadoOT');
        if (tarjeta) tarjeta.classList.add('d-none');
        const accionCrearOT = document.querySelector('#contenedorAccionCrearOrdenDirecta');
        if (accionCrearOT) accionCrearOT.classList.add('d-none');
        vehiculoBuscadoOT = null;
        filtroOrdenActual = 'todas';
        document.querySelectorAll('.filtro-orden').forEach(filtro => {
            filtro.classList.toggle('active', filtro.dataset.filtro === 'todas');
        });
        await Promise.all([cargarOrdenes(), cargarCitas(), cargarCotizaciones()]);
        listarOrdenes();
        await cargarOrdenActual(respuesta.data.id_orden_trabajo);
    } catch (error) {
        console.error(error);
        const mensaje = error.response && error.response.data && error.response.data.mensaje;
        mostrarToast('error', 'No se pudo crear la orden', mensaje || error.message || 'Inténtalo nuevamente.');
    } finally {
        boton.disabled = false;
    }
});

// Maneja el evento input del control #inputBuscarServicioOT.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarServicioOT');
    if (!input) return;
    busquedaServicioOT = input.value.trim();
    poblarListaServiciosOT();
});

// Maneja el evento input del control #inputBuscarProductoOT.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarProductoOT');
    if (!input) return;
    busquedaProductoOT = input.value.trim();
    poblarListaProductosOT();
});

// Maneja el evento click del control .item-orden.
document.addEventListener('click', async function (event) {
    const item = event.target.closest('.item-orden');
    if (!item) return;

    const idOrden = item.dataset.id;
    if (!idOrden) return;

    // Flush del consumo pendiente antes de cambiar de orden
    await flushAutoguardadoConsumo();

    document.querySelectorAll('.item-orden').forEach(b => b.classList.remove('active'));
    item.classList.add('active');

    await cargarOrdenActual(idOrden);
});

// Maneja el evento keypress del control #inputIrPaginaOrdenes.
document.addEventListener('keypress', function (event) {
    const input = event.target.closest('#inputIrPaginaOrdenes');
    if (!input) return;
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const pagina = Number(input.value);
    if (!pagina || isNaN(pagina) || pagina < 1) return;

    const totalPaginas = Math.max(1, Math.ceil(listadoGeneralOrdenes.length / porPaginaOrdenes));
    paginaOrdenesActual = Math.min(pagina, totalPaginas);
    listarOrdenes();
});

// Obtiene o crea el ticket de una orden finalizada y devuelve sus datos.
async function obtenerTicketOT(idOrden) {
    const respuesta = await axios.post('/api/emitirTicketOT/' + idOrden);
    const ticket = respuesta.data && respuesta.data.ticket;

    if (!respuesta.data || !respuesta.data.ok || !ticket || !ticket.id_comprobante) {
        throw new Error((respuesta.data && respuesta.data.mensaje) || 'No se pudo preparar el ticket.');
    }

    return ticket;
}

// Carga el PDF dentro del modal para verlo y descargarlo desde la misma página.
async function mostrarPDFTicketOT(idComprobante, tipo = 'general', mostrarFiltrosFinalizacion = false) {
    const modal = document.querySelector('#modalTicketPDF');
    const visor = document.querySelector('#iframeTicketPDF');
    const botonDescargar = document.querySelector('#btnDescargarTicketPDF');
    const filtrosFinalizacion = document.querySelector('#contenedorFiltrosTicketFinalizacion');

    if (!modal || !visor || !botonDescargar) throw new Error('No se encontró la ventana del ticket en la página.');

    const respuesta = await axios.get('/api/descargarTicketPDFOT/' + idComprobante, { params: { tipo }, responseType: 'blob' });
    const archivo = new Blob([respuesta.data], { type: 'application/pdf' });
    const urlArchivo = URL.createObjectURL(archivo);
    const disposicion = respuesta.headers && respuesta.headers['content-disposition'];
    const coincidencia = /filename="?([^";]+)"?/i.exec(disposicion || '');

    if (ticketPDFActualURL) URL.revokeObjectURL(ticketPDFActualURL);
    ticketPDFActualURL = urlArchivo;
    ticketPDFActualComprobante = idComprobante;
    ticketPDFActualTipo = tipo;
    ticketPDFActualNombre = coincidencia ? coincidencia[1] : 'ticket-ot-' + idComprobante + '-' + tipo + '.pdf';
    visor.src = urlArchivo;
    botonDescargar.disabled = false;
    if (filtrosFinalizacion) filtrosFinalizacion.classList.toggle('d-none', !mostrarFiltrosFinalizacion);
    if (mostrarFiltrosFinalizacion) {
        document.querySelectorAll('.filtro-ticket-finalizacion').forEach(boton => {
            boton.classList.toggle('active', boton.dataset.tipo === tipo);
        });
    }
    bootstrap.Modal.getOrCreateInstance(modal).show();
}

// Habilita solo los formatos que tienen conceptos en la orden recién finalizada.
function prepararFiltrosTicketFinalizacion(ticket) {
    const items = ticket.items || [];
    const disponibles = {
        general: items.length > 0,
        servicios: items.some(item => String(item.descripcion || '').startsWith('Servicio:')),
        productos: items.some(item => String(item.descripcion || '').startsWith('Producto:'))
    };
    const contenedor = document.querySelector('#contenedorFiltrosTicketFinalizacion');
    if (contenedor) contenedor.classList.remove('d-none');
    document.querySelectorAll('.filtro-ticket-finalizacion').forEach(boton => {
        boton.dataset.disponible = String(Boolean(disponibles[boton.dataset.tipo]));
        boton.disabled = !disponibles[boton.dataset.tipo];
        boton.classList.toggle('active', boton.dataset.tipo === 'general');
    });
}

// Cambia la vista previa al tipo seleccionado después de finalizar la orden.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.filtro-ticket-finalizacion');
    const contenedor = document.querySelector('#contenedorFiltrosTicketFinalizacion');
    if (!boton || !contenedor || contenedor.classList.contains('d-none') || boton.disabled || ticketPDFCargando) return;
    if (!ticketPDFActualComprobante) return;

    ticketPDFCargando = true;
    document.querySelectorAll('.filtro-ticket-finalizacion').forEach(item => { item.disabled = true; });
    try {
        await mostrarPDFTicketOT(ticketPDFActualComprobante, boton.dataset.tipo || 'general', true);
    } catch (error) {
        console.error(error);
        const mensaje = error.response && error.response.data && error.response.data.mensaje;
        mostrarToast('error', 'No se pudo cambiar el ticket', mensaje || error.message || 'Inténtalo nuevamente.');
    } finally {
        ticketPDFCargando = false;
        document.querySelectorAll('.filtro-ticket-finalizacion').forEach(item => {
            item.disabled = item.dataset.disponible !== 'true';
        });
    }
});

// Libera el PDF cuando se cierra el modal.
function limpiarTicketPDFActual() {
    const visor = document.querySelector('#iframeTicketPDF');
    const botonDescargar = document.querySelector('#btnDescargarTicketPDF');
    if (visor) visor.src = 'about:blank';
    if (botonDescargar) botonDescargar.disabled = true;
    const filtrosFinalizacion = document.querySelector('#contenedorFiltrosTicketFinalizacion');
    if (filtrosFinalizacion) filtrosFinalizacion.classList.add('d-none');
    ticketPDFActualComprobante = null;
    ticketPDFActualTipo = 'general';
    ticketPDFCargando = false;

    if (ticketPDFActualURL) {
        const urlAnterior = ticketPDFActualURL;
        ticketPDFActualURL = null;
        setTimeout(() => URL.revokeObjectURL(urlAnterior), 1000);
    }
}

// Crea el ticket y lo muestra en el modal después de finalizar la orden.
async function mostrarTicketTrasFinalizar(idOrden) {
    try {
        const ticket = await obtenerTicketOT(idOrden);
        prepararFiltrosTicketFinalizacion(ticket);
        await mostrarPDFTicketOT(ticket.id_comprobante, 'general', true);
    } catch (error) {
        console.error(error);
        const mensaje = error.response && error.response.data && error.response.data.mensaje;
        mostrarToast(
            'advertencia',
            'Orden finalizada',
            (mensaje || error.message || 'No se pudo preparar el ticket.') + ' Puedes reintentarlo desde el historial.'
        );
    }
}

// Maneja el evento click del control .cambiar-estado-orden.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.cambiar-estado-orden');
    if (!boton) return;
    if (!ordenActual) return;
    if (boton.disabled) return;

    const nuevoEstado = boton.dataset.estado;
    if (!nuevoEstado) return;

    const transicionesPermitidas = {
        'PENDIENTE':  ['EN PROCESO'],
        'EN PROCESO': ['FINALIZADA'],
        'FINALIZADA': [],
        'CANCELADA':  []
    };
    const permitidos = transicionesPermitidas[ordenActual.estado] || [];
    if (!permitidos.includes(nuevoEstado)) {
        mostrarToast('advertencia', 'No permitido', `No se puede pasar de ${ordenActual.estado} a ${nuevoEstado}`);
        return;
    }

    const mensaje = nuevoEstado === 'FINALIZADA'
        ? '¿Finalizar esta orden? Ya no podrá modificar el consumo.'
        : `¿Cambiar el estado de la orden a "${nuevoEstado}"?`;
    const confirmar = confirm(mensaje);
    if (!confirmar) return;

    // Si vamos a finalizar, asegurar que el consumo esté persistido
    if (nuevoEstado === 'FINALIZADA') {
        await flushAutoguardadoConsumo();
        if (_autoguardadoConsumoPendiente) {
            mostrarToast('advertencia', 'Guardado pendiente',
                'No se pudo guardar el consumo. Revisa y reintenta antes de finalizar.');
            return;
        }
    }

    const idOrdenActualizada = ordenActual.id_orden_trabajo;

    try {
        const res = await axios.patch('/api/cambiarEstadoOrden/' + idOrdenActualizada, {
            estado: nuevoEstado
        });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        if (nuevoEstado === 'FINALIZADA') {
            await mostrarTicketTrasFinalizar(idOrdenActualizada);
        } else {
            mostrarToast('exito', 'Correcto', 'Estado actualizado a ' + nuevoEstado);
        }

        await cargarOrdenes();
        await cargarOrdenActual(idOrdenActualizada);
        listarOrdenes();

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control #btnAbrirModalOrden.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('#btnAbrirModalOrden');
    if (!boton) return;

    abrirModalNuevaOrden();
});

// Maneja el evento click del control #btnGuardarOrden.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnGuardarOrden');
    if (!boton) return;

    if (_enviandoOrden) return;
    _enviandoOrden = true;

    try {
        const idCita = document.querySelector('#selectCitaOrden').value;
        const idCotizacion = document.querySelector('#selectCotizacionOrden').value;
        const observacion = document.querySelector('#textareaDescripcion').value.trim();
        if (!idCita && !idCotizacion) {
            mostrarToast('advertencia', 'Falta origen', 'Seleccione una cita, una cotización aprobada o ambas.');
            return;
        }

        const body = { observacion, fecha_atencion: fechaISO(new Date()), ids_mecanicos: mecanicoActual ? [mecanicoActual.id_mecanico] : [], items: [] };
        let cita = null;
        let cot = null;

        if (idCita) {
            const resCita = await axios.get('/api/buscarCitaPorId/' + idCita);
            if (!resCita.data.ok || !resCita.data.cita) { mostrarToast('error', 'Error', 'No se pudo cargar la cita'); return; }
            cita = resCita.data.cita;
            body.id_cita = Number(cita.id_cita);
        }
        if (idCotizacion) {
            const resCot = await axios.get('/api/buscarCotizacionConDetalle/' + idCotizacion);
            if (!resCot.data.ok || !resCot.data.cotizacion) { mostrarToast('error', 'Error', 'No se pudo cargar la cotización'); return; }
            cot = resCot.data.cotizacion;
            body.id_cotizacion = Number(cot.id_cotizacion);
            body.items = (cot.items || []).map(it => ({ id_producto: it.id_producto, id_servicio: it.id_servicio, cantidad: Number(it.cantidad), precio_unitario: Number(it.precio_unitario), observacion: it.observacion || null }));
        }

        const origen = cita || cot;
        if (cita && cot && (Number(cita.id_vehiculo) !== Number(cot.id_vehiculo) || Number(cita.id_persona) !== Number(cot.id_persona) || Number(cita.id_sucursal) !== Number(cot.id_sucursal))) {
            mostrarToast('advertencia', 'Orígenes distintos', 'La cita y la cotización deben pertenecer al mismo vehículo, cliente y sucursal.');
            return;
        }
        body.id_persona = Number(origen.id_persona);
        body.id_sucursal = Number(origen.id_sucursal || sucursalActual.id_sucursal);
        body.id_vehiculo = Number(origen.id_vehiculo);
        if (!body.observacion) body.observacion = (cita && cita.motivo) || (cot && cot.observacion) || '';

        const res = await axios.post('/api/registrarOrden', body);

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        mostrarToast('exito', 'Correcto', 'Orden creada correctamente');

        await cargarOrdenes();
        await cargarCotizaciones();
        await cargarCitas();
        listarOrdenes();

        cerrarModal('#modalNuevaOrden');
        limpiarModalNuevaOrden();

        await cargarOrdenActual(res.data.id_orden_trabajo);

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    } finally {
        _enviandoOrden = false;
    }
});

// Maneja el evento click del control .btn-agregar-servicio-ot.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-agregar-servicio-ot');
    if (!boton) return;
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') return;

    const idServicio = boton.dataset.id;
    if (!idServicio) return;

    const servicio = listadoGeneralServicios.find(s => s.id_servicio == idServicio);
    if (!servicio) return;

    const precio = Number(servicio.precio_regular || servicio.precio_base || 0);

    // Si ya existe el servicio en la lista → solo incrementar cantidad
    const existente = itemsOT.find(it => it.id_servicio == idServicio);

    if (existente) {
        existente.cantidad = Number(existente.cantidad) + 1;
        existente.subtotal = Number(existente.precio_unitario) * existente.cantidad;
    } else {
        itemsOT.push({
            id_producto: null,
            id_servicio: Number(idServicio),
            tipo: 'SERVICIO',
            descripcion: servicio.nombre,
            cantidad: 1,
            precio_unitario: precio,
            subtotal: precio
        });
    }

    listarItemsOT();
    recalcularTotalesOT();
    programarAutoguardadoConsumo();

    // Reset búsqueda servicios OT
    busquedaServicioOT = '';
    const inp = document.querySelector('#inputBuscarServicioOT');
    if (inp) inp.value = '';
    poblarListaServiciosOT();
});

// Maneja el evento click del control .btn-agregar-producto-ot.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-agregar-producto-ot');
    if (!boton) return;
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') return;

    const idProducto = boton.dataset.id;
    if (!idProducto) return;

    const producto = listadoGeneralProductos.find(p => p.id_producto == idProducto);
    if (!producto) return;

    const precio = Number(producto.precio_venta || 0);

    // Si ya existe el producto en la lista → solo incrementar cantidad
    const existente = itemsOT.find(it => it.id_producto == idProducto);

    if (existente) {
        existente.cantidad = Number(existente.cantidad) + 1;
        existente.subtotal = Number(existente.precio_unitario) * existente.cantidad;
    } else {
        itemsOT.push({
            id_producto: Number(idProducto),
            id_servicio: null,
            tipo: 'PRODUCTO',
            descripcion: producto.nombre,
            cantidad: 1,
            precio_unitario: precio,
            subtotal: precio
        });
    }

    listarItemsOT();
    recalcularTotalesOT();
    programarAutoguardadoConsumo();

    // Reset búsqueda productos OT
    busquedaProductoOT = '';
    const inp = document.querySelector('#inputBuscarProductoOT');
    if (inp) inp.value = '';
    poblarListaProductosOT();
});

// Maneja el evento click del control .btn-sumar-ot.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-sumar-ot');
    if (!boton) return;
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') return;

    const index = Number(boton.dataset.index);
    if (isNaN(index)) return;

    const item = itemsOT[index];
    if (!item) return;

    item.cantidad = Number(item.cantidad) + 1;
    item.subtotal = Number(item.precio_unitario) * item.cantidad;

    listarItemsOT();
    recalcularTotalesOT();
    programarAutoguardadoConsumo();
});

// Maneja el evento click del control .btn-restar-ot.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-restar-ot');
    if (!boton) return;
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') return;

    const index = Number(boton.dataset.index);
    if (isNaN(index)) return;

    const item = itemsOT[index];
    if (!item) return;

    item.cantidad = Number(item.cantidad) - 1;
    if (item.cantidad < 1) item.cantidad = 1;
    item.subtotal = Number(item.precio_unitario) * item.cantidad;

    listarItemsOT();
    recalcularTotalesOT();
    programarAutoguardadoConsumo();
});

// Maneja el evento change del control .input-cantidad-ot.
document.addEventListener('change', function (event) {
    const input = event.target.closest('.input-cantidad-ot');
    if (!input) return;
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') return;

    const index = Number(input.dataset.index);
    if (isNaN(index)) return;

    const item = itemsOT[index];
    if (!item) return;

    let cant = Number(input.value);
    if (!cant || cant < 1) cant = 1;

    item.cantidad = cant;
    item.subtotal = Number(item.precio_unitario) * cant;

    listarItemsOT();
    recalcularTotalesOT();
    programarAutoguardadoConsumo();
});

// Maneja el evento click del control .btn-quitar-ot.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-quitar-ot');
    if (!boton) return;
    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') return;

    const index = Number(boton.dataset.index);
    if (isNaN(index)) return;

    itemsOT.splice(index, 1);

    listarItemsOT();
    recalcularTotalesOT();
    programarAutoguardadoConsumo();
});

// Maneja el evento click del control #btnSubirEvidencias.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('#btnSubirEvidencias');
    if (!boton) return;

    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') {
        mostrarToast('advertencia', 'No permitido', 'Solo puede subir evidencias cuando la orden está EN PROCESO');
        return;
    }

    const input = document.querySelector('#inputEvidencias');
    if (!input) return;

    input.click();
});

// Maneja el evento change del control #inputEvidencias.
document.addEventListener('change', function (event) {
    const input = event.target.closest('#inputEvidencias');
    if (!input) return;

    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') {
        input.value = '';
        return;
    }

    const archivos = Array.from(input.files || []);
    if (archivos.length === 0) return;

    const titulo = (document.querySelector('#inputTituloEvidencia').value || '').trim();
    const descripcion = (document.querySelector('#textareaDescripcionEvidencia').value || '').trim();

    for (const archivo of archivos) {
        if (!archivo.type || !archivo.type.startsWith('image/')) {
            mostrarToast('advertencia', 'Formato no permitido', archivo.name + ' no es un archivo de imagen.');
            continue;
        }
        if (archivo.size <= 0) {
            mostrarToast('advertencia', 'Archivo vacío', archivo.name + ' no contiene datos.');
            continue;
        }
        if (archivo.size > MAX_MB_EVIDENCIA * 1024 * 1024) {
            mostrarToast('advertencia', 'Archivo muy grande',
                `${archivo.name} supera ${MAX_MB_EVIDENCIA} MB`);
            continue;
        }

        if (evidenciasGuardadas.length + evidenciasPendientes.length >= MAX_EVIDENCIAS) {
            mostrarToast('advertencia', 'Límite alcanzado',
                `Máximo ${MAX_EVIDENCIAS} evidencias por orden`);
            break;
        }

        const urlPreview = URL.createObjectURL(archivo);

        evidenciasPendientes.push({
            archivo,
            titulo,
            descripcion,
            urlPreview
        });
        archivosEvidenciaPendientes.push(archivo);
    }

    const inputTitulo = document.querySelector('#inputTituloEvidencia');
    if (inputTitulo) inputTitulo.value = '';
    const txtDesc = document.querySelector('#textareaDescripcionEvidencia');
    if (txtDesc) txtDesc.value = '';

    input.value = '';
    pintarEvidenciasOT();
});

// Maneja el evento click del control .btn-quitar-evidencia-pendiente.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.btn-quitar-evidencia-pendiente');
    if (!boton) return;

    const index = Number(boton.dataset.index);
    if (isNaN(index)) return;

    const eliminada = evidenciasPendientes.splice(index, 1)[0];
    if (eliminada && eliminada.urlPreview) {
        URL.revokeObjectURL(eliminada.urlPreview);
    }

    pintarEvidenciasOT();
});

// Maneja el evento click del control .evidencia-card__quitar.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.evidencia-card__quitar');
    if (!boton) return;
    if (boton.classList.contains('btn-quitar-evidencia-pendiente')) return;

    if (!ordenActual || ordenActual.estado !== 'EN PROCESO') {
        mostrarToast('advertencia', 'No permitido', 'Solo puede eliminar evidencias cuando la orden está EN PROCESO');
        return;
    }

    const idEvidencia = boton.dataset.id;
    if (!idEvidencia) return;

    const confirmar = confirm('¿Eliminar esta evidencia?');
    if (!confirmar) return;

    try {
        const res = await axios.delete('/api/eliminarEvidencia/' + idEvidencia);

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        mostrarToast('exito', 'Correcto', 'Evidencia eliminada');

        await cargarInformePorOrden(ordenActual.id_orden_trabajo);
        pintarEvidenciasOT();

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// Maneja el evento click del control #btnGuardarEvidencias.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnGuardarEvidencias');
    if (!boton) return;
    if (!ordenActual) return;

    if (ordenActual.estado !== 'EN PROCESO') {
        mostrarToast('advertencia', 'No permitido', 'Solo puede guardar evidencias cuando la orden está EN PROCESO');
        return;
    }

    if (evidenciasPendientes.length === 0) {
        mostrarToast('advertencia', 'Sin evidencias', 'Suba al menos una imagen');
        return;
    }

    if (_enviandoEvidencias) return;
    _enviandoEvidencias = true;

    try {
        if (!idInformeActual) {
            if (!mecanicoActual) {
                mostrarToast('error', 'Error', 'No se encontró tu registro de mecánico');
                return;
            }

            const resCrear = await axios.post(
                '/api/obtenerOCrearInforme/' + ordenActual.id_orden_trabajo,
                { id_mecanico: mecanicoActual.id_mecanico }
            );

            if (!resCrear.data.ok || !resCrear.data.informe) {
                mostrarToast('error', 'Error', 'No se pudo crear el informe');
                return;
            }

            idInformeActual = resCrear.data.informe.id_informe;
        }

        const formData = new FormData();

        evidenciasPendientes.forEach(ev => {
            formData.append('evidencias', ev.archivo);

            let descripcion = '';
            if (ev.titulo) descripcion += ev.titulo;
            if (ev.descripcion) {
                if (descripcion) descripcion += ' — ';
                descripcion += ev.descripcion;
            }
            formData.append('descripciones[]', descripcion);
        });

        const res = await axios.post(
            '/api/agregarEvidencias/' + idInformeActual,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        mostrarToast('exito', 'Correcto', 'Evidencias guardadas');

        evidenciasPendientes.forEach(ev => {
            if (ev.urlPreview) URL.revokeObjectURL(ev.urlPreview);
        });
        evidenciasPendientes = [];
        archivosEvidenciaPendientes = [];

        await cargarInformePorOrden(ordenActual.id_orden_trabajo);
        pintarEvidenciasOT();

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    } finally {
        _enviandoEvidencias = false;
    }
});

// ============================================================
// SECCION HISTORIAL
// ============================================================
// Inserta el historial y prepara búsqueda y paginación.
function renderHistorial() {
    contenedorReactivo.innerHTML = "";
    const clone = templateContenedorHistorial.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    paginaHistorialActual = 1;
    busquedaHistorialActual = '';

    const inputBuscar = document.querySelector('#inputBuscarHistorial');
    if (inputBuscar) inputBuscar.value = '';

    sincronizarSelectPorPagina('historial', porPaginaHistorial);

    listarHistorial();
}

// Filtra, pagina y pinta las órdenes finalizadas.
function listarHistorial(filtradas) {
    let contenedor = document.querySelector('#contenedorTablaHistorial');
    if (!contenedor) return;
    const templateFila = document.querySelector('#templateFilaHistorial').content;
    contenedor.innerHTML = "";

    let base = filtradas;

    if (!base) {
        base = listadoGeneralOrdenes.filter(o => o.estado === 'FINALIZADA');

        if (busquedaHistorialActual) {
            const q = busquedaHistorialActual.toLowerCase();
            base = base.filter(o => {
                const codigo = 'OT-' + String(o.id_orden_trabajo).padStart(4, '0').toLowerCase();
                const cliente = `${o.cliente_nombres || ''} ${o.cliente_apellidos || ''}`.toLowerCase();
                const placa = (o.placa || '').toLowerCase();
                return codigo.includes(q) || cliente.includes(q) || placa.includes(q);
            });
        }
    }

    const totalPaginas = Math.max(1, Math.ceil(base.length / porPaginaHistorial));
    if (paginaHistorialActual > totalPaginas) paginaHistorialActual = totalPaginas;
    const inicio = (paginaHistorialActual - 1) * porPaginaHistorial;
    const pagina = base.slice(inicio, inicio + porPaginaHistorial);

    setTexto('#contadorHistorial', String(base.length));

    pagina.forEach(orden => {
        const clone = templateFila.cloneNode(true);

        clone.querySelector('.codigo-historial').textContent =
            'OT-' + String(orden.id_orden_trabajo).padStart(4, '0');
        clone.querySelector('.fecha-historial').textContent =
            orden.fecha_atencion ? formatearFecha(orden.fecha_atencion) : '—';
        clone.querySelector('.cliente-historial').textContent =
            `${orden.cliente_nombres || ''} ${orden.cliente_apellidos || ''}`.trim();
        clone.querySelector('.vehiculo-historial').textContent =
            `${orden.placa || ''} · ${orden.marca || ''} ${orden.modelo || ''}`.trim();
        clone.querySelector('.descripcion-historial').textContent = orden.observacion || '—';
        clone.querySelector('.btn-ver-historial').dataset.id = orden.id_orden_trabajo;

        contenedor.appendChild(clone);
    });

    actualizarPaginacionHistorial(paginaHistorialActual, totalPaginas, base.length, pagina.length);
}

// Actualiza controles y rango de la paginación del historial.
function actualizarPaginacionHistorial(pagina, totalPaginas, totalRegistros, registrosPagina) {
    const btnNum = document.querySelector('#btnHistorialPaginaNumero');
    if (btnNum) btnNum.textContent = String(pagina);

    actualizarBotonesPaginacion('Historial', pagina, totalPaginas);

    const inicio = totalRegistros === 0 ? 0 : ((pagina - 1) * porPaginaHistorial) + 1;
    const fin    = totalRegistros === 0 ? 0 : inicio + registrosPagina - 1;
    actualizarInfoRango('infoRangoHistorial', inicio, fin, totalRegistros);
    actualizarIrPagina('inputIrPaginaHistorial', pagina, totalPaginas);
}

// Maneja el evento input del control #inputBuscarHistorial.
document.addEventListener('input', function (event) {
    const input = event.target.closest('#inputBuscarHistorial');
    if (!input) return;

    busquedaHistorialActual = input.value.trim();
    paginaHistorialActual = 1;
    listarHistorial();
});

// Maneja el evento keypress del control #inputIrPaginaHistorial.
document.addEventListener('keypress', function (event) {
    const input = event.target.closest('#inputIrPaginaHistorial');
    if (!input) return;
    if (event.key !== 'Enter') return;

    event.preventDefault();
    const pagina = Number(input.value);
    if (!pagina || isNaN(pagina) || pagina < 1) return;

    const finalizadas = listadoGeneralOrdenes.filter(o => o.estado === 'FINALIZADA');
    const totalPaginas = Math.max(1, Math.ceil(finalizadas.length / porPaginaHistorial));
    paginaHistorialActual = Math.min(pagina, totalPaginas);
    listarHistorial();
});

// Filtra la tabla del historial y recalcula el monto del PDF seleccionado.
function renderDetallesTicketHistorial() {
    const contenedor = document.querySelector('#contenedorVerHistorialConsumo');
    const template = document.querySelector('#templateFilaConsumoHistorial');
    const botonImprimir = document.querySelector('#btnImprimirTicketHistorial');
    if (!contenedor || !template) return;

    const tipo = tipoTicketHistorialActual;
    const items = detallesTicketHistorial.filter(item => {
        if (tipo === 'general') return true;
        const esProducto = String(item.tipo || '').toUpperCase() === 'PRODUCTO' || item.id_producto != null;
        return tipo === 'productos' ? esProducto : !esProducto;
    });

    contenedor.innerHTML = '';
    let total = 0;
    items.forEach(item => {
        const cantidad = Number(item.cantidad || 0);
        const precio = Number(item.precio_unitario || 0);
        const subtotal = Number(item.subtotal || precio * cantidad);
        const clone = template.content.cloneNode(true);
        clone.querySelector('.nombre-consumo').textContent = item.descripcion || '—';
        clone.querySelector('.cantidad-consumo').textContent = cantidad;
        clone.querySelector('.precio-consumo').textContent = 'S/ ' + precio.toFixed(2);
        clone.querySelector('.subtotal-consumo').textContent = 'S/ ' + subtotal.toFixed(2);
        total += subtotal;
        contenedor.appendChild(clone);
    });

    if (items.length === 0) {
        const fila = document.createElement('tr');
        fila.innerHTML = '<td colspan="4" class="text-center text-muted py-3">No hay conceptos de este tipo en la orden.</td>';
        contenedor.appendChild(fila);
    }

    setTexto('#verHistorialTotalConsumo', 'S/ ' + total.toFixed(2));
    if (botonImprimir) botonImprimir.disabled = items.length === 0;
}

// Cambia el filtro que se usará tanto en la tabla como en el PDF.
document.addEventListener('click', function (event) {
    const boton = event.target.closest('.filtro-ticket-historial');
    if (!boton) return;

    tipoTicketHistorialActual = boton.dataset.filtroTicket || 'general';
    document.querySelectorAll('.filtro-ticket-historial').forEach(item => {
        item.classList.toggle('active', item === boton);
    });
    renderDetallesTicketHistorial();
});

// Abre el ticket de una orden finalizada desde el historial.
document.addEventListener('click', async function (event) {
    const botonDescargar = event.target.closest('#btnDescargarTicketPDF');
    if (botonDescargar) {
        if (!ticketPDFActualURL || botonDescargar.disabled) return;
        const enlace = document.createElement('a');
        enlace.href = ticketPDFActualURL;
        enlace.download = ticketPDFActualNombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        return;
    }

    const boton = event.target.closest('#btnImprimirTicketHistorial');
    if (!boton || boton.disabled) return;

    const modalHistorial = document.querySelector('#modalVerHistorial');
    const idOrden = modalHistorial && modalHistorial.dataset.idOrden;
    if (!idOrden) return;

    boton.disabled = true;
    try {
        const ticket = await obtenerTicketOT(idOrden);
        await mostrarPDFTicketOT(ticket.id_comprobante, tipoTicketHistorialActual);
    } catch (error) {
        console.error(error);
        const mensaje = error.response && error.response.data && error.response.data.mensaje;
        mostrarToast('error', 'No se pudo abrir el ticket', mensaje || error.message || 'Inténtalo nuevamente.');
    } finally {
        boton.disabled = false;
        renderDetallesTicketHistorial();
    }
});
// Maneja el evento click del control .btn-ver-historial.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('.btn-ver-historial');
    if (!boton) return;

    const idOrden = boton.dataset.id;
    if (!idOrden) return;

    try {
        const res = await axios.get('/api/buscarOrdenConDetalle/' + idOrden);
        if (!res.data.ok || !res.data.orden) {
            mostrarToast('error', 'Error', 'No se pudo cargar la orden');
            return;
        }

        const orden = res.data.orden;
        const modalHistorial = document.querySelector('#modalVerHistorial');
        if (modalHistorial) modalHistorial.dataset.idOrden = idOrden;
        tipoTicketHistorialActual = 'general';
        detallesTicketHistorial = orden.detalles || [];
        document.querySelectorAll('.filtro-ticket-historial').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filtroTicket === 'general');
        });
        setTexto('#verHistorialCodigo', 'OT-' + String(orden.id_orden_trabajo).padStart(4, '0'));
        setTexto('#verHistorialFecha', orden.fecha_atencion ? formatearFecha(orden.fecha_atencion) : '—');
        setTexto('#verHistorialCliente',
            `${orden.cliente_nombres || ''} ${orden.cliente_apellidos || ''}`.trim() || '—');
        setTexto('#verHistorialVehiculo',
            `${orden.placa || ''} · ${orden.marca || ''} ${orden.modelo || ''}`.trim() || '—');
        setTexto('#verHistorialDescripcion', orden.observacion || '—');

        renderDetallesTicketHistorial();

        const contEvid = document.querySelector('#contenedorEvidenciasHistorial');
        const album = document.querySelector('#albumEvidenciasHistorial');
        if (album) album.innerHTML = '';

        try {
            const resInf = await axios.get('/api/buscarInformePorOrden/' + idOrden);
            const informe = resInf.data.ok ? resInf.data.informe : null;
            const evidencias = informe ? (informe.evidencias || []) : [];

            if (evidencias.length > 0 && album) {
                const templateEv = document.querySelector('#templateEvidenciaGuardada').content;
                evidencias.forEach(ev => {
                    const clone = templateEv.cloneNode(true);

                    clone.querySelector('.evidencia-card__img').src = ev.url_archivo || '';
                    clone.querySelector('.evidencia-card__desc').textContent = ev.descripcion || '';
                    clone.querySelector('.evidencia-card__fecha').textContent =
                        ev.fecha_registro ? formatearFecha(ev.fecha_registro) : '';

                    const btn = clone.querySelector('.evidencia-card__quitar');
                    if (btn) btn.remove();

                    album.appendChild(clone);
                });
                if (contEvid) contEvid.classList.remove('d-none');
            } else {
                if (contEvid) contEvid.classList.add('d-none');
            }
        } catch (e) {
            if (contEvid) contEvid.classList.add('d-none');
        }

        abrirModal('#modalVerHistorial');

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    }
});

// ============================================================
// SECCION AGENDA (accesible, NO funcional por ahora)
// ============================================================
// Inserta la vista de agenda y muestra el nombre del mecánico.
function renderAgenda() {
    contenedorReactivo.innerHTML = "";
    const clone = templateContenedorAgenda.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    if (mecanicoActual) {
        setTexto('#agendaNombreMecanico',
            `${mecanicoActual.nombres || ''} ${mecanicoActual.apellidos || ''}`.trim() || 'Mecánico');
    }
}

// ============================================================
// HANDLER GLOBAL: PAGINACIÓN (flechas / número / ir a página)
// ============================================================
// Maneja el evento click delegado en los controles de la vista.
document.addEventListener('click', function (event) {
    const item = event.target.closest(
        '#contenedorPaginacionOrdenes [data-pagina], ' +
        '#contenedorPaginacionHistorial [data-pagina], ' +
        '#contenedorPaginacionClientes [data-pagina], ' +
        '#contenedorPaginacionCitas [data-pagina], ' +
        '#contenedorPaginacionCotizaciones [data-pagina]'
    );
    if (!item) return;

    if (item.classList.contains('disabled')) {
        event.preventDefault();
        return;
    }

    const pagina = Number(item.dataset.pagina);
    if (!pagina || isNaN(pagina) || pagina < 1) return;

    event.preventDefault();

    if (item.closest('#contenedorPaginacionOrdenes')) {
        paginaOrdenesActual = pagina;
        listarOrdenes();
        return;
    }

    if (item.closest('#contenedorPaginacionHistorial')) {
        paginaHistorialActual = pagina;
        listarHistorial();
        return;
    }

    if (item.closest('#contenedorPaginacionClientes')) {
        paginaClientesActual = pagina;
        listarClientes();
        return;
    }

    if (item.closest('#contenedorPaginacionCitas')) {
        paginaCitasActual = pagina;
        listarCitas();
        return;
    }

    if (item.closest('#contenedorPaginacionCotizaciones')) {
        paginaCotizacionesActual = pagina;
        listarCotizacionesSidebar();
        return;
    }
});

// ============================================================
// HANDLER GLOBAL: SELECTOR "REGISTROS POR PÁGINA"
// ============================================================
// Maneja el evento change del control .selector-por-pagina.
document.addEventListener('change', function (event) {
    const select = event.target.closest('.selector-por-pagina');
    if (!select) return;

    const valor = Number(select.value);
    if (!valor || !OPCIONES_POR_PAGINA.includes(valor)) return;

    const vista = select.dataset.vista;

    switch (vista) {
        case 'ordenes':
            porPaginaOrdenes = valor;
            guardarPreferencia('porPaginaOrdenes', valor);
            paginaOrdenesActual = 1;
            listarOrdenes();
            break;

        case 'historial':
            porPaginaHistorial = valor;
            guardarPreferencia('porPaginaHistorial', valor);
            paginaHistorialActual = 1;
            listarHistorial();
            break;

        case 'clientes':
            porPaginaClientes = valor;
            guardarPreferencia('porPaginaClientes', valor);
            paginaClientesActual = 1;
            listarClientes();
            break;

        case 'citas':
            porPaginaCitas = valor;
            guardarPreferencia('porPaginaCitas', valor);
            paginaCitasActual = 1;
            listarCitas();
            break;

        case 'cotizaciones':
            porPaginaCotizaciones = valor;
            guardarPreferencia('porPaginaCotizaciones', valor);
            paginaCotizacionesActual = 1;
            listarCotizacionesSidebar();
            break;
    }
});