const express = require('express');
const router =  express.Router();

//Middlewares
const {verificarToken,verificarVista} = require('../middleware/authMiddleware');
const upload = require('../middleware/fileMiddleware');

//Controllers
const controladorAuth = require('../controllers/controllerAuth');
const controladorPersona = require('../controllers/controllerPersona');

/* vistas de reenderizado */
router.get('/', (req, res) => {
    res.render('index');
});
router.get('/root', verificarVista, (req, res) => {
    res.render('root');
});
router.get('/admin', verificarVista, (req, res) => {
    res.render('administrador');
});
router.get('/mecanico', verificarVista, (req, res) => {
    res.render('mecanico');
});
router.get('/cliente', verificarVista, (req, res) => {
    res.render('cliente');
});


// end point de backend
router.post('/api/login', controladorAuth.login);
router.post('/api/logout', controladorAuth.logout);
router.get('/api/listarPersonas', verificarToken, controladorPersona.listarPersonas);
router.get('/api/listarUsuarios',verificarToken, controladorPersona.listarUsuarios);


module.exports = router;