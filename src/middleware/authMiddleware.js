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

// Comprueba que el usuario autenticado tenga uno de los roles permitidos.
const verificarRol = (...rolesPermitidos) => (req, res, next) => {
    const rolUsuario = Number(req.usuario?.id_rol);

    if (!rolesPermitidos.includes(rolUsuario)) {
        return res.status(403).json({
            ok: false,
            mensaje: 'No tiene permisos para realizar esta acción'
        });
    }

    next();
};

// Envía al usuario a su propio portal si intenta abrir la vista de otro rol.
const verificarRolVista = (...rolesPermitidos) => (req, res, next) => {
    const rolUsuario = Number(req.usuario?.id_rol);

    if (rolesPermitidos.includes(rolUsuario)) {
        return next();
    }

    const destinos = {
        1: '/admin',
        3: '/mecanico',
        4: '/cliente'
    };

    return res.redirect(destinos[rolUsuario] || '/');
};

// Protege las vistas comprobando primero que exista una sesión válida.

const verificarVista = (req, res, next) => {

    try {
        const token = req.cookies.token;
        if (!token) {
            return res.redirect('/');
        }

        const usuario = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = usuario;

        next();
    } catch (error) {
        return res.redirect('/');
    }
};

module.exports = {
    verificarToken,
    verificarVista,
    verificarRol,
    verificarRolVista
}
