const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR CATEGORÍAS (con búsqueda opcional)
// ======================================================
const listarCategorias = async (busqueda = null) => {
    let sql = `
        SELECT
            id_categoria,
            nombre,
            descripcion,
            estado,
            fecha_modificacion
        FROM CATEGORIAS
    `;
    const params = [];

    if (busqueda) {
        sql += ` WHERE (nombre LIKE ? OR descripcion LIKE ?)`;
        const q = `%${busqueda}%`;
        params.push(q, q);
    }

    sql += ` ORDER BY id_categoria ASC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR CATEGORÍA POR ID
// ======================================================
const buscarCategoriaPorId = async (idCategoria) => {
    const sql = `SELECT * FROM CATEGORIAS WHERE id_categoria = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [idCategoria]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR CATEGORÍA
// ======================================================
const registrarCategoria = async (datos) => {
    const sql = `
        INSERT INTO CATEGORIAS (nombre, descripcion, estado)
        VALUES (?, ?, ?)
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.nombre,
            datos.descripcion || null,
            datos.estado || 'ACTIVO'
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR CATEGORÍA
// ======================================================
const actualizarCategoria = async (idCategoria, datos) => {
    const sql = `
        UPDATE CATEGORIAS SET
            nombre      = ?,
            descripcion = ?,
            estado      = ?,
            fecha_modificacion = CURDATE()
        WHERE id_categoria = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.nombre,
            datos.descripcion || null,
            datos.estado || 'ACTIVO',
            idCategoria
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// ======================================================
const cambiarEstadoCategoria = async (idCategoria, estado) => {
    const sql = `
        UPDATE CATEGORIAS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_categoria = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idCategoria]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR CATEGORÍA (físico — fallará si tiene productos)
// ======================================================
const eliminarCategoria = async (idCategoria) => {
    const sql = `DELETE FROM CATEGORIAS WHERE id_categoria = ?`;

    try {
        const [result] = await poolDB.query(sql, [idCategoria]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarCategorias,
    buscarCategoriaPorId,
    registrarCategoria,
    actualizarCategoria,
    cambiarEstadoCategoria,
    eliminarCategoria
};