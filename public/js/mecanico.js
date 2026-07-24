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
const btnMenuCotizaciones2 = document.querySelector('#btnMenuCotizaciones2');
const btnMenuCitas = document.querySelector('#btnMenuCitas');
const btnMenuCerrarSesion = document.querySelector('#btnMenuCerrarSesion');

// Templates (se capturan al cargar la vista correspondiente)
let templateOrdenes = null;
let templateAgenda = null;
let templateCotizaciones = null;
let templateCotizaciones2 = null;

// Variables globales
let listadoGeneralUsuarios = {};
let itemsCotizacion = [];
let itemIdCounter = 0;
let serviciosDisponibles = [];
let productosDisponibles = [];
let mecanicosDisponibles = [];

// Variables Cotizaciones 2
let filaIdCounterCot2 = 0;
let vehiculoActivoCot2 = null;

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

// Datos para Cotizaciones
const cotizacionesMockData = {
    servicios: [
        { id: 1, nombre: 'Cambio de Aceite', precio: 80.00 },
        { id: 2, nombre: 'Alineación y Balanceo', precio: 120.00 },
        { id: 3, nombre: 'Cambio de Frenos', precio: 250.00 },
        { id: 4, nombre: 'Diagnóstico Computarizado', precio: 150.00 },
        { id: 5, nombre: 'Cambio de Batería', precio: 200.00 },
        { id: 6, nombre: 'Mantenimiento Preventivo', precio: 350.00 },
        { id: 7, nombre: 'Reparación de Motor', precio: 500.00 },
        { id: 8, nombre: 'Cambio de Llantas', precio: 180.00 }
    ],
    productos: [
        { id: 1, nombre: 'Aceite Sintético 5W-30 (Galón)', precio: 120.00 },
        { id: 2, nombre: 'Filtro de Aceite', precio: 45.00 },
        { id: 3, nombre: 'Pastillas de Freno (Juego)', precio: 180.00 },
        { id: 4, nombre: 'Batería 12V 60Ah', precio: 350.00 },
        { id: 5, nombre: 'Filtro de Aire', precio: 55.00 },
        { id: 6, nombre: 'Bujías (Juego x4)', precio: 90.00 },
        { id: 7, nombre: 'Amortiguadores (Par)', precio: 420.00 },
        { id: 8, nombre: 'Llantas 195/65 R15 (Unidad)', precio: 280.00 }
    ],
    mecanicos: [
        { id: 1, nombre: 'Juan Pérez' },
        { id: 2, nombre: 'María López' },
        { id: 3, nombre: 'Carlos Ruiz' }
    ],
    vehiculos: {
        'ABC-123': { 
            marca: 'Toyota Corolla 2020', 
            cliente: 'Juan Pérez',
            email: 'juan.perez@email.com',
            telefono: '999-123-456',
            documento: '12345678',
            color: 'Rojo',
            kilometraje: 45000
        },
        'XYZ-789': { 
            marca: 'Honda Civic 2021', 
            cliente: 'María López',
            email: 'maria.lopez@email.com',
            telefono: '999-234-567',
            documento: '87654321',
            color: 'Azul',
            kilometraje: 32000
        },
        'DEF-456': { 
            marca: 'Nissan Sentra 2019', 
            cliente: 'Carlos Ruiz',
            email: 'carlos.ruiz@email.com',
            telefono: '999-345-678',
            documento: '45678912',
            color: 'Negro',
            kilometraje: 68000
        }
    },
    cotizaciones: [
        { id: 1, codigo: 'COT-001', placa: 'ABC-123', mecanico: 'Juan Pérez', fecha: '20/07/2024', items: 5, total: 450.00, estado: 'Pendiente' },
        { id: 2, codigo: 'COT-002', placa: 'XYZ-789', mecanico: 'María López', fecha: '19/07/2024', items: 3, total: 820.00, estado: 'Aprobada' },
        { id: 3, codigo: 'COT-003', placa: 'DEF-456', mecanico: 'Carlos Ruiz', fecha: '18/07/2024', items: 8, total: 1200.00, estado: 'Rechazada' },
        { id: 4, codigo: 'COT-004', placa: 'ABC-123', mecanico: 'Juan Pérez', fecha: '15/07/2024', items: 2, total: 200.00, estado: 'Aprobada' },
        { id: 5, codigo: 'COT-005', placa: 'XYZ-789', mecanico: 'María López', fecha: '10/07/2024', items: 4, total: 650.00, estado: 'Pendiente' }
    ]
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

function generarTablaAgenda(datos) {
    const tbody = document.querySelector('#agenda-tabla-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    datos.horas.forEach(hora => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-hora', hora);
        
        const tdHora = document.createElement('td');
        tdHora.className = 'col-hora fw-semibold';
        tdHora.textContent = hora;
        tr.appendChild(tdHora);
        
        datos.dias.forEach(dia => {
            const td = document.createElement('td');
            td.className = 'celda-agenda';
            td.setAttribute('data-dia', dia);
            td.setAttribute('data-hora', hora);
            
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

function actualizarNombreMecanicoAgenda(nombre) {
    const nombreElemento = document.querySelector('#agendaNombreMecanico');
    if (nombreElemento) {
        nombreElemento.textContent = nombre;
    }
}

function inicializarAgenda(datos) {
    actualizarNombreMecanicoAgenda(datos.nombreMecanico);
    generarTablaAgenda(datos);
}

// ============ 5. FUNCIONES DEL MODAL DE HORARIO ============

function llenarSelectoresHoras(horas) {
    const selectInicio = document.querySelector('#selectHoraInicio');
    const selectFin = document.querySelector('#selectHoraFin');
    
    if (!selectInicio || !selectFin) return;
    
    while (selectInicio.options.length > 1) selectInicio.remove(1);
    while (selectFin.options.length > 1) selectFin.remove(1);
    
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

function cambiarTabDiaActivo(dia) {
    const tabs = document.querySelectorAll('#tabsDiasHorario .tab-dia');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-dia') === dia) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    const diaSeleccionado = document.querySelector('#diaSeleccionadoHorario');
    if (diaSeleccionado) {
        diaSeleccionado.value = dia;
    }
}

function inicializarModalHorario(datos, diaInicial = 'LUNES') {
    llenarSelectoresHoras(datos.horasDisponibles);
    cambiarTabDiaActivo(diaInicial);
    mostrarBloquesOcupados(diaInicial, datos);
    
    const nombreMecanicoModal = document.querySelector('#nombreMecanicoModal');
    if (nombreMecanicoModal) {
        nombreMecanicoModal.textContent = agendaData.nombreMecanico;
    }
}

// ============ 6. FUNCIONES DE COTIZACIONES ============

function inicializarCotizaciones() {
    serviciosDisponibles = cotizacionesMockData.servicios;
    productosDisponibles = cotizacionesMockData.productos;
    mecanicosDisponibles = cotizacionesMockData.mecanicos;
    
    itemsCotizacion = [];
    itemIdCounter = 0;
    
    llenarDropdownMecanicos();
    llenarDropdownServicios();
    llenarDropdownProductos();
    
    ocultarListaCotizaciones();
    ocultarDatosCliente();
    actualizarPlacaActiva('');
    
    const fechaInput = document.querySelector('#inputFechaCotizacion');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
    
    configurarEventosCotizaciones();
    actualizarTotalesCotizacion();
}

function actualizarPlacaActiva(placa) {
    const placaElemento = document.querySelector('#placaActivaCotizacion');
    if (placaElemento) {
        placaElemento.textContent = placa || '--';
    }
}

function ocultarListaCotizaciones() {
    const lista = document.querySelector('#listaCotizaciones');
    const mensajeSinPlaca = document.querySelector('#mensajeSinPlaca');
    if (lista) lista.innerHTML = '';
    if (mensajeSinPlaca) mensajeSinPlaca.style.display = 'block';
}

function ocultarDatosCliente() {
    const infoCliente = document.querySelector('#infoClienteCotizacion');
    const mensajeSinCliente = document.querySelector('#mensajeSinCliente');
    if (infoCliente) infoCliente.classList.add('d-none');
    if (mensajeSinCliente) mensajeSinCliente.style.display = 'block';
}

function mostrarDatosCliente() {
    const infoCliente = document.querySelector('#infoClienteCotizacion');
    const mensajeSinCliente = document.querySelector('#mensajeSinCliente');
    if (infoCliente) infoCliente.classList.remove('d-none');
    if (mensajeSinCliente) mensajeSinCliente.style.display = 'none';
}

function filtrarCotizacionesPorPlaca(placa) {
    const lista = document.querySelector('#listaCotizaciones');
    const mensajeSinPlaca = document.querySelector('#mensajeSinPlaca');
    
    if (!lista) return;
    
    const cotizacionesFiltradas = cotizacionesMockData.cotizaciones.filter(
        cot => cot.placa === placa
    );
    
    if (cotizacionesFiltradas.length === 0) {
        lista.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-file-earmark-x fs-4 d-block mb-1"></i>
                <small>No hay cotizaciones para esta placa</small>
            </div>`;
    } else {
        lista.innerHTML = cotizacionesFiltradas.map(cot => {
            let badgeClass = 'bg-secondary';
            if (cot.estado === 'Pendiente') badgeClass = 'bg-warning text-dark';
            else if (cot.estado === 'Aprobada') badgeClass = 'bg-success';
            else if (cot.estado === 'Rechazada') badgeClass = 'bg-danger';
            
            return `
                <div class="item-cotizacion p-2 border rounded mb-2" data-id="${cot.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong class="d-block small">${cot.codigo}</strong>
                            <small class="text-muted">${cot.fecha}</small>
                        </div>
                        <span class="badge ${badgeClass}">${cot.estado}</span>
                    </div>
                    <div class="mt-1">
                        <small class="text-muted">Mec: ${cot.mecanico}</small>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-1">
                        <small class="text-muted">${cot.items} items</small>
                        <strong class="text-success small">S/ ${cot.total.toFixed(2)}</strong>
                    </div>
                </div>`;
        }).join('');
    }
    
    if (mensajeSinPlaca) mensajeSinPlaca.style.display = 'none';
}

function llenarDropdownMecanicos() {
    const select = document.querySelector('#selectMecanicoCotizacion');
    if (!select) return;
    
    while (select.options.length > 1) select.remove(1);
    
    mecanicosDisponibles.forEach(mecanico => {
        const option = document.createElement('option');
        option.value = mecanico.id;
        option.textContent = mecanico.nombre;
        select.appendChild(option);
    });
}

function llenarDropdownServicios() {
    const select = document.querySelector('#selectServicioCotizacion');
    if (!select) return;
    
    while (select.options.length > 1) select.remove(1);
    
    serviciosDisponibles.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio.id;
        option.textContent = `${servicio.nombre} - S/ ${servicio.precio.toFixed(2)}`;
        option.setAttribute('data-precio', servicio.precio);
        option.setAttribute('data-nombre', servicio.nombre);
        select.appendChild(option);
    });
}

function llenarDropdownProductos() {
    const select = document.querySelector('#selectProductoCotizacion');
    if (!select) return;
    
    while (select.options.length > 1) select.remove(1);
    
    productosDisponibles.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.nombre} - S/ ${producto.precio.toFixed(2)}`;
        option.setAttribute('data-precio', producto.precio);
        option.setAttribute('data-nombre', producto.nombre);
        select.appendChild(option);
    });
}

function actualizarPrecioServicio() {
    const select = document.querySelector('#selectServicioCotizacion');
    const inputPrecio = document.querySelector('#inputPrecioServicio');
    if (!select || !inputPrecio) return;
    
    const selectedOption = select.options[select.selectedIndex];
    inputPrecio.value = (selectedOption && selectedOption.getAttribute('data-precio')) 
        ? parseFloat(selectedOption.getAttribute('data-precio')).toFixed(2) 
        : '0.00';
}

function actualizarPrecioProducto() {
    const select = document.querySelector('#selectProductoCotizacion');
    const inputPrecio = document.querySelector('#inputPrecioProducto');
    if (!select || !inputPrecio) return;
    
    const selectedOption = select.options[select.selectedIndex];
    inputPrecio.value = (selectedOption && selectedOption.getAttribute('data-precio')) 
        ? parseFloat(selectedOption.getAttribute('data-precio')).toFixed(2) 
        : '0.00';
}

function agregarServicioCotizacion() {
    const select = document.querySelector('#selectServicioCotizacion');
    const inputCantidad = document.querySelector('#inputCantidadServicio');
    const inputPrecio = document.querySelector('#inputPrecioServicio');
    
    if (!select || !inputCantidad || !inputPrecio) return;
    
    const itemId = select.value;
    const selectedOption = select.options[select.selectedIndex];
    
    if (!itemId || !selectedOption || selectedOption.value === '') {
        alert('Seleccione un servicio válido');
        return;
    }
    
    const nombre = selectedOption.getAttribute('data-nombre');
    const cantidad = parseInt(inputCantidad.value) || 1;
    const precioUnitario = parseFloat(inputPrecio.value) || 0;
    
    itemsCotizacion.push({
        id: ++itemIdCounter,
        tipo: 'servicio',
        itemId: parseInt(itemId),
        nombre: nombre,
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        subtotal: cantidad * precioUnitario
    });
    
    renderizarTablaItems();
    actualizarTotalesCotizacion();
    
    select.selectedIndex = 0;
    inputCantidad.value = 1;
    inputPrecio.value = '0.00';
}

function agregarProductoCotizacion() {
    const select = document.querySelector('#selectProductoCotizacion');
    const inputCantidad = document.querySelector('#inputCantidadProducto');
    const inputPrecio = document.querySelector('#inputPrecioProducto');
    
    if (!select || !inputCantidad || !inputPrecio) return;
    
    const itemId = select.value;
    const selectedOption = select.options[select.selectedIndex];
    
    if (!itemId || !selectedOption || selectedOption.value === '') {
        alert('Seleccione un producto válido');
        return;
    }
    
    const nombre = selectedOption.getAttribute('data-nombre');
    const cantidad = parseInt(inputCantidad.value) || 1;
    const precioUnitario = parseFloat(inputPrecio.value) || 0;
    
    itemsCotizacion.push({
        id: ++itemIdCounter,
        tipo: 'producto',
        itemId: parseInt(itemId),
        nombre: nombre,
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        subtotal: cantidad * precioUnitario
    });
    
    renderizarTablaItems();
    actualizarTotalesCotizacion();
    
    select.selectedIndex = 0;
    inputCantidad.value = 1;
    inputPrecio.value = '0.00';
}

function eliminarItemCotizacion(id) {
    itemsCotizacion = itemsCotizacion.filter(item => item.id !== id);
    renderizarTablaItems();
    actualizarTotalesCotizacion();
}

function renderizarTablaItems() {
    const tbody = document.querySelector('#tbodyItemsCotizacion');
    if (!tbody) return;
    
    if (itemsCotizacion.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-3">
                    <i class="bi bi-inbox"></i> No hay items agregados
                </td>
            </tr>`;
        return;
    }
    
    tbody.innerHTML = itemsCotizacion.map(item => `
        <tr>
            <td>
                <span class="badge ${item.tipo === 'servicio' ? 'bg-primary' : 'bg-success'} small">
                    ${item.tipo === 'servicio' ? 'Servicio' : 'Producto'}
                </span>
            </td>
            <td class="small">${item.nombre}</td>
            <td class="small text-center">${item.cantidad}</td>
            <td class="small text-end">S/ ${item.precioUnitario.toFixed(2)}</td>
            <td class="small text-end">S/ ${item.subtotal.toFixed(2)}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-item" 
                        data-id="${item.id}" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.btn-eliminar-item').forEach(btn => {
        btn.addEventListener('click', () => {
            eliminarItemCotizacion(parseInt(btn.getAttribute('data-id')));
        });
    });
}

function actualizarTotalesCotizacion() {
    const subtotal = itemsCotizacion.reduce((sum, item) => sum + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    
    const subtotalTabla = document.querySelector('#subtotalCotizacion');
    const resumenSubtotal = document.querySelector('#resumenSubtotal');
    const resumenIGV = document.querySelector('#resumenIGV');
    const totalFinal = document.querySelector('#totalFinalCotizacion');
    
    if (subtotalTabla) subtotalTabla.textContent = `S/ ${subtotal.toFixed(2)}`;
    if (resumenSubtotal) resumenSubtotal.textContent = `S/ ${subtotal.toFixed(2)}`;
    if (resumenIGV) resumenIGV.textContent = `S/ ${igv.toFixed(2)}`;
    if (totalFinal) totalFinal.textContent = `S/ ${total.toFixed(2)}`;
}

function buscarVehiculoPorPlaca() {
    const placaInput = document.querySelector('#inputPlacaCotizacion');
    if (!placaInput) return;
    
    const placa = placaInput.value.trim().toUpperCase();
    
    actualizarPlacaActiva(placa);
    
    if (!placa) {
        ocultarListaCotizaciones();
        ocultarDatosCliente();
        return;
    }
    
    const vehiculo = cotizacionesMockData.vehiculos[placa];
    
    if (vehiculo) {
        document.querySelector('#clienteNombre').textContent = vehiculo.cliente;
        document.querySelector('#clienteEmail').textContent = vehiculo.email;
        document.querySelector('#clienteTelefono').textContent = vehiculo.telefono;
        document.querySelector('#clienteVehiculo').textContent = vehiculo.marca;
    } else {
        document.querySelector('#clienteNombre').textContent = 'No encontrado';
        document.querySelector('#clienteEmail').textContent = '--';
        document.querySelector('#clienteTelefono').textContent = '--';
        document.querySelector('#clienteVehiculo').textContent = 'No encontrado';
    }
    
    mostrarDatosCliente();
    filtrarCotizacionesPorPlaca(placa);
}

function generarCotizacion() {
    const mecanicoSelect = document.querySelector('#selectMecanicoCotizacion');
    const placaInput = document.querySelector('#inputPlacaCotizacion');
    const observaciones = document.querySelector('#textareaObservacionesCotizacion');
    const fechaInput = document.querySelector('#inputFechaCotizacion');
    const validezSelect = document.querySelector('#selectValidezCotizacion');
    
    if (!mecanicoSelect || !mecanicoSelect.value) {
        alert('Seleccione un mecánico');
        return;
    }
    
    if (!placaInput || !placaInput.value.trim()) {
        alert('Ingrese la placa del vehículo');
        return;
    }
    
    if (itemsCotizacion.length === 0) {
        alert('Agregue al menos un producto o servicio');
        return;
    }
    
    const subtotal = itemsCotizacion.reduce((sum, item) => sum + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    
    const cotizacion = {
        mecanicoId: mecanicoSelect.value,
        mecanicoNombre: mecanicoSelect.options[mecanicoSelect.selectedIndex].textContent,
        placa: placaInput.value.trim().toUpperCase(),
        items: [...itemsCotizacion],
        observaciones: observaciones ? observaciones.value : '',
        fecha: fechaInput ? fechaInput.value : '',
        validez: validezSelect ? validezSelect.value : '7',
        subtotal: subtotal,
        igv: igv,
        total: total
    };
    
    console.log('Cotización generada:', cotizacion);
    alert(`✅ Cotización generada exitosamente\n\nTotal: S/ ${cotizacion.total.toFixed(2)}\nPlaca: ${cotizacion.placa}\nMecánico: ${cotizacion.mecanicoNombre}\n\n(Revisa la consola para ver el objeto completo)`);
}

function limpiarCotizacion() {
    if (!confirm('¿Está seguro de limpiar toda la cotización?')) return;
    
    itemsCotizacion = [];
    itemIdCounter = 0;
    renderizarTablaItems();
    actualizarTotalesCotizacion();
    
    const placaInput = document.querySelector('#inputPlacaCotizacion');
    const observaciones = document.querySelector('#textareaObservacionesCotizacion');
    
    if (placaInput) placaInput.value = '';
    if (observaciones) observaciones.value = '';
    
    const selectMecanico = document.querySelector('#selectMecanicoCotizacion');
    const selectServicio = document.querySelector('#selectServicioCotizacion');
    const selectProducto = document.querySelector('#selectProductoCotizacion');
    const inputCantidadServicio = document.querySelector('#inputCantidadServicio');
    const inputCantidadProducto = document.querySelector('#inputCantidadProducto');
    const inputPrecioServicio = document.querySelector('#inputPrecioServicio');
    const inputPrecioProducto = document.querySelector('#inputPrecioProducto');
    
    if (selectMecanico) selectMecanico.selectedIndex = 0;
    if (selectServicio) selectServicio.selectedIndex = 0;
    if (selectProducto) selectProducto.selectedIndex = 0;
    if (inputCantidadServicio) inputCantidadServicio.value = 1;
    if (inputCantidadProducto) inputCantidadProducto.value = 1;
    if (inputPrecioServicio) inputPrecioServicio.value = '0.00';
    if (inputPrecioProducto) inputPrecioProducto.value = '0.00';
    
    ocultarListaCotizaciones();
    ocultarDatosCliente();
    actualizarPlacaActiva('');
}

function configurarEventosCotizaciones() {
    const selectServicio = document.querySelector('#selectServicioCotizacion');
    if (selectServicio) selectServicio.addEventListener('change', actualizarPrecioServicio);
    
    const btnAgregarServicio = document.querySelector('#btnAgregarServicio');
    if (btnAgregarServicio) btnAgregarServicio.addEventListener('click', agregarServicioCotizacion);
    
    const selectProducto = document.querySelector('#selectProductoCotizacion');
    if (selectProducto) selectProducto.addEventListener('change', actualizarPrecioProducto);
    
    const btnAgregarProducto = document.querySelector('#btnAgregarProducto');
    if (btnAgregarProducto) btnAgregarProducto.addEventListener('click', agregarProductoCotizacion);
    
    const btnBuscarPlaca = document.querySelector('#btnBuscarPlaca');
    if (btnBuscarPlaca) btnBuscarPlaca.addEventListener('click', buscarVehiculoPorPlaca);
    
    const inputPlaca = document.querySelector('#inputPlacaCotizacion');
    if (inputPlaca) {
        inputPlaca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculoPorPlaca();
            }
        });
    }
    
    const btnGenerar = document.querySelector('#btnGenerarCotizacion');
    if (btnGenerar) btnGenerar.addEventListener('click', generarCotizacion);
    
    const btnLimpiar = document.querySelector('#btnLimpiarCotizacion');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarCotizacion);
    
    const btnCerrar = document.querySelector('#btnCerrarCotizaciones');
    if (btnCerrar) btnCerrar.addEventListener('click', () => btnMenuInicio.click());
    
    const inputBuscar = document.querySelector('#inputBuscarCotizacion');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => {
            const termino = inputBuscar.value.trim().toUpperCase();
            const items = document.querySelectorAll('#listaCotizaciones .item-cotizacion');
            items.forEach(item => {
                const texto = item.textContent.toUpperCase();
                item.style.display = (texto.includes(termino) || !termino) ? '' : 'none';
            });
        });
    }
}

// ============ 7. FUNCIONES DE COTIZACIONES 2 ============

let serviciosAgregadosCot2 = [];
let refaccionesAgregadasCot2 = [];
let idCounterServiciosCot2 = 0;
let idCounterRefaccionesCot2 = 0;

function renderTablaCotizaciones2(filtro = '') {
    const tbody = document.querySelector('#tabla-cotizaciones2-body');
    if (!tbody) return;

    const termino = filtro.trim().toUpperCase();
    const datos = cotizacionesMockData.cotizaciones.filter(cot => {
        if (!termino) return true;
        const cliente = (cotizacionesMockData.vehiculos[cot.placa]?.cliente || '').toUpperCase();
        return cot.codigo.toUpperCase().includes(termino) ||
               cot.placa.toUpperCase().includes(termino) ||
               cliente.includes(termino);
    });

    if (datos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox"></i> No hay cotizaciones registradas
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = datos.map(cot => {
        let badgeClass = 'bg-secondary';
        if (cot.estado === 'Pendiente') badgeClass = 'bg-warning text-dark';
        else if (cot.estado === 'Aprobada') badgeClass = 'bg-success';
        else if (cot.estado === 'Rechazada') badgeClass = 'bg-danger';

        const cliente = cotizacionesMockData.vehiculos[cot.placa]?.cliente || '--';

        return `
            <tr>
                <td class="ps-3 fw-semibold">${cot.codigo}</td>
                <td>${cot.placa}</td>
                <td>${cliente}</td>
                <td>${cot.mecanico}</td>
                <td>${cot.fecha}</td>
                <td class="text-center">${cot.items}</td>
                <td class="text-end fw-semibold">S/ ${cot.total.toFixed(2)}</td>
                <td class="text-center"><span class="badge ${badgeClass}">${cot.estado}</span></td>
            </tr>`;
    }).join('');
}

function llenarDropdownServiciosCot2() {
    const select = document.querySelector('#selectServicioCot2');
    if (!select) return;

    while (select.options.length > 1) select.remove(1);

    const listaServicios = serviciosDisponibles.length ? serviciosDisponibles : cotizacionesMockData.servicios;
    listaServicios.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio.id;
        option.textContent = `${servicio.nombre} - S/ ${servicio.precio.toFixed(2)}`;
        option.setAttribute('data-precio', servicio.precio);
        option.setAttribute('data-nombre', servicio.nombre);
        select.appendChild(option);
    });
}

function llenarDropdownProductosCot2() {
    const select = document.querySelector('#selectProductoCot2');
    if (!select) return;

    while (select.options.length > 1) select.remove(1);

    const listaProductos = productosDisponibles.length ? productosDisponibles : cotizacionesMockData.productos;
    listaProductos.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.id;
        option.textContent = `${producto.nombre} - S/ ${producto.precio.toFixed(2)}`;
        option.setAttribute('data-precio', producto.precio);
        option.setAttribute('data-nombre', producto.nombre);
        select.appendChild(option);
    });
}

function actualizarPrecioServicioCot2() {
    const select = document.querySelector('#selectServicioCot2');
    const inputPrecio = document.querySelector('#inputPrecioServicioCot2');
    if (!select || !inputPrecio) return;

    const selectedOption = select.options[select.selectedIndex];
    inputPrecio.value = (selectedOption && selectedOption.getAttribute('data-precio'))
        ? parseFloat(selectedOption.getAttribute('data-precio')).toFixed(2)
        : '0.00';
}

function actualizarPrecioProductoCot2() {
    const select = document.querySelector('#selectProductoCot2');
    const inputPrecio = document.querySelector('#inputPrecioProductoCot2');
    if (!select || !inputPrecio) return;

    const selectedOption = select.options[select.selectedIndex];
    inputPrecio.value = (selectedOption && selectedOption.getAttribute('data-precio'))
        ? parseFloat(selectedOption.getAttribute('data-precio')).toFixed(2)
        : '0.00';
}

function agregarServicioDesdeDropdown() {
    const select = document.querySelector('#selectServicioCot2');
    const inputCantidad = document.querySelector('#inputCantidadServicioCot2');
    const inputPrecio = document.querySelector('#inputPrecioServicioCot2');

    if (!select || !inputCantidad || !inputPrecio) return;

    const itemId = select.value;
    const selectedOption = select.options[select.selectedIndex];

    if (!itemId || !selectedOption || selectedOption.value === '') {
        alert('Seleccione un servicio válido');
        return;
    }

    const nombre = selectedOption.getAttribute('data-nombre');
    const cantidad = parseInt(inputCantidad.value) || 1;
    const precioUnitario = parseFloat(inputPrecio.value) || 0;
    const subtotal = cantidad * precioUnitario;

    serviciosAgregadosCot2.push({
        id: ++idCounterServiciosCot2,
        itemId: parseInt(itemId),
        nombre: nombre,
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        subtotal: subtotal
    });

    renderizarListaServiciosCot2();
    calcTotalesCot2();

    // Resetear
    select.selectedIndex = 0;
    inputCantidad.value = 1;
    inputPrecio.value = '0.00';
}

function agregarProductoDesdeDropdown() {
    const select = document.querySelector('#selectProductoCot2');
    const inputCantidad = document.querySelector('#inputCantidadProductoCot2');
    const inputPrecio = document.querySelector('#inputPrecioProductoCot2');

    if (!select || !inputCantidad || !inputPrecio) return;

    const itemId = select.value;
    const selectedOption = select.options[select.selectedIndex];

    if (!itemId || !selectedOption || selectedOption.value === '') {
        alert('Seleccione un producto válido');
        return;
    }

    const nombre = selectedOption.getAttribute('data-nombre');
    const cantidad = parseInt(inputCantidad.value) || 1;
    const precioUnitario = parseFloat(inputPrecio.value) || 0;
    const subtotal = cantidad * precioUnitario;

    refaccionesAgregadasCot2.push({
        id: ++idCounterRefaccionesCot2,
        itemId: parseInt(itemId),
        nombre: nombre,
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        subtotal: subtotal
    });

    renderizarListaRefaccionesCot2();
    calcTotalesCot2();

    // Resetear
    select.selectedIndex = 0;
    inputCantidad.value = 1;
    inputPrecio.value = '0.00';
}

function eliminarServicioCot2(id) {
    serviciosAgregadosCot2 = serviciosAgregadosCot2.filter(s => s.id !== id);
    renderizarListaServiciosCot2();
    calcTotalesCot2();
}

function eliminarRefaccionCot2(id) {
    refaccionesAgregadasCot2 = refaccionesAgregadasCot2.filter(r => r.id !== id);
    renderizarListaRefaccionesCot2();
    calcTotalesCot2();
}

function renderizarListaServiciosCot2() {
    const container = document.querySelector('#listServiciosCot2');
    if (!container) return;

    if (serviciosAgregadosCot2.length === 0) {
        container.innerHTML = '<p class="text-muted small mb-0">No hay servicios agregados.</p>';
        return;
    }

    container.innerHTML = serviciosAgregadosCot2.map(s => `
        <div class="d-flex align-items-center justify-content-between border-bottom py-1 px-2">
            <div class="small">
                <span class="badge bg-primary me-2">Servicio</span>
                <strong>${s.nombre}</strong>
                <span class="text-muted ms-2">x${s.cantidad}</span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="small fw-semibold">S/ ${s.subtotal.toFixed(2)}</span>
                <button type="button" class="btn btn-sm btn-outline-danger py-0 px-1 btn-elim-servicio" data-id="${s.id}" title="Eliminar">
                    <i class="bi bi-trash small"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-elim-servicio').forEach(btn => {
        btn.addEventListener('click', () => eliminarServicioCot2(parseInt(btn.getAttribute('data-id'))));
    });
}

function renderizarListaRefaccionesCot2() {
    const container = document.querySelector('#listRefaccionesCot2');
    if (!container) return;

    if (refaccionesAgregadasCot2.length === 0) {
        container.innerHTML = '<p class="text-muted small mb-0">No hay refacciones agregadas.</p>';
        return;
    }

    container.innerHTML = refaccionesAgregadasCot2.map(r => `
        <div class="row g-2 align-items-center border-bottom py-1">
            <div class="col-4 small">
                <span class="badge bg-success me-1">Prod</span>
                <strong>${r.nombre}</strong>
            </div>
            <div class="col-2 text-center small">${r.cantidad}</div>
            <div class="col-2 text-end small">S/ ${r.precioUnitario.toFixed(2)}</div>
            <div class="col-3 text-end small fw-semibold">S/ ${r.subtotal.toFixed(2)}</div>
            <div class="col-1 text-center">
                <button type="button" class="btn btn-sm btn-outline-danger py-0 px-1 btn-elim-refaccion" data-id="${r.id}" title="Eliminar">
                    <i class="bi bi-trash small"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-elim-refaccion').forEach(btn => {
        btn.addEventListener('click', () => eliminarRefaccionCot2(parseInt(btn.getAttribute('data-id'))));
    });
}

function calcTotalesCot2() {
    const totServicios = serviciosAgregadosCot2.reduce((sum, s) => sum + s.subtotal, 0);
    const totRefacciones = refaccionesAgregadasCot2.reduce((sum, r) => sum + r.subtotal, 0);
    const total = totServicios + totRefacciones;
    const anticipoInput = document.querySelector('#inputAnticipoCot2');
    const anticipo = parseFloat(anticipoInput?.value) || 0;
    const saldo = total - anticipo;

    const set = (id, valor) => {
        const el = document.querySelector(id);
        if (el) el.textContent = `S/ ${valor.toFixed(2)}`;
    };

    set('#totServiciosCot2', totServicios);
    set('#totRefaccionesCot2', totRefacciones);
    set('#resumenServiciosCot2', totServicios);
    set('#resumenRefaccionesCot2', totRefacciones);
    set('#resumenTotalCot2', total);
    set('#saldoRestanteCot2', saldo);

    return { totServicios, totRefacciones, total, anticipo, saldo };
}

function llenarDropdownMecanicoCot2() {
    const select = document.querySelector('#selectMecanicoCot2');
    if (!select) return;

    while (select.options.length > 1) select.remove(1);

    const listaMecanicos = mecanicosDisponibles.length ? mecanicosDisponibles : cotizacionesMockData.mecanicos;
    listaMecanicos.forEach(mecanico => {
        const option = document.createElement('option');
        option.value = mecanico.id;
        option.textContent = mecanico.nombre;
        select.appendChild(option);
    });
}

function buscarVehiculoCot2() {
    const placaInput = document.querySelector('#inputPlacaCot2');
    if (!placaInput) return;

    const placa = placaInput.value.trim().toUpperCase();

    const infoCliente = document.querySelector('#infoClienteCot2');
    const mensajeSinCliente = document.querySelector('#mensajeSinClienteCot2');
    const infoVehiculo = document.querySelector('#infoVehiculoCot2');
    const mensajeSinVehiculo = document.querySelector('#mensajeSinVehiculoCot2');

    if (!placa) {
        infoCliente?.classList.add('d-none');
        infoVehiculo?.classList.add('d-none');
        if (mensajeSinCliente) mensajeSinCliente.style.display = 'block';
        if (mensajeSinVehiculo) mensajeSinVehiculo.style.display = 'block';
        vehiculoActivoCot2 = null;
        return;
    }

    const vehiculo = cotizacionesMockData.vehiculos[placa];

    if (!vehiculo) {
        alert('No se encontró ningún vehículo con esa placa');
        infoCliente?.classList.add('d-none');
        infoVehiculo?.classList.add('d-none');
        vehiculoActivoCot2 = null;
        return;
    }

    vehiculoActivoCot2 = { placa, ...vehiculo };

    // Datos del cliente
    document.querySelector('#cot2ClienteNombre').textContent = vehiculo.cliente;
    document.querySelector('#cot2ClienteTelefono').textContent = vehiculo.telefono;
    document.querySelector('#cot2ClienteEmail').textContent = vehiculo.email;
    document.querySelector('#cot2ClienteDocumento').textContent = vehiculo.documento || '--';
    infoCliente?.classList.remove('d-none');
    if (mensajeSinCliente) mensajeSinCliente.style.display = 'none';

    // Datos del vehículo
    document.querySelector('#cot2VehiculoNombre').textContent = vehiculo.marca;
    document.querySelector('#cot2VehiculoPlaca').textContent = placa;
    document.querySelector('#cot2VehiculoColor').textContent = vehiculo.color || '--';
    document.querySelector('#cot2VehiculoKm').textContent = vehiculo.kilometraje 
        ? `${vehiculo.kilometraje.toLocaleString()} km` 
        : '--';
    infoVehiculo?.classList.remove('d-none');
    if (mensajeSinVehiculo) mensajeSinVehiculo.style.display = 'none';
}

function limpiarModalCotizacion2() {
    document.querySelector('#inputPlacaCot2').value = '';
    document.querySelector('#selectMecanicoCot2').selectedIndex = 0;
    document.querySelector('#inputAnticipoCot2').value = '';
    document.querySelector('#selectValidezCot2').selectedIndex = 0;

    document.querySelector('#infoClienteCot2')?.classList.add('d-none');
    document.querySelector('#infoVehiculoCot2')?.classList.add('d-none');
    document.querySelector('#mensajeSinClienteCot2').style.display = 'block';
    document.querySelector('#mensajeSinVehiculoCot2').style.display = 'block';
    vehiculoActivoCot2 = null;

    serviciosAgregadosCot2 = [];
    refaccionesAgregadasCot2 = [];
    idCounterServiciosCot2 = 0;
    idCounterRefaccionesCot2 = 0;

    renderizarListaServiciosCot2();
    renderizarListaRefaccionesCot2();
    calcTotalesCot2();

    document.querySelector('#selectServicioCot2').selectedIndex = 0;
    document.querySelector('#selectProductoCot2').selectedIndex = 0;
    document.querySelector('#inputCantidadServicioCot2').value = 1;
    document.querySelector('#inputCantidadProductoCot2').value = 1;
    document.querySelector('#inputPrecioServicioCot2').value = '0.00';
    document.querySelector('#inputPrecioProductoCot2').value = '0.00';
}

function guardarCotizacion2() {
    const mecanicoSelect = document.querySelector('#selectMecanicoCot2');

    if (!mecanicoSelect.value) {
        alert('Seleccione un mecánico');
        return;
    }
    if (!vehiculoActivoCot2) {
        alert('Busque y seleccione un vehículo válido por placa');
        return;
    }

    const totales = calcTotalesCot2();
    if (totales.total <= 0) {
        alert('Agregue al menos un servicio o refacción con monto mayor a cero');
        return;
    }

    const totalItems = serviciosAgregadosCot2.length + refaccionesAgregadasCot2.length;
    const nuevoNumero = cotizacionesMockData.cotizaciones.length + 1;

    const nuevaCotizacion = {
        id: nuevoNumero,
        codigo: `COT-${String(nuevoNumero).padStart(3, '0')}`,
        placa: vehiculoActivoCot2.placa,
        mecanico: mecanicoSelect.options[mecanicoSelect.selectedIndex].textContent,
        fecha: new Date().toLocaleDateString('es-PE'),
        items: totalItems,
        total: totales.total,
        estado: 'Pendiente',
        detalleServicios: [...serviciosAgregadosCot2],
        detalleRefacciones: [...refaccionesAgregadasCot2]
    };

    cotizacionesMockData.cotizaciones.unshift(nuevaCotizacion);
    renderTablaCotizaciones2();

    const modalEl = document.querySelector('#modalNuevaCotizacion2');
    const modalInstancia = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstancia.hide();

    limpiarModalCotizacion2();
    alert(`✅ Cotización ${nuevaCotizacion.codigo} guardada exitosamente\nTotal: S/ ${totales.total.toFixed(2)}`);
}

function configurarEventosCotizacion2() {
    // Dropdowns de servicios
    const selectServicio = document.querySelector('#selectServicioCot2');
    if (selectServicio) selectServicio.addEventListener('change', actualizarPrecioServicioCot2);

    const btnAgregarServicio = document.querySelector('#btnAgregarServicioCot2');
    if (btnAgregarServicio) btnAgregarServicio.addEventListener('click', agregarServicioDesdeDropdown);

    // Dropdowns de productos
    const selectProducto = document.querySelector('#selectProductoCot2');
    if (selectProducto) selectProducto.addEventListener('change', actualizarPrecioProductoCot2);

    const btnAgregarProducto = document.querySelector('#btnAgregarProductoCot2');
    if (btnAgregarProducto) btnAgregarProducto.addEventListener('click', agregarProductoDesdeDropdown);

    // Buscar placa
    const btnBuscarPlaca = document.querySelector('#btnBuscarPlacaCot2');
    if (btnBuscarPlaca) btnBuscarPlaca.addEventListener('click', buscarVehiculoCot2);

    const inputPlaca = document.querySelector('#inputPlacaCot2');
    if (inputPlaca) {
        inputPlaca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculoCot2();
            }
        });
    }

    // Anticipo
    const inputAnticipo = document.querySelector('#inputAnticipoCot2');
    if (inputAnticipo) inputAnticipo.addEventListener('input', calcTotalesCot2);

    // Guardar
    const btnGuardar = document.querySelector('#btnGuardarCotizacion2');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarCotizacion2);

    // Buscador de tabla
    const inputBuscar = document.querySelector('#inputBuscarCotizacion2');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', () => renderTablaCotizaciones2(inputBuscar.value));
    }

    // Cerrar
    const btnCerrar = document.querySelector('#btnCerrarCotizaciones2');
    if (btnCerrar) btnCerrar.addEventListener('click', () => btnMenuInicio.click());
}

function inicializarCotizaciones2() {
    if (!serviciosDisponibles.length) serviciosDisponibles = cotizacionesMockData.servicios;
    if (!productosDisponibles.length) productosDisponibles = cotizacionesMockData.productos;
    if (!mecanicosDisponibles.length) mecanicosDisponibles = cotizacionesMockData.mecanicos;

    serviciosAgregadosCot2 = [];
    refaccionesAgregadasCot2 = [];
    idCounterServiciosCot2 = 0;
    idCounterRefaccionesCot2 = 0;

    renderTablaCotizaciones2();
    llenarDropdownMecanicoCot2();
    llenarDropdownServiciosCot2();
    llenarDropdownProductosCot2();
    limpiarModalCotizacion2();
    configurarEventosCotizacion2();
}

// ============ 8. NAVEGACIÓN ============

btnMenuInicio.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';
    location.reload();
});

btnMenuOrdenes.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';
    
    if (!templateOrdenes) {
        templateOrdenes = document.querySelector('#templateOrdenes').content;
    }
    
    const clone = templateOrdenes.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);
});

btnMenuAgenda.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';
    
    if (!templateAgenda) {
        templateAgenda = document.querySelector('#templateAgenda').content;
    }
    
    const clone = templateAgenda.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);
    
    inicializarAgenda(agendaData);
    inicializarModalHorario(modalHorarioData);
    
    document.querySelectorAll('#tabsDiasHorario .tab-dia').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const dia = tab.getAttribute('data-dia');
            cambiarTabDiaActivo(dia);
            mostrarBloquesOcupados(dia, modalHorarioData);
        });
    });
    
    document.querySelectorAll('.btn-editar-dia').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const dia = btn.getAttribute('data-dia');
            cambiarTabDiaActivo(dia);
            mostrarBloquesOcupados(dia, modalHorarioData);
            const modal = new bootstrap.Modal(document.querySelector('#modalHorario'));
            modal.show();
        });
    });
    
    document.querySelectorAll('.celda-agenda').forEach(celda => {
        celda.addEventListener('click', () => {
            const dia = celda.getAttribute('data-dia');
            cambiarTabDiaActivo(dia);
            mostrarBloquesOcupados(dia, modalHorarioData);
            const modal = new bootstrap.Modal(document.querySelector('#modalHorario'));
            modal.show();
        });
    });
});

btnMenuCotizaciones.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';
    
    if (!templateCotizaciones) {
        templateCotizaciones = document.querySelector('#templateCotizaciones').content;
    }
    
    const clone = templateCotizaciones.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);
    
    setTimeout(() => inicializarCotizaciones(), 0);
});

btnMenuCotizaciones2.addEventListener('click', () => {
    contenedorReactivo.innerHTML = '';

    if (!templateCotizaciones2) {
        templateCotizaciones2 = document.querySelector('#templateCotizaciones2').content;
    }

    const clone = templateCotizaciones2.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);

    setTimeout(() => inicializarCotizaciones2(), 0);
});

// ============ 9. SOCKETS (PREPARADOS) ============
/* socket.on('/index/listarUsuarios', (data) => {
    listadoGeneralContactos = data;
    console.log(listadoGeneralContactos);
}); */

// ============ 10. INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
    actualizarDashboard(dashboardData);
    
    const templateOrdenesEl = document.querySelector('#templateOrdenes');
    const templateAgendaEl = document.querySelector('#templateAgenda');
    const templateCotizacionesEl = document.querySelector('#templateCotizaciones');
    const templateCotizaciones2El = document.querySelector('#templateCotizaciones2');
    
    if (templateOrdenesEl) templateOrdenes = templateOrdenesEl.content;
    if (templateAgendaEl) templateAgenda = templateAgendaEl.content;
    if (templateCotizacionesEl) templateCotizaciones = templateCotizacionesEl.content;
    if (templateCotizaciones2El) templateCotizaciones2 = templateCotizaciones2El.content;
});