document.addEventListener('DOMContentLoaded', async () => {
    await cargarClientes();
    /* await cargarMensajes(); */
    inicializarToastCerrar();
    mostrarDashboard()

    /* setInterval(cargarPersonas, 5000); //aca podemos hacer polling cada 5Segundos*/
});

// Creación de fragmento para optimizar manipulaciones del DOM
const fragmento = document.createDocumentFragment();

/* Invocamos a los botones */
let btnMenuClientes = document.querySelector('#btnMenuClientes');
let btnMenuVehiculos = document.querySelector('#btnMenuVehiculos');
let btnMenulogistica = document.querySelector('#btnMenulogistica');
let btnMenuOperaciones = document.querySelector('#btnMenuOperaciones');
let btnMenuVentas = document.querySelector('#btnMenuVentas');
let btnMenuReportes = document.querySelector('#btnMenuReportes');
let btnMenuConfiguracion = document.querySelector('#btnMenuConfiguracion');
let btnMenuCerrar = document.querySelector('#btnMenuCerrar');

// Capturar referencia al contenedor principal de renderizado
let contenedorReactivo = document.querySelector('#contenedorReactivo');

// Capturar los templates de las secciones
const templateContenedorClientes = document.querySelector('#templateContenedorClientes').content;
const templateVehiculos = document.querySelector('#templateVehiculos').content;
/* const templateAlbum = document.querySelector('#templateAlbum').content;
const templateNotificacion = document.querySelector('#templateNotificacion').content;
const templateConfiguracion = document.querySelector('#templateConfiguracion').content; */


/* Variables globales */
let listadoGeneralClientes = [];

async function cargarClientes() {
    try {

        const response = await axios.get("/api/listarPersonas");
        listadoGeneralClientes = [...response.data];

    } catch (error) {

        console.error(error);
    }
}

btnMenuClientes.addEventListener('click', function(){
    contenedorReactivo.innerHTML = "";
    const clone = templateContenedorClientes.cloneNode(true);
    fragmento.appendChild(clone);
    contenedorReactivo.appendChild(fragmento);
    listarClientes();
});

btnMenuInicio.addEventListener('click', mostrarDashboard);

async function mostrarDashboard() {

    // Limpiar contenedor principal
    contenedorReactivo.innerHTML = '';

    // Obtener template
    const template = document.querySelector('#templateDashboard');

    if (!template) {
        console.error('No existe templateDashboard');
        return;
    }

    // Clonar contenido
    const clone = template.content.cloneNode(true);

    // Renderizar
    contenedorReactivo.appendChild(clone);

    // Consultar datos reales
    /* await cargarDashboard(); */
}

function listarClientes() {
    let contenedorTablaCliente = document.querySelector('#contenedorTablaCliente');
    const templateTablaClientes = document.querySelector('#templateTablaClientes').content;
    contenedorTablaCliente.innerHTML = "";

    listadoGeneralClientes.forEach(persona => {
        templateTablaClientes.querySelector('.id-persona').textContent = persona.id_persona;
        templateTablaClientes.querySelector('.documento-persona').textContent = persona.documento;
        templateTablaClientes.querySelector('.nombres-persona').textContent = persona.nombres;
        templateTablaClientes.querySelector('.telefono-persona').textContent = persona.telefono;
        /* if (persona.estado == 'activo') {
            templateTablaClientes.querySelector('#contenedorEstadoListar').innerHTML = innerHTML = `<span class="rounded bg-success p-1 text-white">Activo</span>`;
        }
        if (persona.estado == 'inactivo') {
            templateTablaClientes.querySelector('#contenedorEstadoListar').innerHTML = innerHTML = `<span class="rounded bg-danger p-1 text-white">Inactivo</span>`;
        } */
        templateTablaClientes.querySelector('#verVehiculo').dataset.id = persona.id_persona;
        templateTablaClientes.querySelector('#editarPersona').dataset.id = persona.id_persona;
        templateTablaClientes.querySelector('#eliminarPersona').dataset.id = persona.id_persona;
        
        const clone = templateTablaClientes.cloneNode(true);
        fragmento.appendChild(clone);
    });

    contenedorTablaCliente.appendChild(fragmento);
}

//Delegación para cambiar campos de acuerdo al tipo de persona
const tipoDocumento = document.querySelector('#tipoDocumento');
const contenedorDatosCliente = document.querySelector('#contenedorDatosCliente');

function mostrarCamposCliente() {
    const tipo = tipoDocumento.value;

    if (tipo === 'RUC') {
        contenedorDatosCliente.innerHTML = `
            <div class="col">
                <div class="input-style mb-3">
                    <input id="nombres" class="input-style-error" type="text" placeholder=" ">
                    <label for="nombres">
                        <i class="bi bi-person me-2"></i>Razón Social
                    </label>
                </div>
            </div>
        `;
    } else {
        contenedorDatosCliente.innerHTML = `
            <div class="col-lg-6">
                <div class="input-style mb-3">
                    <input id="nombres" class="input-style-error" type="text" placeholder=" ">
                    <label for="nombres">
                        <i class="bi bi-person me-2"></i>Nombres
                    </label>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="input-style mb-3">
                    <input id="apellidos" class="input-style-error" type="text" placeholder=" ">
                    <label for="apellidos">
                        <i class="bi bi-person me-2"></i>Apellidos
                    </label>
                </div>
            </div>
        `;
    }
}

tipoDocumento.addEventListener('change', mostrarCamposCliente);
mostrarCamposCliente();

//Delegación para registrar una nueva persona
document.addEventListener('click', function(event) {
    const btnRegistrar = event.target.closest('#btnAñadirCliente');
    if (!btnRegistrar) {
        return;
    }

    let tipoDocumento = document.querySelector("#tipoDocumento").value;
    let documento = document.querySelector("#documento").value;
    let nombres = document.querySelector("#nombres").value;
    /* let apellidos = document.querySelector("#apellidos").value; */
    let apellidos = tipoDocumento === 'DNI' ? document.querySelector('#apellidos').value.trim(): ''
    let direccion = document.querySelector("#direccion").value;
    let telefono = document.querySelector("#telefono").value;
    /* let correo = document.querySelector("#correoRegistro").value;
    let password = document.querySelector("#passwordRegistro").value; */

    if (!documento || !nombres || !telefono ) {
        mostrarToast('error', 'Campos Vacios', 'Ingrese los datos solicitados');
        return;
    }
    if (tipoDocumento == 'RUC') {
        if (documento.length != 11) {
            mostrarToast('error', 'Error de datos', 'El RUC debe ser de 11 digitos');
            return;
        }
    }
    if (tipoDocumento == 'DNI') {
        if (documento.length != 8) {
            mostrarToast('error', 'Error de datos', 'El DNI debe ser de 8 digitos');
            return;
        }
    }

    let correo = documento + '@innova.com';
    let password = 'innova123';
    let tipo_persona = tipoDocumento === 'RUC' ? 'JURIDICA' : 'NATURAL';
    let tipo_documento = tipoDocumento;
    
    axios.post("/api/registrarPersona",
    {
        tipo_persona,
        tipo_documento,
        documento,
        nombres,
        apellidos,
        direccion,
        telefono,
        correo,
        password
    })
    .then(async(res) => {
        if (res.data.ok) {
            await cargarClientes();// Actualizar los datos
            listarClientes(); // Actualizar la tabla
            limpiarRegistro();

            $('#modalRegistro').modal("hide");

            if ($('.modal-backdrop').is(':visible')) {
                $('.modal-backdrop').remove();
            }
            mostrarToast('exito', 'Registro Exitoso', 'Los datos fueron registrados correctamente');
        } else {
            alert(res.data.mensaje);
        }

    })
    .catch((error) => {
        if (error.response) {
        mostrarToast('error', 'Error', error.response.data.mensaje);
        }
    });
});

function limpiarRegistro() {
    /* document.getElementById("registroBody").reset(); */
    let tipoDocumento = document.querySelector("#tipoDocumento").value;
    document.querySelector("#tipoDocumento").value = 'DNI';
    document.querySelector("#documento").value ='';
    document.querySelector("#nombres").value ='';
    tipoDocumento === 'DNI' ? document.querySelector('#apellidos').value = '': ''
    document.querySelector("#direccion").value = '';
    document.querySelector("#telefono").value ='';
    mostrarCamposCliente();
}

// ============================================================
// TOASTS / ALERTAS PERSONALIZADAS
// ============================================================
var toastTimeoutId = null;

function mostrarToast(tipo, titulo, mensaje) {
  var toast = document.getElementById('toastCertificado');
  var icono = document.getElementById('toastIcono');
  var elTitulo = document.getElementById('toastTitulo');
  var elMensaje = document.getElementById('toastMensaje');

  if (!toast || !icono || !elTitulo || !elMensaje) return;

  elTitulo.textContent = titulo;
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
  toastTimeoutId = setTimeout(function() {
    toast.classList.remove('is-visible');
  }, 4000);
}

function inicializarToastCerrar() {
  var btnCerrar = document.getElementById('toastCerrar');
  var toast = document.getElementById('toastCertificado');
  if (!btnCerrar || !toast) return;

  btnCerrar.addEventListener('click', function() {
    toast.classList.remove('is-visible');
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
  });
}

/* btnMenuGaleria.addEventListener('click', function(){
    contenedorReactivo.innerHTML = "";

    templateGaleria.querySelector('.mi-galeria').textContent = "Yo me reenderizo cuando haces clic en galeria";

    const clone = templateGaleria.cloneNode(true);
    fragmento.appendChild(clone);

    contenedorReactivo.appendChild(fragmento);
}); */
