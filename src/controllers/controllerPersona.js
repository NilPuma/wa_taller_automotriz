/* Controlador para persona */
const bcrypt = require('bcryptjs');
const model = require('../models/modelPersona');

/* const app = require('../../app.js');
const server = app.listen(app.get('port')); */
//Websockets
/* const socketIO = require('socket.io');
const io = socketIO(server); */

/* io.of('/index').on('connection', async(socket)=>{
    try {
        const usuarios = await model.listarUsuarios();
        io.of('/index').to(socket.id).emit('/index/listarUsuarios', usuarios);
    } catch (error) {
        console.log(error);
        return res.status(500).send("Internal Server Error")
    }
    
}); */

// RUTA PARA LA API (JSON)
const listarPersonas = async (req, res) => {
  try {
    const personas = await model.listarPersonas();
    res.json(personas); //Empaquetamos en formato json para enviar a router
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await model.listarUsuarios();
    res.json(usuarios);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* Registrar Persona */
const registrarPersona = async (req, res) => {
  try {
    const {tipo_persona, tipo_documento,documento, nombres, apellidos, direccion, telefono, correo, password } = req.body;

    //Validar datos
    if (!tipo_persona || !tipo_documento || !documento || !nombres || !telefono || !correo || !password ) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Todos los campos son obligatorios...'
      });
    }
    //Verificar si el usuario ya existe
    const personaExiste = await model.buscarPersona(documento);
    const usuarioExiste = await model.buscarUsuario(correo);
    if (personaExiste) {
      return res.status(409).json({
        ok: false,
        mensaje: 'La persona ya se encuentra registrado...'
      });
    }
    if (usuarioExiste) {
      return res.status(409).json({
        ok: false,
        mensaje: 'El correo ya se esta usando, ingrese uno diferente...'
      });
    }
    //Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);
    let persona ={
      tipo_persona,
      tipo_documento,
      documento, 
      nombres, 
      apellidos,
      direccion, 
      telefono, 
      correo,
      estado: 'activo',
      fecha : new Date(),
    }
    let usuario = {
      rol : 4,
      correo,
      passwordHash,
      estado : 'activo',
      fecha: new Date()
    }

    //Guardar persona
    await model.registrarPersona(persona, usuario);

    // Respuesta
    return res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente...'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno del servidor...'
    });
  }
};

//Editar Persona
const actualizarPersona = async (req, res) => {

  try {
    const { idPersona } = req.params;
    const {
      documento,
      nombres,
      apellidos,
      telefono,
      /* estado */
    } = req.body;
    
    if (!idPersona) {

      return res.status(400).json({
        ok: false,
        mensaje:'ID de persona requerido'
      });
    }

    if (!documento || !nombres) {

      return res.status(400).json({

        ok: false,
        mensaje: 'Documento y nombres son obligatorios'

      });

    }

    const persona = await model.buscarPersonaId(idPersona);
    if (!persona) {
      return res.status(404).json({
        ok: false,
        mensaje:'La persona no existe...'
      });
    }

    const documentoExiste = await model.buscarDocumento(documento, idPersona);

    if (documentoExiste) {

      return res.status(409).json({
        ok: false,
        mensaje: 'El documento pertenece a otra persona...'
      });

    }

    const resultado = await model.actualizarPersona(
      idPersona,
      {
        documento,
        nombres,
        apellidos,
        telefono
      }
    );

    return res.json({
      ok: true,
      mensaje:'Persona actualizada correctamente...',
      data: resultado
    });


  } catch (error) {

    console.error('Error actualizar persona:',error);
    return res.status(500).json({

      ok: false,
      mensaje: 'Error interno del servidor...'

    });

  }

};

//Eliminar una persona
const eliminarPersona = async (req, res) => {

    try {
      const { idPersona } = req.params;
      if (!idPersona) {
        return res.status(400).json({
          ok: false,
          mensaje:'ID de persona requerido'
        });
      }

      const persona = await model.buscarPersonaId(idPersona);
      if (!persona) {
        return res.status(404).json({
          ok: false,
          mensaje:'La persona no existe'
        });
      }

      if (persona.estado === 'inactivo') {

        return res.status(400).json({
          ok: false,
          mensaje: 'La persona ya se encuentra inactiva'
        });
      }
      const resultado = await model.eliminarPersona(idPersona);
      return res.json({
        ok: true,
        mensaje: 'Persona eliminada correctamente',
        data: resultado
      });
    } catch (error) {

      console.error('Error eliminando persona:', error);

      return res.status(500).json({
        ok: false,
        mensaje: 'Error interno del servidor'
      });

    }

};

module.exports = {
  listarPersonas,
  listarUsuarios,
  registrarPersona,
  actualizarPersona,
  eliminarPersona
};
