const db = require('./src/config_db/config_mysql');

/* Este componente sirve  para levantar o iniciar el sevidor */
const app = require('./app');
const server = app.listen(app.get('port'));
//Websockets
const socketIO = require('socket.io');
/* const db = require('express-myconnection'); */
const io = socketIO(server);

io.of('/index').on('connection', async(socket)=>{

    await db.query('SELECT * from usuarios',(err, results) =>{
        if (err) {
            console.error('Error en la consulta:', err);
        }
        let listadoGeneralUsuarios
        for (let i = 0; i < results.length; i++) {
            listadoGeneralUsuarios = results[i];
        }
        
        io.of('/index').to(socket.id).emit('/index/listarUsuarios', listadoGeneralUsuarios);
    })
    /* Listar avisos */
    db.query('SELECT * from usuarios',(err, results) =>{
        if (err) {
            console.error('Error en la consulta:', err);
        }
        let listadoGeneralUsuarios
        for (let i = 0; i < results.length; i++) {
            listadoGeneralUsuarios = results[i];
        }
        
        io.of('/index').to(socket.id).emit('/index/listarUsuarios', listadoGeneralUsuarios);
    })

    /* Editar avisos */

    /* Resgitrar avisos */
});
io.of('/login').on('db', (socket)=>{

});
io.of('/administrador').on('db', (socket)=>{

});

/* SERVIDOR DE COSULTA A DB CON SOCKET PARA EL LADO CLIENTE (backend) */
io.of('/cliente').on('db', (socket)=>{

});

/* console.log('Servidor inicializado en puerto', app.get('port'));
console.log(db); */

