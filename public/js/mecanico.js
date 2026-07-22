/* ==========================================
   Script para frontend - Panel de Mecánico
   ========================================== */

/* const socket = io('/administrador'); */

// ============ 1. REFERENCIAS AL DOM ============
const fragmento = document.createDocumentFragment();
const contenedorReactivo = document.querySelector('#contenedorReactivo');

// Botones del menú
const btnMenuInicio = document.querySelector('#btnMenuInicio');
const btnMenuOrdenes = document.querySelector('#btnMenuOrdenes');
const btnMenuAgenda = document.querySelector('#btnMenuAgenda');
const btnMenuHistorial = document.querySelector('#btnMenuHistorial');
const btnMenuConsumo = document.querySelector('#btnMenuConsumo');
const btnMenuEvidencias = document.querySelector('#btnMenuEvidencias');
const btnMenuCotizaciones = document.querySelector('#btnMenuCotizaciones');
const btnMenuCitas = document.querySelector('#btnMenuCitas');
const btnMenuCerrarSesion = document.querySelector('#btnMenuCerrarSesion');

// Templates
const templateOrdenes = document.querySelector('#templateOrdenes').content;
const templateAgenda = document.querySelector('#templateAgenda').content;

// Variables globales
let listadoGeneralUsuarios = {};

// ============ 2. DATOS FICTICIOS ============

// Datos del Dashboard
let dashboardData = {
    ordenesAsignadas: 10,
    totalOrdenes: 30,
    trabajosProceso: 5,
    totalTrabajos: 15,
    ordenesFinalizadas: 3,
    totalFinalizadas: 10,
    tiempoPromedio: '2.3h',
    alturasBarras: [60, 80, 70, 70, 50]
};

// Datos de la Agenda
let agendaData = {
    nombreMecanico: 'Juan Pérez',
    horas: ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', 
            '14:00', '15:00', '16:00', '17:00', '18:00'],
    dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
    ocupados: {
        'LUNES-8:00': true,
        'LUNES-9:00': true,
        'LUNES-10:00': true,
        'MARTES-11:00': true,
        'MARTES-12:00': true,
        'MIERCOLES-14:00': true,
        'MIERCOLES-15:00': true,
        'JUEVES-16:00': true,
        'VIERNES-9:00': true,
        'VIERNES-10:00': true
    }
};

// Datos del Modal de Horario
let modalHorarioData = {
    horasDisponibles: [
        '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', 
        '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
        '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '13:00 PM',
        '13:30 PM', '14:00 PM', '14:30 PM', '15:00 PM', '15:30 PM',
        '16:00 PM', '16:30 PM', '17:00 PM', '17:30 PM', '18:00 PM',
        '18:30 PM', '19:00 PM', '19:30 PM', '20:00 PM', '20:30 PM', '21:00 PM'
    ],
    bloquesOcupados: {
        'LUNES': [
            { id: 1, horaInicio: '08:00 AM', horaFin: '10:00 AM' },
            { id: 2, horaInicio: '14:00 PM', horaFin: '16:00 PM' }
        ],
        'MARTES': [
            { id: 3, horaInicio: '09:00 AM', horaFin: '12:00 PM' }
        ],
        'MIERCOLES': [],
        'JUEVES': [
            { id: 4, horaInicio: '07:00 AM', horaFin: '08:00 AM' }
        ],
        'VIERNES': [],
        'SABADO': [
            { id: 5, horaInicio: '08:00 AM', horaFin: '13:00 PM' }
        ]
    }
};

// ============ 3. FUNCIONES DEL DASHBOARD ============
function actualizarGraficoCircular(idGrafico, valor, total) {
    const grafico = document.querySelector(`#${idGrafico}`);
    if (!grafico) return;
    
    const porcentaje = Math.round((valor / total) * 100);
    
    const circuloProgreso = grafico.querySelector('.circulo-progreso');
    if (circuloProgreso) {
        circuloProgreso.setAttribute('stroke-dasharray', `${porcentaje}, 100`);
    }
    
    const texto = grafico.querySelector('.porcentaje-texto');
    if (texto) {
        texto.textContent = valor;
    }
}

function actualizarTexto(selector, valor) {
    const elemento = document.querySelector(selector);
    if (elemento) {
        elemento.textContent = valor;
    }
}

function actualizarGraficoBarras(idGrafico, alturas, valorActivo) {
    const grafico = document.querySelector(`#${idGrafico}`);
    if (!grafico) return;
    
    const barras = grafico.querySelectorAll('.barra');
    
    barras.forEach((barra, i) => {
        if (alturas[i] !== undefined) {
            barra.style.height = alturas[i] + '%';
        }
        
        if (i === barras.length - 1) {
            barra.classList.add('activa');
            if (valorActivo) {
                barra.setAttribute('data-valor', valorActivo);
            }
        } else {
            barra.classList.remove('activa');
        }
    });
}

function actualizarDashboard(datos) {
    actualizarTexto('.valor-ordenes-asignadas', datos.ordenesAsignadas);
    actualizarTexto('.valor-trabajos-proceso', datos.trabajosProceso);
    actualizarTexto('.valor-ordenes-finalizadas', datos.ordenesFinalizadas);
    actualizarTexto('.valor-tiempo-promedio', datos.tiempoPromedio);
    
    actualizarGraficoCircular('grafico-ordenes', datos.ordenesAsignadas, datos.totalOrdenes);
    actualizarGraficoCircular('grafico-proceso', datos.trabajosProceso, datos.totalTrabajos);
    actualizarGraficoCircular('grafico-finalizadas', datos.ordenesFinalizadas, datos.totalFinalizadas);
    
    actualizarGraficoBarras('grafico-barras', datos.alturasBarras, datos.tiempoPromedio);
}

// ============ 4. FUNCIONES DE LA AGENDA ============

/**
 * Genera las filas de la tabla de agenda
 * @param {Object} datos - Datos de la agenda { horas, dias, ocupados }
 */
function generarTablaAgenda(datos) {
    const tbody = document.querySelector('#agenda-tabla-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    datos.horas.forEach(hora => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-hora', hora);
        
        // Celda de hora
        const tdHora = document.createElement('td');
        tdHora.className = 'col-hora fw-semibold';
        tdHora.textContent = hora;
        tr.appendChild(tdHora);
        
        // Celdas para cada día
        datos.dias.forEach(dia => {
            const td = document.createElement('td');
            td.className = 'celda-agenda';
            td.setAttribute('data-dia', dia);
            td.setAttribute('data-hora', hora);
            
            // Verificar si está ocupado
            const clave = `${dia}-${hora}`;
            if (datos.ocupados && datos.ocupados[clave]) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-danger';
                badge.textContent = 'OCUPADO';
                td.appendChild(badge);
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

/**
 * Actualiza el nombre del mecánico en la agenda
 * @param {String} nombre - Nombre del mecánico
 */
function actualizarNombreMecanicoAgenda(nombre) {
    const nombreElemento = document.querySelector('#agendaNombreMecanico');
    if (nombreElemento) {
        nombreElemento.textContent = nombre;
    }
}

/**
 * Inicializa la vista de agenda con datos
 * @param {Object} datos - Datos de la agenda
 */
function inicializarAgenda(datos) {
    actualizarNombreMecanicoAgenda(datos.nombreMecanico);
    generarTablaAgenda(datos);
}

// ============ 5. FUNCIONES DEL MODAL DE HORARIO ============

/**
 * Llena los selectores de hora en el modal
 * @param {Array} horas - Array de horas disponibles
 */
function llenarSelectoresHoras(horas) {
    const selectInicio = document.querySelector('#selectHoraInicio');
    const selectFin = document.querySelector('#selectHoraFin');
    
    if (!selectInicio || !selectFin) return;
    
    // Limpiar opciones existentes (excepto la primera)
    while (selectInicio.options.length > 1) {
        selectInicio.remove(1);
    }
    while (selectFin.options.length > 1) {
        selectFin.remove(1);
    }
    
    // Agregar opciones
    horas.forEach(hora => {
        const optionInicio = document.createElement('option');
        optionInicio.value = hora;
        optionInicio.textContent = hora;
        selectInicio.appendChild(optionInicio);
        
        const optionFin = document.createElement('option');
        optionFin.value = hora;
        optionFin.textContent = hora;
        selectFin.appendChild(optionFin);
    });
}

/**
 * Muestra los bloques ocupados de un día específico en el modal
 * @param {String} dia - Día seleccionado
 * @param {Object} datos - Datos del modal con bloquesOcupados
 */
function mostrarBloquesOcupados(dia, datos) {
    const lista = document.querySelector('#listaBloquesOcupados');
    const templateBloque = document.querySelector('#templateBloqueOcupado');
    
    if (!lista || !templateBloque) return;
    
    lista.innerHTML = '';
    
    const bloques = datos.bloquesOcupados[dia] || [];
    
    if (bloques.length === 0) {
        lista.innerHTML = '<p class="text-muted mb-0">No hay horarios ocupados este día.</p>';
        return;
    }
    
    bloques.forEach(bloque => {
        const clone = templateBloque.content.cloneNode(true);
        
        const bloqueHorario = clone.querySelector('.bloque-horario');
        if (bloqueHorario) {
            bloqueHorario.textContent = `${bloque.horaInicio} - ${bloque.horaFin}`;
        }
        
        const btnEliminar = clone.querySelector('.btn-eliminar-bloque');
        if (btnEliminar) {
            btnEliminar.setAttribute('data-id', bloque.id);
        }
        
        lista.appendChild(clone);
    });
}

/**
 * Cambia la pestaña activa de día en el modal
 * @param {String} dia - Día a activar
 */
function cambiarTabDiaActivo(dia) {
    const tabs = document.querySelectorAll('#tabsDiasHorario .tab-dia');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-dia') === dia) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    document.querySelector('#diaSeleccionadoHorario').value = dia;
}

/**
 * Inicializa el modal de horario
 * @param {Object} datos - Datos del modal
 * @param {String} diaInicial - Día seleccionado inicialmente
 */
function inicializarModalHorario(datos, diaInicial = 'LUNES') {
    llenarSelectoresHoras(datos.horasDisponibles);
    cambiarTabDiaActivo(diaInicial);
    mostrarBloquesOcupados(diaInicial, datos);
    
    // Actualizar nombre del mecánico en el modal
    const nombreMecanicoModal = document.querySelector('#nombreMecanicoModal');
    if (nombreMecanicoModal) {
        nombreMecanicoModal.textContent = agendaData.nombreMecanico;
    }
}

// ============ 6. NAVEGACIÓN ============
btnMenuInicio.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';
    location.reload();
});

// Navegación a Órdenes
btnMenuOrdenes.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';
    
    const clone = templateOrdenes.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);
});

// Navegación a Agenda
btnMenuAgenda.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';
    
    const clone = templateAgenda.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);
    
    // Inicializar la agenda con datos ficticios
    inicializarAgenda(agendaData);
    
    // Inicializar modal de horario
    inicializarModalHorario(modalHorarioData);
    
    // Eventos para los tabs de días en el modal
    const tabsDias = document.querySelectorAll('#tabsDiasHorario .tab-dia');
    tabsDias.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const dia = tab.getAttribute('data-dia');
            cambiarTabDiaActivo(dia);
            mostrarBloquesOcupados(dia, modalHorarioData);
        });
    });
    
    // Eventos para los botones de editar día en la tabla
    const botonesEditar = document.querySelectorAll('.btn-editar-dia');
    botonesEditar.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const dia = btn.getAttribute('data-dia');
            cambiarTabDiaActivo(dia);
            mostrarBloquesOcupados(dia, modalHorarioData);
            
            // Abrir modal
            const modal = new bootstrap.Modal(document.querySelector('#modalHorario'));
            modal.show();
        });
    });
    
    // Evento para celdas de la agenda (click en celda abre modal)
    const celdasAgenda = document.querySelectorAll('.celda-agenda');
    celdasAgenda.forEach(celda => {
        celda.addEventListener('click', () => {
            const dia = celda.getAttribute('data-dia');
            cambiarTabDiaActivo(dia);
            mostrarBloquesOcupados(dia, modalHorarioData);
            
            // Abrir modal
            const modal = new bootstrap.Modal(document.querySelector('#modalHorario'));
            modal.show();
        });
    });
});

// ============ 7. SOCKETS (PREPARADOS) ============
/* socket.on('/index/listarUsuarios', (data) => {
    listadoGeneralContactos = data;
    console.log(listadoGeneralContactos);
}); */

// ============ 8. INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
    actualizarDashboard(dashboardData);
});