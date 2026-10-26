const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR PERSONAS (con filtro opcional de búsqueda)
// ======================================================
const listarPersonas = async (busqueda = null) => {
    let sql = `
        SELECT
            id_persona,
            tipo_persona,
            tipo_documento,
            documento,
            nombres,
            apellidos,
            correo,
            direccion,
            telefono,
            estado,
            fecha_modificacion
        FROM PERSONAS
    `;
    const params = [];

    if (busqueda) {
        sql += ` WHERE (
            nombres LIKE ? OR
            apellidos LIKE ? OR
            documento LIKE ? OR
            correo LIKE ?
        )`;
        const q = `%${busqueda}%`;
        params.push(q, q, q, q);
    }

    sql += ` ORDER BY id_persona DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR PERSONAS POR ROL (útil para filtrar clientes/mecánicos)
// ======================================================
const listarPersonasPorRol = async (idRol) => {
    const sql = `
        SELECT
            p.id_persona,
            p.tipo_persona,
            p.tipo_documento,
            p.documento,
            p.nombres,
            p.apellidos,
            p.correo,
            p.direccion,
            p.telefono,
            p.estado
        FROM PERSONAS p
        INNER JOIN USUARIOS u ON u.id_persona = p.id_persona
        WHERE u.id_rol = ?
        ORDER BY p.id_persona DESC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idRol]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR PERSONA POR ID
// ======================================================
const buscarPersonaPorId = async (idPersona) => {
    const sql = `SELECT * FROM PERSONAS WHERE id_persona = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [idPersona]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR PERSONA POR DOCUMENTO (DNI/RUC)
// ======================================================
const buscarPersonaPorDocumento = async (tipoDocumento, documento) => {
    const sql = `
        SELECT * FROM PERSONAS
        WHERE tipo_documento = ? AND documento = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [tipoDocumento, documento]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR PERSONA
// ======================================================
const registrarPersona = async (datos) => {
    const sql = `
        INSERT INTO PERSONAS
        (tipo_persona, tipo_documento, documento, nombres, apellidos,
         correo, direccion, telefono, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.tipo_persona || 'NATURAL',
            datos.tipo_documento,
            datos.documento,
            datos.nombres,
            datos.apellidos || null,
            datos.correo || null,
            datos.direccion || null,
            datos.telefono || null,
            datos.estado || 'ACTIVO'
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR PERSONA
// ======================================================
const actualizarPersona = async (idPersona, datos) => {
    const sql = `
        UPDATE PERSONAS SET
            tipo_persona   = ?,
            tipo_documento = ?,
            documento      = ?,
            nombres        = ?,
            apellidos      = ?,
            correo         = ?,
            direccion      = ?,
            telefono       = ?,
            estado         = ?,
            fecha_modificacion = CURDATE()
        WHERE id_persona = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.tipo_persona,
            datos.tipo_documento,
            datos.documento,
            datos.nombres,
            datos.apellidos || null,
            datos.correo || null,
            datos.direccion || null,
            datos.telefono || null,
            datos.estado || 'ACTIVO',
            idPersona
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// ======================================================
const cambiarEstadoPersona = async (idPersona, estado) => {
    const sql = `
        UPDATE PERSONAS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_persona = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idPersona]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR PERSONA (físico — usar con cuidado por FKs)
// ======================================================
const eliminarPersona = async (idPersona) => {
    const sql = `DELETE FROM PERSONAS WHERE id_persona = ?`;

    try {
        const [result] = await poolDB.query(sql, [idPersona]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarPersonas,
    listarPersonasPorRol,
    buscarPersonaPorId,
    buscarPersonaPorDocumento,
    registrarPersona,
    actualizarPersona,
    cambiarEstadoPersona,
    eliminarPersona
};