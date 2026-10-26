const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR USUARIOS (con búsqueda opcional por usuario/nombre/documento)
// ======================================================
const listarUsuarios = async (busqueda = null) => {
    let sql = `
        SELECT
            u.id_usuario,
            u.id_persona,
            u.id_rol,
            u.usuario,
            u.foto_url,
            u.estado,
            u.ultimo_acceso,
            u.fecha_modificacion,
            p.tipo_documento,
            p.documento,
            p.nombres,
            p.apellidos,
            p.correo,
            p.telefono,
            r.nombre AS rol_nombre
        FROM USUARIOS u
        INNER JOIN PERSONAS p ON p.id_persona = u.id_persona
        INNER JOIN ROLES r    ON r.id_rol     = u.id_rol
    `;
    const params = [];

    if (busqueda) {
        sql += ` WHERE (
            u.usuario LIKE ? OR
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            p.documento LIKE ? OR
            p.correo LIKE ?
        )`;
        const q = `%${busqueda}%`;
        params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY u.id_usuario DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR USUARIOS POR ROL
// ======================================================
const listarUsuariosPorRol = async (idRol) => {
    const sql = `
        SELECT
            u.id_usuario,
            u.id_persona,
            u.id_rol,
            u.usuario,
            u.foto_url,
            u.estado,
            u.ultimo_acceso,
            p.nombres,
            p.apellidos,
            p.documento,
            p.correo
        FROM USUARIOS u
        INNER JOIN PERSONAS p ON p.id_persona = u.id_persona
        WHERE u.id_rol = ?
        ORDER BY u.id_usuario DESC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idRol]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR USUARIO POR ID
// ======================================================
const buscarUsuarioPorId = async (idUsuario) => {
    const sql = `
        SELECT
            u.id_usuario,
            u.id_persona,
            u.id_rol,
            u.usuario,
            u.foto_url,
            u.estado,
            u.ultimo_acceso,
            u.fecha_modificacion,
            p.tipo_persona,
            p.tipo_documento,
            p.documento,
            p.nombres,
            p.apellidos,
            p.correo,
            p.direccion,
            p.telefono,
            r.nombre AS rol_nombre
        FROM USUARIOS u
        INNER JOIN PERSONAS p ON p.id_persona = u.id_persona
        INNER JOIN ROLES r    ON r.id_rol     = u.id_rol
        WHERE u.id_usuario = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idUsuario]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR USUARIO POR NOMBRE DE USUARIO (sin password)
// ======================================================
const buscarUsuarioPorNombre = async (usuario) => {
    const sql = `
        SELECT
            u.id_usuario,
            u.id_persona,
            u.id_rol,
            u.usuario,
            u.foto_url,
            u.estado,
            u.ultimo_acceso,
            p.nombres,
            p.apellidos,
            p.documento,
            p.correo,
            r.nombre AS rol_nombre
        FROM USUARIOS u
        INNER JOIN PERSONAS p ON p.id_persona = u.id_persona
        INNER JOIN ROLES r    ON r.id_rol     = u.id_rol
        WHERE u.usuario = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [usuario]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR USUARIO POR PERSONA (1 persona = 1 usuario)
// ======================================================
const buscarUsuarioPorPersona = async (idPersona) => {
    const sql = `SELECT * FROM USUARIOS WHERE id_persona = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [idPersona]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR USUARIO (el password ya viene hasheado desde modelAuth)
// ======================================================
const registrarUsuario = async (datos) => {
    const sql = `
        INSERT INTO USUARIOS
        (id_persona, id_rol, usuario, password, foto_url, estado, ultimo_acceso)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_persona,
            datos.id_rol,
            datos.usuario,
            datos.password,
            datos.foto_url || null,
            datos.estado || 'ACTIVO',
            datos.ultimo_acceso || null
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR USUARIO (sin tocar password)
// ======================================================
const actualizarUsuario = async (idUsuario, datos) => {
    const sql = `
        UPDATE USUARIOS SET
            id_rol      = ?,
            usuario     = ?,
            foto_url    = ?,
            estado      = ?,
            fecha_modificacion = CURDATE()
        WHERE id_usuario = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_rol,
            datos.usuario,
            datos.foto_url || null,
            datos.estado || 'ACTIVO',
            idUsuario
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// ======================================================
const cambiarEstadoUsuario = async (idUsuario, estado) => {
    const sql = `
        UPDATE USUARIOS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_usuario = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idUsuario]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR USUARIO (físico)
// ======================================================
const eliminarUsuario = async (idUsuario) => {
    const sql = `DELETE FROM USUARIOS WHERE id_usuario = ?`;

    try {
        const [result] = await poolDB.query(sql, [idUsuario]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ROLES
// ======================================================
const listarRoles = async () => {
    const sql = `
        SELECT id_rol, nombre, descripcion, estado, fecha_modificacion
        FROM ROLES
        WHERE estado = 'ACTIVO'
        ORDER BY id_rol ASC
    `;

    try {
        const [rows] = await poolDB.query(sql);
        return rows;
    } catch (error) {
        throw error;
    }
};

const buscarRolPorId = async (idRol) => {
    const sql = `SELECT * FROM ROLES WHERE id_rol = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [idRol]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// SUCURSALES DEL USUARIO (usuarios_sucursales)
// ======================================================
const listarSucursalesDeUsuario = async (idUsuario) => {
    const sql = `
        SELECT
            s.id_sucursal,
            s.nombre,
            s.direccion,
            s.telefono,
            s.ruc,
            s.igv,
            s.hora_apertura,
            s.hora_cierre,
            us.id_usuario_sucursal
        FROM usuarios_sucursales us
        INNER JOIN SUCURSALES s ON s.id_sucursal = us.id_sucursal
        WHERE us.id_usuario = ?
        ORDER BY s.id_sucursal ASC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idUsuario]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ASIGNAR SUCURSALES A UN USUARIO (reemplaza las existentes)
// ======================================================
const asignarSucursalesAUsuario = async (idUsuario, idSucursales) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        await conn.query(
            `DELETE FROM usuarios_sucursales WHERE id_usuario = ?`,
            [idUsuario]
        );

        if (Array.isArray(idSucursales) && idSucursales.length > 0) {
            const values = idSucursales.map(idSucursal => [idUsuario, idSucursal]);
            await conn.query(
                `INSERT INTO usuarios_sucursales (id_usuario, id_sucursal) VALUES ?`,
                [values]
            );
        }

        await conn.commit();
        return { ok: true, total: idSucursales.length };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// QUITAR UNA SUCURSAL A UN USUARIO
// ======================================================
const quitarSucursalAUsuario = async (idUsuario, idSucursal) => {
    const sql = `
        DELETE FROM usuarios_sucursales
        WHERE id_usuario = ? AND id_sucursal = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [idUsuario, idSucursal]);
        return result;
    } catch (error) {
        throw error;
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
    buscarUsuarioPorPersona,
    registrarUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario,

    // Roles
    listarRoles,
    buscarRolPorId,

    // Sucursales
    listarSucursalesDeUsuario,
    asignarSucursalesAUsuario,
    quitarSucursalAUsuario
};