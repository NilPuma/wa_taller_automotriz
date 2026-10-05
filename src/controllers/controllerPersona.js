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


module.exports = {
  listarPersonas,
  listarUsuarios,
};
