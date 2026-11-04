
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

let _enviandoLogin = false;

async function validarUsuario() {
  const correo = inputUsuario.value.trim();
  const password = inputPassword.value;

  if (!correo || !password) {
    mostrarToast('advertencia', 'Campos incompletos', 'Ingrese su correo y contraseña.');
    return;
  }
  if (!expresiones.test(correo)) {
    mostrarToast('advertencia', 'Correo inválido', 'Ingrese un correo con formato válido.');
    inputUsuario.focus();
    return;
  }
  if (_enviandoLogin) return;

  _enviandoLogin = true;
  const boton = document.querySelector('#btn_login');
  if (boton) boton.disabled = true;
  try {
    const res = await axios.post('/api/login', { usuario: correo, password });
    if (!res.data || !res.data.ok || !res.data.usuario) {
      mostrarToast('error', 'No se pudo iniciar sesión', res.data?.mensaje || 'Verifique sus credenciales.');
      return;
    }

    const destinos = { 1: '/admin', 3: '/mecanico', 4: '/cliente' };
    const destino = destinos[res.data.usuario.rol];
    if (!destino) {
      mostrarToast('error', 'Acceso no disponible', 'El usuario no tiene un perfil habilitado para ingresar.');
      return;
    }

    limpiarLogin();
    window.location.href = destino;
  } catch (error) {
    console.error(error);
    const mensaje = error.response?.data?.mensaje || 'No se pudo conectar con el servidor. Inténtelo nuevamente.';
    mostrarToast('error', 'Error de acceso', mensaje);
  } finally {
    _enviandoLogin = false;
    if (boton) boton.disabled = false;
  }
}

function limpiarRegistro() {
  document.querySelector("#documento").value ='';
  document.querySelector("#nombres").value ='';
  document.querySelector("#apellidos").value ='';
  document.querySelector("#telefono").value ='';
  document.querySelector("#correoRegistro").value ='';
  document.querySelector("#passwordRegistro").value ='';
}

let _enviandoRegistro = false;

async function guardarRegistro() {
  const documentoInput = document.querySelector('#documento');
  const apellidosInput = document.querySelector('#apellidos');
  if (!documentoInput || !apellidosInput) {
    mostrarToast('advertencia', 'Registro incompleto',
      'El formulario público no tiene los datos ni la ruta necesarios para crear una cuenta. No se enviaron datos; este cambio requiere ajustar el backend.');
    return;
  }

  const documento = documentoInput.value.trim();
  const nombres = document.querySelector('#nombres').value.trim();
  const apellidos = apellidosInput.value.trim();
  const telefono = document.querySelector('#telefono').value.trim();
  const correo = document.querySelector('#correoRegistro').value.trim();
  const password = document.querySelector('#passwordRegistro').value;

  if (!documento || !nombres || !apellidos || !telefono || !correo || !password) {
    mostrarToast('advertencia', 'Campos incompletos', 'Complete documento, nombres, apellidos, teléfono, correo y contraseña.');
    return;
  }
  if (!/^\d{8}$/.test(documento)) {
    mostrarToast('advertencia', 'Documento inválido', 'El DNI debe contener exactamente 8 dígitos.');
    documentoInput.focus();
    return;
  }
  if (nombres.length < 2 || apellidos.length < 2 || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/.test(nombres) || !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/.test(apellidos)) {
    mostrarToast('advertencia', 'Nombre inválido', 'Ingrese nombres y apellidos válidos, con al menos 2 caracteres.');
    return;
  }
  if (!expresiones.test(correo)) {
    mostrarToast('advertencia', 'Correo inválido', 'Ingrese un correo con formato válido.');
    return;
  }
  const digitosTelefono = telefono.replace(/\D/g, '');
  if (digitosTelefono.length < 7 || digitosTelefono.length > 15) {
    mostrarToast('advertencia', 'Teléfono inválido', 'Ingrese un teléfono con entre 7 y 15 dígitos.');
    return;
  }
  if (password.length < 8) {
    mostrarToast('advertencia', 'Contraseña débil', 'La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  if (_enviandoRegistro) return;

  _enviandoRegistro = true;
  if (btnRegistrar) btnRegistrar.disabled = true;
  try {
    const res = await axios.post('/api/registrarPersona', { documento, nombres, apellidos, telefono, correo, password });
    if (!res.data || !res.data.ok) {
      mostrarToast('error', 'No se pudo registrar', res.data?.mensaje || 'Revise los datos e inténtelo nuevamente.');
      return;
    }
    mostrarToast('exito', 'Datos registrados', 'La persona fue registrada. La habilitación de acceso se gestiona desde el taller.');
    limpiarRegistro();
  } catch (error) {
    console.error(error);
    const mensaje = error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo completar el registro.';
    mostrarToast('error', 'Error de registro', mensaje);
  } finally {
    _enviandoRegistro = false;
    if (btnRegistrar) btnRegistrar.disabled = false;
  }
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





