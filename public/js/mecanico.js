/* Scrip para frontend */
/* const socket = io('/administrador'); */

// Creación de fragmento para optimizar manipulaciones del DOM
const fragmento = document.createDocumentFragment();

/* Invocamos a los botones */
let btnMenuContactos = document.querySelector('#btnMenuContactos');
let btnMenuGaleria = document.querySelector('#btnMenuGaleria');
let btnMenuAlbum = document.querySelector('#btnMenuAlbum');
let btnMenuNotificacion = document.querySelector('#btnMenuNotificacion');
let btnMenuConfiguracion = document.querySelector('#btnMenuConfiguracion');
let btnMenuCerrar = document.querySelector('#btnMenuCerrar');

// Capturar referencia al contenedor principal de renderizado
let contenedorReactivo = document.querySelector('#contenedorReactivo');

// Capturar los templates de las secciones
const templateContactos = document.querySelector('#templateContactos').content;
const templateGaleria = document.querySelector('#templateGaleria').content;
/* const templateAlbum = document.querySelector('#templateAlbum').content;
const templateNotificacion = document.querySelector('#templateNotificacion').content;
const templateConfiguracion = document.querySelector('#templateConfiguracion').content; */


/* Variables globales */
let listadoGeneralUsuarios = {};



/* Sockets de escucha */
/* socket.on('/index/listarUsuarios', (data)=>{
    listadoGeneralContactos = data;  
    console.log(listadoGeneralContactos);
    
}) */

/* Funciones de los botones para reenderizar elDOM */


btnMenuContactos.addEventListener('click', function(){

    axios.get('/api/listarUsuarios').then(respuesta => {
        listadoGeneralUsuarios = respuesta.data;
        console.log(listadoGeneralUsuarios);

    listadoGeneralUsuarios.forEach(usuario => {
        templateContactos.querySelector('.email').textContent = usuario.email;
        templateContactos.querySelector('.rol').textContent = usuario.id_rol;
        templateContactos.querySelector('.tipo-persona').textContent = usuario.id_tipo_persona;

        const clone = templateContactos.cloneNode(true);
        fragmento.appendChild(clone);
    })

    contenedorReactivo.appendChild(fragmento);

    }).catch(error => {
        console.error('Error al listar usuarios:', error);
    });
    
    contenedorReactivo.innerHTML = "";
});

btnMenuGaleria.addEventListener('click', function(){
    contenedorReactivo.innerHTML = "";

    templateGaleria.querySelector('.mi-galeria').textContent = "Yo me reenderizo cuando haces clic en galeria";

    const clone = templateGaleria.cloneNode(true);
    fragmento.appendChild(clone);

    contenedorReactivo.appendChild(fragmento);
});
