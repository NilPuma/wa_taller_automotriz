const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR MECÁNICOS (con búsqueda opcional y filtro por sucursal)
// ======================================================
const listarMecanicos = async (busqueda = null, idSucursal = null) => {
    let sql = `
        SELECT
            m.id_mecanico,
            m.id_persona,
            m.especialidad,
            m.horario,
            m.estado,
            m.fecha_modificacion,
            p.tipo_documento,
            p.documento,
            p.nombres,
            p.apellidos,
            p.correo,
            p.telefono,
            GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') AS sucursales
        FROM MECANICOS m
        INNER JOIN PERSONAS p ON p.id_persona = m.id_persona
        LEFT JOIN sucursal_mecanico sm ON sm.id_mecanico = m.id_mecanico
        LEFT JOIN SUCURSALES s         ON s.id_sucursal  = sm.id_sucursal
    `;
    const params = [];

    if (idSucursal) {
        sql += ` WHERE m.id_mecanico IN (
            SELECT id_mecanico FROM sucursal_mecanico WHERE id_sucursal = ?
        )`;
        params.push(idSucursal);
    }

    if (busqueda) {
        sql += idSucursal ? ` AND ` : ` WHERE `;
        sql += `(
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            p.documento LIKE ? OR
            m.especialidad LIKE ?
        )`;
        const q = `%${busqueda}%`;
        params.push(q, q, q, q);
    }

    sql += ` GROUP BY m.id_mecanico ORDER BY m.id_mecanico DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR MECÁNICOS POR SUCURSAL
// ======================================================
const listarMecanicosPorSucursal = async (idSucursal) => {
    const sql = `
        SELECT
            m.id_mecanico,
            m.id_persona,
            m.especialidad,
            m.horario,
            m.estado,
            p.nombres,
            p.apellidos,
            p.documento,
            p.telefono,
            p.correo
        FROM MECANICOS m
        INNER JOIN PERSONAS p       ON p.id_persona  = m.id_persona
        INNER JOIN sucursal_mecanico sm ON sm.id_mecanico = m.id_mecanico
        WHERE sm.id_sucursal = ? AND m.estado = 'ACTIVO'
        ORDER BY p.nombres ASC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idSucursal]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR MECÁNICO POR ID
// ======================================================
const buscarMecanicoPorId = async (idMecanico) => {
    const sql = `
        SELECT
            m.id_mecanico,
            m.id_persona,
            m.especialidad,
            m.horario,
            m.estado,
            m.fecha_modificacion,
            p.tipo_documento,
            p.documento,
            p.nombres,
            p.apellidos,
            p.correo,
            p.telefono,
            p.direccion
        FROM MECANICOS m
        INNER JOIN PERSONAS p ON p.id_persona = m.id_persona
        WHERE m.id_mecanico = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idMecanico]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR MECÁNICO POR PERSONA (1 persona = 1 mecánico)
// ======================================================
const buscarMecanicoPorPersona = async (idPersona) => {
    const sql = `SELECT * FROM MECANICOS WHERE id_persona = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [idPersona]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR MECÁNICO
// ======================================================
const registrarMecanico = async (datos) => {
    const sql = `
        INSERT INTO MECANICOS
        (id_persona, especialidad, horario, estado)
        VALUES (?, ?, ?, ?)
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_persona,
            datos.especialidad || null,
            datos.horario || null,
            datos.estado || 'ACTIVO'
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR MECÁNICO
// ======================================================
const actualizarMecanico = async (idMecanico, datos) => {
    const sql = `
        UPDATE MECANICOS SET
            especialidad = ?,
            horario      = ?,
            estado       = ?,
            fecha_modificacion = CURDATE()
        WHERE id_mecanico = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.especialidad || null,
            datos.horario || null,
            datos.estado || 'ACTIVO',
            idMecanico
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// ======================================================
const cambiarEstadoMecanico = async (idMecanico, estado) => {
    const sql = `
        UPDATE MECANICOS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_mecanico = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idMecanico]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR MECÁNICO (físico — fallará si tiene OT asignadas)
// ======================================================
const eliminarMecanico = async (idMecanico) => {
    const sql = `DELETE FROM MECANICOS WHERE id_mecanico = ?`;

    try {
        const [result] = await poolDB.query(sql, [idMecanico]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// SUCURSALES DEL MECÁNICO (sucursal_mecanico)
// ======================================================
const listarSucursalesDeMecanico = async (idMecanico) => {
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
            sm.id_sucursal_mecanico,
            sm.fecha_modificacion
        FROM sucursal_mecanico sm
        INNER JOIN SUCURSALES s ON s.id_sucursal = sm.id_sucursal
        WHERE sm.id_mecanico = ?
        ORDER BY s.id_sucursal ASC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idMecanico]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ASIGNAR SUCURSALES A UN MECÁNICO (reemplaza las existentes)
// ======================================================
const asignarSucursalesAMecanico = async (idMecanico, idSucursales) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        await conn.query(
            `DELETE FROM sucursal_mecanico WHERE id_mecanico = ?`,
            [idMecanico]
        );

        if (Array.isArray(idSucursales) && idSucursales.length > 0) {
            const values = idSucursales.map(idSucursal => [idMecanico, idSucursal]);
            await conn.query(
                `INSERT INTO sucursal_mecanico (id_mecanico, id_sucursal) VALUES ?`,
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
// QUITAR UNA SUCURSAL A UN MECÁNICO
// ======================================================
const quitarSucursalAMecanico = async (idMecanico, idSucursal) => {
    const sql = `
        DELETE FROM sucursal_mecanico
        WHERE id_mecanico = ? AND id_sucursal = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [idMecanico, idSucursal]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    // Mecánicos
    listarMecanicos,
    listarMecanicosPorSucursal,
    buscarMecanicoPorId,
    buscarMecanicoPorPersona,
    registrarMecanico,
    actualizarMecanico,
    cambiarEstadoMecanico,
    eliminarMecanico,

    // Sucursales
    listarSucursalesDeMecanico,
    asignarSucursalesAMecanico,
    quitarSucursalAMecanico
};