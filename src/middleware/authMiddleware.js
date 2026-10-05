const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    try {
        const token = req.cookies.token;
        // No existe token
        if (!token) {
            return res.status(401).json({
                ok: false,
                mensaje: 'No autorizado'
            });
        }
        // Verificar JWT
        const datosUsuario = jwt.verify(token, process.env.JWT_SECRET);

        // Guardamos información del usuario
        req.usuario = datosUsuario;

        // Continuar hacia el controlador
        next();
    } catch (error) {
        console.error('Error JWT:', error.message);
        return res.status(401).json({
            ok: false,
            mensaje: 'Sesión inválida o expirada'
        });
    }
};

// Prteger las vistas

const verificarVista = (req, res, next) => {

    try {
        const token = req.cookies.token;
        if (!token) {

            return res.redirect('/index');
        }

        const usuario = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = usuario;

        next();
    } catch (error) {

        return res.redirect('/index');
    }
};

module.exports = {
    verificarToken,
    verificarVista
}