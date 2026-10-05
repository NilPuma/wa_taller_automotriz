
document.addEventListener('DOMContentLoaded', function() {
  /* inicializarEfectoModales(); */
  inicializarToastCerrar();
});

// ============================================================
// EFECTO DE DIFUMINADO AL ABRIR CUALQUIER MODAL
// ============================================================
/* function inicializarEfectoModales() {
  document.addEventListener('show.bs.modal', function() {
    document.body.classList.add('modal-abierto');
  });

  document.addEventListener('hidden.bs.modal', function() {
    if (!document.querySelector('.modal.show')) {
      document.body.classList.remove('modal-abierto');
    }
  });
} */

// ============================================================
// VALIDAR USUARIO (login)
// ============================================================

let logo = document.querySelector("#logo");
let inputUsuario = document.querySelector("#correoSesion");
let inputPassword = document.querySelector("#passwordSesion");
let btnRegistrar = document.querySelector(".btn-guardar-registro");
let btnRecuperar = document.querySelector(".btn-recueprar-password");

let expresiones = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

logo.addEventListener("click", () => {
  window.location.href = "/";
});

inputUsuario.addEventListener("keypress", function (e) {
  if (e.key == "Enter") {
    inputPassword.focus();
  }
});

inputPassword.addEventListener("keypress", function (e) {
  if (e.key == "Enter") {
    validarUsuario();
  }
});
/* Guardar Registro */
btnRegistrar.addEventListener("click", guardarRegistro);

/* Recuperacion de contraseña */
btnRecuperar.addEventListener("click", recuperarPassword);

/* Incio de Sesion */
function limpiarLogin() {
  document.querySelector("#correoSesion").value = "";
  document.querySelector("#passwordSesion").value = "";
}

function validarUsuario() {
  if (!inputUsuario.value || !inputPassword.value) {
    
    mostrarToast('error', 'Campos Vacios', 'Ingrese usuario y contraseña');
    return;
  }
  /* Consulta a backend */
  axios.post('/api/login', {
    usuario: inputUsuario.value,
    password: inputPassword.value
  })
  .then((res) => {
    if (res.data.ok) { 
        
        let usuario = res.data.usuario
      console.log(usuario.rol);
      
      // Redirige al template administrador
      if (usuario.rol == 1) {
        window.location.href = '/admin';
        mostrarToast('exito', 'BienVenido', 'Acceso Correcto al Sistema');
        limpiarLogin();
      }
      if (usuario.rol == 3) {
        window.location.href = '/mecanico';
        mostrarToast('exito', 'BienVenido', 'Acceso Correcto al Sistema');
        limpiarLogin();
      }
      if (usuario.rol == 4) {
        window.location.href = '/cliente';
        mostrarToast('exito', 'BienVenido', 'Acceso Correcto al Sistema');
        limpiarLogin();
      }
      
    } else {
      /* alert(res.data.mensaje); */
      console.log("hokss");
      
      mostrarToast('error', 'Error', res.data.mensaje);
    }

  })
  .catch((error) => {
    console.error(error);
    if (error.response) {
      /* console.log(error.response.data.mensaje); */
      mostrarToast('error', 'Error de Datos', error.response.data.mensaje);
    } else {
      console.log('No se pudo conectar con el servidor');
    }

  })
}

function limpiarRegistro() {
  document.querySelector("#documento").value ='';
  document.querySelector("#nombres").value ='';
  document.querySelector("#apellidos").value ='';
  document.querySelector("#telefono").value ='';
  document.querySelector("#correoRegistro").value ='';
  document.querySelector("#passwordRegistro").value ='';
}

function guardarRegistro() {
  let documento = document.querySelector("#documento").value;
  let nombres = document.querySelector("#nombres").value;
  let apellidos = document.querySelector("#apellidos").value;
  let telefono = document.querySelector("#telefono").value;
  let correo = document.querySelector("#correoRegistro").value;
  let password = document.querySelector("#passwordRegistro").value;

  if (!documento || !nombres || !telefono || !correo || !password ) {
    mostrarToast('error', 'Campos Vacios', 'Ingrese los datos solicitados');
    return;
  }
  /* Validamos formato de correo */
  let CorreoValido = expresiones.test(correo);
  if(!CorreoValido){
    mostrarToast('error', 'Formato Invalido', 'Es obligatorio ingresar un correo con formato valido para realizar el registro.');
    return;
  }

  axios.post("/api/registrarPersona",
  {
    documento,
    nombres,
    apellidos,
    telefono,
    correo,
    password
  })
  .then((res) => {
    if (res.data.ok) {
      mostrarToast('exito', 'Registro Exitoso', 'Los datos fueron registrados correctamente');
      limpiarRegistro();
    } else {
      alert(res.data.mensaje);
    }
    
  })
  .catch((error) => {
    if (error.response) {
      console.log(error.response);
      mostrarToast('error', 'Error', error.response.data.error);
    } else {
      mostrarToast('error', 'Error', "Error en el servidor");
      
    }
  });
}

function recuperarPassword(){
   console.log("Yo recuper password");
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

function listadoUsuarios() {
    axios.get('/api/listarUsuarios').then(respuesta => {
        
        console.log(respuesta.data);
    })
    .catch(error => {
      console.error('Error al listar usuarios:', error);
    });
}





