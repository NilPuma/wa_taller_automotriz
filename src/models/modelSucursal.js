const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR SUCURSALES
// ======================================================
const listarSucursales = async () => {
    const sql = `
        SELECT
            id_sucursal,
            nombre,
            direccion,
            telefono,
            ruc,
            igv,
            hora_apertura,
            hora_cierre,
            fecha_modificacion
        FROM SUCURSALES
        ORDER BY id_sucursal ASC
    `;

    try {
        const [rows] = await poolDB.query(sql);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR SUCURSAL POR ID
// ======================================================
const buscarSucursalPorId = async (idSucursal) => {
    const sql = `
        SELECT
            id_sucursal,
            nombre,
            direccion,
            telefono,
            ruc,
            igv,
            hora_apertura,
            hora_cierre,
            fecha_modificacion
        FROM SUCURSALES
        WHERE id_sucursal = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idSucursal]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarSucursales,
    buscarSucursalPorId
};