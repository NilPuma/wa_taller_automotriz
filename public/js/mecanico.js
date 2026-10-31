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
function validarCamposCliente(nombreCliente, correo, esRuc = false) {
    const nombreLimpio = (nombreCliente || '').trim();
    const correoLimpio = (correo || '').trim();

    if (nombreLimpio.length < 2 || (!esRuc && !REGEX_NOMBRE.test(nombreLimpio))) {
        const titulo = esRuc ? 'Razón social inválida' : 'Nombre inválido';
        const mensaje = esRuc
            ? 'Ingrese una razón social de al menos 2 caracteres.'
            : 'El nombre debe tener al menos 2 letras y solo puede contener letras, tildes, ñ, espacios, apóstrofes o guiones.';
        mostrarToast('advertencia', titulo, mensaje);
        return false;
    }

    if (!REGEX_CORREO.test(correoLimpio)) {
        mostrarToast('advertencia', 'Correo inválido',
            'Ingrese un correo con formato válido (ejemplo: usuario@dominio.com).');
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
function validarFormularioVehiculo(datos) {
    if (!datos.id_persona || !datos.placa || !datos.vin || !datos.marca || !datos.modelo
        || !datos.anio || !datos.color || !datos.numeroMotor || !datos.numeroChasis) {
        mostrarToast('advertencia', 'Campos Vacíos',
            'Placa, VIN, marca, modelo, año, color, N° motor y N° chasis son obligatorios');
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

    if (!validarCamposCliente(nombres, correo, esRuc)) return;

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
            const placa = document.querySelector('#inputPlacaNuevo').value.trim().toUpperCase();
            const okVehiculo = await guardarVehiculoDesdeModalCliente(idPersona, placa);
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
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
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

        if (!validarFormularioVehiculo(datos)) return;

        const modo = document.querySelector('#inputModoVehiculo').value;
        const idVehiculo = document.querySelector('#inputIdVehiculoEditar').value;

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

// Registra el vehículo usando el ID del cliente recién creado.
async function guardarVehiculoDesdeModalCliente(idPersona, placa) {
    const vin          = document.querySelector('#inputVinNuevo').value.trim();
    const marca        = document.querySelector('#inputMarcaNuevo').value.trim();
    const modelo       = document.querySelector('#inputModeloNuevo').value.trim();
    const anio         = document.querySelector('#inputAnioNuevo').value;
    const color        = document.querySelector('#inputColorNuevo').value.trim();
    const numeroMotor  = document.querySelector('#inputNumeroMotorNuevo').value.trim();
    const numeroChasis = document.querySelector('#inputNumeroChasisNuevo').value.trim();
    const observaciones = document.querySelector('#inputObservacionesNuevo').value.trim();

    if (!placa || !vin || !marca || !modelo || !anio || !color
        || !numeroMotor || !numeroChasis) {
        mostrarToast('advertencia', 'Campos Vacíos',
            'Si registra un vehículo, complete: placa, VIN, marca, modelo, año, color, N° motor y N° chasis');
        return false;
    }

    try {
        const res = await axios.post('/api/registrarVehiculo', {
            id_persona: idPersona,
            placa,
            vin,
            marca,
            modelo,
            anio: anio ? Number(anio) : null,
            color,
            numero_motor: numeroMotor,
            numero_chasis: numeroChasis,
            observaciones
        });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return false;
        }
        return true;

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
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

        if (!idPersona || !idVehiculo || !fechaCita || !horaCita) {
            mostrarToast('advertencia', 'Campos Vacíos', 'Cliente, vehículo, fecha y hora son obligatorios');
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

// Maneja el evento click del control #btnGenerarCotizacion.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnGenerarCotizacion');
    if (!boton) return;

    if (_enviandoCotizacion) return;

    const idVehiculo = vehiculoActualCotizacion ? vehiculoActualCotizacion.id_vehiculo : null;
    const idPersona  = clienteActual ? clienteActual.id_persona : null;

    if (!idPersona || !idVehiculo) {
        mostrarToast('advertencia', 'Falta vehículo', 'Busque una placa antes de generar la cotización');
        return;
    }

    if (itemsCotizacion.length === 0) {
        mostrarToast('advertencia', 'Sin items', 'Agregue al menos un servicio o producto');
        return;
    }

    const fechaCotizacion = document.querySelector('#inputFechaCotizacion').value;
    if (!fechaCotizacion) {
        mostrarToast('advertencia', 'Falta fecha', 'Seleccione una fecha para la cotización');
        return;
    }

    const observacion = document.querySelector('#textareaObservacionesCotizacion').value.trim();
    const validez     = document.querySelector('#selectValidezCotizacion').value;

    _enviandoCotizacion = true;

    try {
        const res = await axios.post('/api/registrarCotizacion', {
            id_persona: idPersona,
            id_sucursal: sucursalActual.id_sucursal,
            id_vehiculo: idVehiculo,
            observacion,
            validez,
            fecha_cotizacion: fechaCotizacion,
            items: itemsCotizacion.map(it => ({
                id_producto: it.id_producto,
                id_servicio: it.id_servicio,
                cantidad: it.cantidad,
                precio_unitario: it.precio_unitario,
                observacion: null
            }))
        });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        await cargarCotizaciones();
        listarCotizacionesSidebar();

        limpiarFormularioCotizacion();

        mostrarToast('exito', 'Cotización registrada',
            `COT-${String(res.data.id_cotizacion).padStart(4, '0')} creada correctamente`);

    } catch (error) {
        console.error(error);
        if (error.response) {
            mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    } finally {
        _enviandoCotizacion = false;
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
    setTexto('#consumoOrdenDescripcion', '--');

    const badge = document.querySelector('#consumoOrdenEstado');
    if (badge) {
        badge.textContent = '--';
        badge.className = 'badge bg-secondary';
    }

    const info = document.querySelector('#contenedorInfoOrden');
    if (info) info.classList.add('d-none');

    const vacioOrden = document.querySelector('#contenedorVacioOrden');
    if (vacioOrden) vacioOrden.classList.remove('d-none');

    const acciones = document.querySelector('#contenedorAccionesOrden');
    if (acciones) acciones.classList.add('d-none');

    const contEvid = document.querySelector('#contenedorEvidencias');
    if (contEvid) contEvid.classList.add('d-none');

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
    setTexto('#pillTotalConsumo', 'S/ 0.00');

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

        await cargarInformePorOrden(idOrden);

        pintarDetalleOrden(orden);

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
    setTexto('#consumoOrdenDescripcion', orden.observacion || '—');

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
    setTexto('#contenedorTotalConsumo', 'S/ ' + subtotal.toFixed(2));
    setTexto('#pillTotalConsumo', 'S/ ' + subtotal.toFixed(2));
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
function abrirModalNuevaOrden() {
    limpiarModalNuevaOrden();
    abrirModal('#modalNuevaOrden');
    poblarSelectCitasOrden();
    poblarSelectCotizacionesOrden();
}

// Carga citas que se pueden asociar a una orden nueva.
async function poblarSelectCitasOrden() {
    const select = document.querySelector('#selectCitaOrden');
    if (!select) return;

    const opciones = select.querySelectorAll('option:not([disabled])');
    opciones.forEach(o => o.remove());

    await cargarCitasSinOrden();

    const templateOption = document.querySelector('#templateOptionCita').content;

    listadoCitasSinOrden.forEach(cita => {
        const clone = templateOption.cloneNode(true);
        const option = clone.querySelector('option');
        option.value = cita.id_cita;
        option.textContent =
            `#${cita.id_cita} · ${cita.fecha_cita ? formatearFecha(cita.fecha_cita) : '—'} ${cita.hora_cita || ''} · ${cita.placa || ''} · ${cita.cliente_nombres || ''} ${cita.cliente_apellidos || ''}`.trim();
        select.appendChild(clone);
    });
}

// Carga cotizaciones que se pueden asociar a una orden nueva.
async function poblarSelectCotizacionesOrden() {
    const select = document.querySelector('#selectCotizacionOrden');
    if (!select) return;

    const opciones = select.querySelectorAll('option:not([disabled])');
    opciones.forEach(o => o.remove());

    await cargarCotizacionesAprobadas();

    const disponibles = listadoCotizacionesAprobadas.filter(cot => !cot.tiene_ot);

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

// Restablece los campos del formulario de orden.
function limpiarModalNuevaOrden() {
    const origen = document.querySelector('#selectOrigenOrden');
    if (origen) origen.value = 'CITA';

    const selectCita = document.querySelector('#selectCitaOrden');
    if (selectCita) selectCita.value = '';

    const selectCot = document.querySelector('#selectCotizacionOrden');
    if (selectCot) selectCot.value = '';

    const desc = document.querySelector('#textareaDescripcion');
    if (desc) desc.value = '';

    const wrapCita = document.querySelector('#wrapperSelectCita');
    if (wrapCita) wrapCita.classList.remove('d-none');

    const wrapCot = document.querySelector('#wrapperSelectCotizacion');
    if (wrapCot) wrapCot.classList.add('d-none');
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

    try {
        const res = await axios.patch('/api/cambiarEstadoOrden/' + ordenActual.id_orden_trabajo, {
            estado: nuevoEstado
        });

        if (!res.data.ok) {
            mostrarToast('error', 'Error', res.data.mensaje);
            return;
        }

        mostrarToast('exito', 'Correcto', 'Estado actualizado a ' + nuevoEstado);

        await cargarOrdenes();
        await cargarOrdenActual(ordenActual.id_orden_trabajo);
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

// Maneja el evento change del control #selectOrigenOrden.
document.addEventListener('change', function (event) {
    const select = event.target.closest('#selectOrigenOrden');
    if (!select) return;

    const wrapCita = document.querySelector('#wrapperSelectCita');
    const wrapCot  = document.querySelector('#wrapperSelectCotizacion');

    if (select.value === 'COTIZACION') {
        if (wrapCita) wrapCita.classList.add('d-none');
        if (wrapCot) wrapCot.classList.remove('d-none');
    } else {
        if (wrapCita) wrapCita.classList.remove('d-none');
        if (wrapCot) wrapCot.classList.add('d-none');
    }
});

// Maneja el evento click del control #btnGuardarOrden.
document.addEventListener('click', async function (event) {
    const boton = event.target.closest('#btnGuardarOrden');
    if (!boton) return;

    if (_enviandoOrden) return;
    _enviandoOrden = true;

    try {
        const origen = document.querySelector('#selectOrigenOrden').value;
        const observacion = document.querySelector('#textareaDescripcion').value.trim();

        let body = {
            observacion,
            fecha_atencion: fechaISO(new Date()),
            ids_mecanicos: mecanicoActual ? [mecanicoActual.id_mecanico] : [],
            items: []
        };

        if (origen === 'CITA') {
            const idCita = document.querySelector('#selectCitaOrden').value;
            if (!idCita) {
                mostrarToast('advertencia', 'Falta cita', 'Seleccione una cita');
                return;
            }

            const resCita = await axios.get('/api/buscarCitaPorId/' + idCita);
            if (!resCita.data.ok || !resCita.data.cita) {
                mostrarToast('error', 'Error', 'No se pudo cargar la cita');
                return;
            }
            const cita = resCita.data.cita;

            body.id_cita = cita.id_cita;
            body.id_persona = cita.id_persona;
            body.id_sucursal = cita.id_sucursal || sucursalActual.id_sucursal;
            body.id_vehiculo = cita.id_vehiculo;
            if (!body.observacion && cita.motivo) body.observacion = cita.motivo;

        } else {
            const idCotizacion = document.querySelector('#selectCotizacionOrden').value;
            if (!idCotizacion) {
                mostrarToast('advertencia', 'Falta cotización', 'Seleccione una cotización aprobada');
                return;
            }

            const resCot = await axios.get('/api/buscarCotizacionConDetalle/' + idCotizacion);
            if (!resCot.data.ok || !resCot.data.cotizacion) {
                mostrarToast('error', 'Error', 'No se pudo cargar la cotización');
                return;
            }
            const cot = resCot.data.cotizacion;

            body.id_cotizacion = cot.id_cotizacion;
            body.id_persona = cot.id_persona;
            body.id_sucursal = cot.id_sucursal || sucursalActual.id_sucursal;
            body.id_vehiculo = cot.id_vehiculo;
            if (!body.observacion && cot.observacion) body.observacion = cot.observacion;

            body.items = (cot.items || []).map(it => ({
                id_producto: it.id_producto,
                id_servicio: it.id_servicio,
                cantidad: Number(it.cantidad),
                precio_unitario: Number(it.precio_unitario),
                observacion: it.observacion || null
            }));
        }

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

        setTexto('#verHistorialCodigo', 'OT-' + String(orden.id_orden_trabajo).padStart(4, '0'));
        setTexto('#verHistorialFecha', orden.fecha_atencion ? formatearFecha(orden.fecha_atencion) : '—');
        setTexto('#verHistorialCliente',
            `${orden.cliente_nombres || ''} ${orden.cliente_apellidos || ''}`.trim() || '—');
        setTexto('#verHistorialVehiculo',
            `${orden.placa || ''} · ${orden.marca || ''} ${orden.modelo || ''}`.trim() || '—');
        setTexto('#verHistorialDescripcion', orden.observacion || '—');

        const contConsumo = document.querySelector('#contenedorVerHistorialConsumo');
        const templateConsumo = document.querySelector('#templateFilaConsumoHistorial').content;
        contConsumo.innerHTML = '';

        let total = 0;
        (orden.detalles || []).forEach(it => {
            const precio = Number(it.precio_unitario || 0);
            const cant = Number(it.cantidad || 0);
            const subtotal = Number(it.subtotal || (precio * cant));

            const clone = templateConsumo.cloneNode(true);

            clone.querySelector('.nombre-consumo').textContent = it.descripcion || '—';
            clone.querySelector('.cantidad-consumo').textContent = cant;
            clone.querySelector('.precio-consumo').textContent = 'S/ ' + precio.toFixed(2);
            clone.querySelector('.subtotal-consumo').textContent = 'S/ ' + subtotal.toFixed(2);

            total += subtotal;

            contConsumo.appendChild(clone);
        });

        setTexto('#verHistorialTotalConsumo', 'S/ ' + total.toFixed(2));

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