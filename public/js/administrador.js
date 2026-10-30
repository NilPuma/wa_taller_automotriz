document.addEventListener('DOMContentLoaded', async () => {
    await cargarClientes();
    /* await cargarMensajes();
    inicializarToastCerrar();
    mostrarDashboard() */

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




/* btnMenuGaleria.addEventListener('click', function(){
    contenedorReactivo.innerHTML = "";

    templateGaleria.querySelector('.mi-galeria').textContent = "Yo me reenderizo cuando haces clic en galeria";

    const clone = templateGaleria.cloneNode(true);
    fragmento.appendChild(clone);

    contenedorReactivo.appendChild(fragmento);
}); */
