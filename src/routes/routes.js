const express = require('express');
const router =  express.Router();

const controladorUsuarios= require('../controllers/controllerUsuarios');

/* RUTAS DE APIS Y VISTAS INDEX */

// vistas de reenderizado
router.get('/', (req, res) => {
    res.render('index');
});
/* router.get('/login', (req, res) => {
    res.render('login');
}); */
router.get('/root', (req, res) => {
    res.render('root');
});
router.get('/admin', (req, res) => {
    res.render('administrador');
});
router.get('/mecanico', (req, res) => {
    res.render('mecanico');
});
router.get('/cliente', (req, res) => {
    res.render('cliente');
});


// end point backend
router.get('/api/usuarios', controladorUsuarios.listarUsuarios);


module.exports = router;