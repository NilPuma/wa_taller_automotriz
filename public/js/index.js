
/* Script de frontend */
/* const socket = io('/index'); */

// Creación de fragmento para optimizar manipulaciones del DOM
const fragmento = document.createDocumentFragment();

// Capturar referencia al contenedor principal de renderizado
/* let contenedorSlider = document.querySelector('#contenedorSlider'); */

// Capturar los templates de las SECCIONES
/* const templateSlider = document.querySelector('#templateSlider').content; */

//Variables globales para el listado que viene de controlador
let listadoGeneralUsuarios = {};

/* socket.on('/index/listarUsuarios', (data)=>{
    listadoGeneralUsuarios = data;  
    console.log(listadoGeneralUsuarios);
    
}) */

function listadoUsuarios() {
    axios.get('/api/usuarios').then(respuesta => {
        
        console.log(respuesta.data);
    })
    .catch(error => {
      console.error('Error al listar usuarios:', error);
    });
}

listadoUsuarios();



