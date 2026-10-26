const model = require('../models/modelUsuario');
const modelPersonas = require('../models/modelPersona');

// ======================================================
// LISTAR USUARIOS (con búsqueda opcional)
// GET /api/usuarios?busqueda=texto
// ======================================================
const listarUsuarios = async (req, res) => {
    try {
        const { busqueda } = req.query;

        const usuarios = await model.listarUsuarios(busqueda || null);

        return res.json({ ok: true, usuarios });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar usuarios'
        });
    }
};

// ======================================================
// LISTAR USUARIOS POR ROL
// GET /api/usuarios/rol/:idRol
// ======================================================
const listarUsuariosPorRol = async (req, res) => {
    try {
        const { idRol } = req.params;

        if (!idRol) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de rol requerido'
            });
        }

        const usuarios = await model.listarUsuariosPorRol(idRol);

        return res.json({ ok: true, usuarios });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar usuarios por rol'
        });
    }
};

// ======================================================
// BUSCAR USUARIO POR ID
// GET /api/usuarios/:id
// ======================================================
const buscarUsuarioPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de usuario requerido'
            });
        }

        const usuario = await model.buscarUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El usuario no existe'
            });
        }

        return res.json({ ok: true, usuario });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar usuario'
        });
    }
};

// ======================================================
// BUSCAR USUARIO POR NOMBRE DE USUARIO (sin password)
// GET /api/usuarios/usuario/:usuario
// ======================================================
const buscarUsuarioPorNombre = async (req, res) => {
    try {
        const { usuario } = req.params;

        if (!usuario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Nombre de usuario requerido'
            });
        }

        const data = await model.buscarUsuarioPorNombre(usuario);

        if (!data) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El usuario no existe'
            });
        }

        return res.json({ ok: true, usuario: data });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar usuario'
        });
    }
};

// ======================================================
// REGISTRAR USUARIO
// POST /api/usuarios
// body: { id_persona, id_rol, usuario, password, foto_url, id_sucursales: [] }
// NOTA: el password debe venir YA HASHEADO desde controllerAuth
// ======================================================
const registrarUsuario = async (req, res) => {
    try {
        const {
            id_persona,
            id_rol,
            usuario,
            password,
            foto_url,
            id_sucursales = []
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona || !id_rol || !usuario || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona, rol, usuario y contraseña son obligatorios'
            });
        }

        // Verificar que la persona exista
        const persona = await modelPersonas.buscarPersonaPorId(id_persona);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona asociada no existe'
            });
        }

        // Verificar que la persona no tenga ya un usuario
        const existePersona = await model.buscarUsuarioPorPersona(id_persona);

        if (existePersona) {
            return res.status(409).json({
                ok: false,
                mensaje: 'La persona ya tiene un usuario registrado'
            });
        }

        // Verificar que el nombre de usuario no exista
        const existeUsuario = await model.buscarUsuarioPorNombre(usuario);

        if (existeUsuario) {
            return res.status(409).json({
                ok: false,
                mensaje: 'El nombre de usuario ya está registrado'
            });
        }

        // Verificar que el rol exista
        const rol = await model.buscarRolPorId(id_rol);

        if (!rol) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El rol seleccionado no existe'
            });
        }

        const resultado = await model.registrarUsuario({
            id_persona,
            id_rol,
            usuario,
            password,               // ya hasheado desde controllerAuth
            foto_url: foto_url || null,
            estado: 'ACTIVO',
            ultimo_acceso: null
        });

        const idUsuario = resultado.insertId;

        // Asignar sucursales si se enviaron
        if (Array.isArray(id_sucursales) && id_sucursales.length > 0) {
            await model.asignarSucursalesAUsuario(idUsuario, id_sucursales);
        }

        return res.status(201).json({
            ok: true,
            mensaje: 'Usuario registrado correctamente',
            id_usuario: idUsuario
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar usuario'
        });
    }
};

// ======================================================
// ACTUALIZAR USUARIO (sin tocar password)
// PUT /api/usuarios/:id
// body: { id_rol, usuario, foto_url, estado, id_sucursales: [] }
// ======================================================
const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_rol,
            usuario,
            foto_url,
            estado,
            id_sucursales
        } = req.body;

        // Verificar existencia
        const usuarioActual = await model.buscarUsuarioPorId(id);

        if (!usuarioActual) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        // Validaciones obligatorias
        if (!id_rol || !usuario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Rol y nombre de usuario son obligatorios'
            });
        }

        // Verificar que el nombre de usuario no choque con otro
        const existeUsuario = await model.buscarUsuarioPorNombre(usuario);

        if (existeUsuario && existeUsuario.id_usuario != id) {
            return res.status(409).json({
                ok: false,
                mensaje: 'El nombre de usuario ya está registrado en otro usuario'
            });
        }

        // Verificar que el rol exista
        const rol = await model.buscarRolPorId(id_rol);

        if (!rol) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El rol seleccionado no existe'
            });
        }

        await model.actualizarUsuario(id, {
            id_rol,
            usuario,
            foto_url: foto_url || null,
            estado: estado || usuarioActual.estado
        });

        // Reemplazar sucursales si se enviaron
        if (Array.isArray(id_sucursales)) {
            await model.asignarSucursalesAUsuario(id, id_sucursales);
        }

        return res.json({
            ok: true,
            mensaje: 'Usuario actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar usuario'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// PATCH /api/usuarios/:id/estado
// body: { estado: 'ACTIVO' | 'INACTIVO' }
// ======================================================
const cambiarEstadoUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const usuario = await model.buscarUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        await model.cambiarEstadoUsuario(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado del usuario'
        });
    }
};

// ======================================================
// ELIMINAR USUARIO (físico)
// DELETE /api/usuarios/:id
// ======================================================
const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await model.buscarUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        await model.eliminarUsuario(id);

        return res.json({
            ok: true,
            mensaje: 'Usuario eliminado correctamente'
        });

    } catch (error) {
        console.error(error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: el usuario tiene registros asociados. Use cambiar estado a INACTIVO.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar usuario'
        });
    }
};

// ======================================================
// LISTAR ROLES (para poblar <select>)
// GET /api/usuarios/roles
// ======================================================
const listarRoles = async (req, res) => {
    try {
        const roles = await model.listarRoles();

        return res.json({ ok: true, roles });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar roles'
        });
    }
};

// ======================================================
// LISTAR SUCURSALES DE UN USUARIO
// GET /api/usuarios/:id/sucursales
// ======================================================
const listarSucursalesDeUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de usuario requerido'
            });
        }

        const usuario = await model.buscarUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        const sucursales = await model.listarSucursalesDeUsuario(id);

        return res.json({ ok: true, sucursales });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar sucursales del usuario'
        });
    }
};

// ======================================================
// ASIGNAR SUCURSALES A UN USUARIO (reemplaza las existentes)
// PUT /api/usuarios/:id/sucursales
// body: { id_sucursales: [1, 2] }
// ======================================================
const asignarSucursalesAUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursales } = req.body;

        if (!Array.isArray(id_sucursales)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe enviar un arreglo de sucursales'
            });
        }

        const usuario = await model.buscarUsuarioPorId(id);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        await model.asignarSucursalesAUsuario(id, id_sucursales);

        return res.json({
            ok: true,
            mensaje: 'Sucursales asignadas correctamente',
            total: id_sucursales.length
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al asignar sucursales'
        });
    }
};

// ======================================================
// QUITAR UNA SUCURSAL A UN USUARIO
// DELETE /api/usuarios/:id/sucursales/:idSucursal
// ======================================================
const quitarSucursalAUsuario = async (req, res) => {
    try {
        const { id, idSucursal } = req.params;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        await model.quitarSucursalAUsuario(id, idSucursal);

        return res.json({
            ok: true,
            mensaje: 'Sucursal removida correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al quitar sucursal'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    // Usuarios
    listarUsuarios,
    listarUsuariosPorRol,
    buscarUsuarioPorId,
    buscarUsuarioPorNombre,
    registrarUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario,

    // Roles
    listarRoles,

    // Sucursales
    listarSucursalesDeUsuario,
    asignarSucursalesAUsuario,
    quitarSucursalAUsuario
};