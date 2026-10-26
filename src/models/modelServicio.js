const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR SERVICIOS POR SUCURSAL (con búsqueda opcional)
// ======================================================
const listarServiciosPorSucursal = async (idSucursal, busqueda = null) => {
    let sql = `
        SELECT
            s.id_servicio,
            s.nombre,
            s.precio_base,
            s.precio_regular,
            s.descripcion,
            s.estado,
            s.fecha_modificacion
        FROM SERVICIOS s
        INNER JOIN sucursal_servicio ss ON ss.id_servicio = s.id_servicio
        WHERE ss.id_sucursal = ? AND s.estado = 'ACTIVO'
    `;
    const params = [idSucursal];

    if (busqueda) {
        sql += ` AND (s.nombre LIKE ? OR s.descripcion LIKE ?)`;
        const q = `%${busqueda}%`;
        params.push(q, q);
    }

    sql += ` ORDER BY s.id_servicio ASC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR TODOS LOS SERVICIOS
// ======================================================
const listarServicios = async (busqueda = null) => {
    let sql = `
        SELECT
            s.id_servicio,
            s.nombre,
            s.precio_base,
            s.precio_regular,
            s.descripcion,
            s.estado,
            s.fecha_modificacion,
            GROUP_CONCAT(DISTINCT su.nombre SEPARATOR ', ') AS sucursales
        FROM SERVICIOS s
        LEFT JOIN sucursal_servicio ss ON ss.id_servicio = s.id_servicio
        LEFT JOIN SUCURSALES su        ON su.id_sucursal = ss.id_sucursal
    `;
    const params = [];

    if (busqueda) {
        sql += ` WHERE (s.nombre LIKE ? OR s.descripcion LIKE ?)`;
        const q = `%${busqueda}%`;
        params.push(q, q);
    }

    sql += ` GROUP BY s.id_servicio ORDER BY s.id_servicio ASC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR SERVICIO POR ID
// ======================================================
const buscarServicioPorId = async (idServicio) => {
    const sql = `
        SELECT
            id_servicio,
            nombre,
            precio_base,
            precio_regular,
            descripcion,
            estado,
            fecha_modificacion
        FROM SERVICIOS
        WHERE id_servicio = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idServicio]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR SERVICIO (+ sucursales iniciales si se pasan)
// ======================================================
const registrarServicio = async (datos, idSucursales = []) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        const sql = `
            INSERT INTO SERVICIOS
            (nombre, precio_base, precio_regular, descripcion, estado)
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await conn.query(sql, [
            datos.nombre,
            datos.precio_base,
            datos.precio_regular,
            datos.descripcion || null,
            datos.estado || 'ACTIVO'
        ]);

        const idServicio = result.insertId;

        if (Array.isArray(idSucursales) && idSucursales.length > 0) {
            const values = idSucursales.map(idSucursal => [idServicio, idSucursal]);
            await conn.query(
                `INSERT INTO sucursal_servicio (id_servicio, id_sucursal) VALUES ?`,
                [values]
            );
        }

        await conn.commit();
        return { id_servicio: idServicio };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR SERVICIO
// ======================================================
const actualizarServicio = async (idServicio, datos) => {
    const sql = `
        UPDATE SERVICIOS SET
            nombre             = ?,
            precio_base        = ?,
            precio_regular     = ?,
            descripcion        = ?,
            estado             = ?,
            fecha_modificacion = CURDATE()
        WHERE id_servicio = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.nombre,
            datos.precio_base,
            datos.precio_regular,
            datos.descripcion || null,
            datos.estado || 'ACTIVO',
            idServicio
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// ======================================================
const cambiarEstadoServicio = async (idServicio, estado) => {
    const sql = `
        UPDATE SERVICIOS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_servicio = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idServicio]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR SERVICIO (físico — fallará si está en detalles/OT)
// ======================================================
const eliminarServicio = async (idServicio) => {
    const sql = `DELETE FROM SERVICIOS WHERE id_servicio = ?`;

    try {
        const [result] = await poolDB.query(sql, [idServicio]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// SUCURSALES DEL SERVICIO (sucursal_servicio)
// ======================================================
const listarSucursalesDeServicio = async (idServicio) => {
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
            ss.id_sucursal_servicio,
            ss.fecha_modificacion
        FROM sucursal_servicio ss
        INNER JOIN SUCURSALES s ON s.id_sucursal = ss.id_sucursal
        WHERE ss.id_servicio = ?
        ORDER BY s.id_sucursal ASC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idServicio]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ASIGNAR SUCURSALES A UN SERVICIO (reemplaza las existentes)
// ======================================================
const asignarSucursalesAServicio = async (idServicio, idSucursales) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        await conn.query(
            `DELETE FROM sucursal_servicio WHERE id_servicio = ?`,
            [idServicio]
        );

        if (Array.isArray(idSucursales) && idSucursales.length > 0) {
            const values = idSucursales.map(idSucursal => [idServicio, idSucursal]);
            await conn.query(
                `INSERT INTO sucursal_servicio (id_servicio, id_sucursal) VALUES ?`,
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
// QUITAR UNA SUCURSAL A UN SERVICIO
// ======================================================
const quitarSucursalAServicio = async (idServicio, idSucursal) => {
    const sql = `
        DELETE FROM sucursal_servicio
        WHERE id_servicio = ? AND id_sucursal = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [idServicio, idSucursal]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    // Servicios
    listarServicios,
    listarServiciosPorSucursal,
    buscarServicioPorId,
    registrarServicio,
    actualizarServicio,
    cambiarEstadoServicio,
    eliminarServicio,

    // Sucursales
    listarSucursalesDeServicio,
    asignarSucursalesAServicio,
    quitarSucursalAServicio
};