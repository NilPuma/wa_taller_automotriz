const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const modelAuth = require('../models/modelAuth');
const modelUsuario = require('../models/modelUsuario');
const modelMecanico = require('../models/modelMecanico');

// ======================================================
// INICIAR SESIÓN (LOGIN)
// ======================================================
const login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        // 1. Validar que lleguen los datos
        if (!usuario || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ingrese usuario y contraseña'
            });
        }

        // 2. Buscar usuario en BD (buscando por el correo que ahora está en la columna 'usuario')
        const usuarioBD = await modelAuth.buscarUsuario(usuario);

        // 3. Usuario no existe
        if (!usuarioBD) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Usuario o contraseña incorrectos'
            });
        }

        // 4. Verificar estado del usuario (Tu DB guarda en MAYÚSCULAS: 'ACTIVO')
        if (usuarioBD.estado.toUpperCase() !== 'ACTIVO') {
            return res.status(403).json({
                ok: false,
                mensaje: 'El usuario se encuentra inactivo'
            });
        }

        // 5. Comparar contraseña
        const passwordCorrecta = await bcrypt.compare(password, usuarioBD.password);

        if (!passwordCorrecta) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Usuario o contraseña incorrectos'
            });
        }

        // 6. Crear JWT (Corregido: id_usuario en lugar de id)
        const token = jwt.sign(
            {
                id_usuario: usuarioBD.id_usuario,
                id_rol: usuarioBD.id_rol,
                usuario: usuarioBD.usuario
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '12h'
            }
        );

        // 7. Guardar JWT en cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Cambiar a true en producción (HTTPS)
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000 // 12 horas
        });

        // 8. Respuesta al frontend
        return res.json({
            ok: true,
            mensaje: 'Login correcto',
            usuario: {
                rol: usuarioBD.id_rol
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno del servidor'
        });
    }
};

// ======================================================
// CERRAR SESIÓN (LOGOUT)
// ======================================================
const logout = (req, res) => {
    res.clearCookie('token');
    return res.json({
        ok: true,
        mensaje: 'Sesión cerrada correctamente'
    });
};

// ======================================================
// OBTENER PERFIL (Para el frontend, ej. mecanico.js)
// ======================================================
const obtenerPerfil = async (req, res) => {
    try {
        // req.usuario viene inyectado por el middleware verificarToken
        const usuarioBD = await modelUsuario.buscarUsuarioPorId(req.usuario.id_usuario);
        
        if (!usuarioBD) {
            return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
        }

        let idMecanico = null;
        
        // Si el rol es 3 (MECANICO), buscamos su ID en la tabla MECANICOS
        if (usuarioBD.id_rol === 3) {
            const mecanico = await modelMecanico.buscarMecanicoPorPersona(usuarioBD.id_persona);
            if (mecanico) {
                idMecanico = mecanico.id_mecanico;
            }
        }

        return res.json({
            ok: true,
            usuario: {
                id_usuario: usuarioBD.id_usuario,
                id_rol: usuarioBD.id_rol,
                nombres: usuarioBD.nombres,
                id_mecanico: idMecanico
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener perfil'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    login,
    logout,
    obtenerPerfil
};