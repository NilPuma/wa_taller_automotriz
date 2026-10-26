const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR PRODUCTOS POR SUCURSAL (con stock)
// ======================================================
const listarProductosPorSucursal = async (idSucursal, busqueda = null) => {
    let sql = `
        SELECT
            p.id_producto,
            p.id_categoria,
            p.codigo,
            p.nombre,
            p.marca,
            p.descripcion,
            p.precio_compra,
            p.precio_venta,
            p.precio_minimo,
            p.estado,
            p.fecha_modificacion,
            c.nombre AS categoria_nombre,
            COALESCE(si.stock, 0) AS stock
        FROM PRODUCTOS p
        INNER JOIN CATEGORIAS c ON c.id_categoria = p.id_categoria
        LEFT JOIN sucursal_inventario si
               ON si.id_producto = p.id_producto
              AND si.id_sucursal = ?
    `;
    const params = [idSucursal];

    if (busqueda) {
        sql += ` WHERE (
            p.codigo LIKE ? OR
            p.nombre LIKE ? OR
            p.marca LIKE ? OR
            c.nombre LIKE ?
        )`;
        const q = `%${busqueda}%`;
        params.push(q, q, q, q);
    }

    sql += ` ORDER BY p.id_producto DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR TODOS LOS PRODUCTOS (sin stock de sucursal)
// ======================================================
const listarProductos = async (busqueda = null) => {
    let sql = `
        SELECT
            p.id_producto,
            p.id_categoria,
            p.codigo,
            p.nombre,
            p.marca,
            p.descripcion,
            p.precio_compra,
            p.precio_venta,
            p.precio_minimo,
            p.estado,
            p.fecha_modificacion,
            c.nombre AS categoria_nombre
        FROM PRODUCTOS p
        INNER JOIN CATEGORIAS c ON c.id_categoria = p.id_categoria
    `;
    const params = [];

    if (busqueda) {
        sql += ` WHERE (
            p.codigo LIKE ? OR
            p.nombre LIKE ? OR
            p.marca LIKE ? OR
            c.nombre LIKE ?
        )`;
        const q = `%${busqueda}%`;
        params.push(q, q, q, q);
    }

    sql += ` ORDER BY p.id_producto DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR PRODUCTO POR ID (con stock por sucursal si se pasa)
// ======================================================
const buscarProductoPorId = async (idProducto, idSucursal = null) => {
    let sql = `
        SELECT
            p.id_producto,
            p.id_categoria,
            p.codigo,
            p.nombre,
            p.marca,
            p.descripcion,
            p.precio_compra,
            p.precio_venta,
            p.precio_minimo,
            p.estado,
            p.fecha_modificacion,
            c.nombre AS categoria_nombre
    `;
    const params = [idProducto];

    if (idSucursal) {
        sql += `,
            COALESCE(si.stock, 0) AS stock
        FROM PRODUCTOS p
        INNER JOIN CATEGORIAS c ON c.id_categoria = p.id_categoria
        LEFT JOIN sucursal_inventario si
               ON si.id_producto = p.id_producto
              AND si.id_sucursal = ?
        `;
        params.unshift(idSucursal); // el ? de sucursal va primero en el SELECT
    } else {
        sql += `
        FROM PRODUCTOS p
        INNER JOIN CATEGORIAS c ON c.id_categoria = p.id_categoria
        `;
    }

    sql += ` WHERE p.id_producto = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR PRODUCTO POR CÓDIGO
// ======================================================
const buscarProductoPorCodigo = async (codigo) => {
    const sql = `SELECT * FROM PRODUCTOS WHERE codigo = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [codigo]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// STOCK DE UN PRODUCTO EN UNA SUCURSAL
// ======================================================
const obtenerStock = async (idSucursal, idProducto) => {
    const sql = `
        SELECT stock
        FROM sucursal_inventario
        WHERE id_sucursal = ? AND id_producto = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idSucursal, idProducto]);
        return rows.length > 0 ? rows[0].stock : 0;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR PRODUCTO (+ stock inicial en sucursal si se pasa)
// ======================================================
const registrarProducto = async (datos, idSucursal = null, stockInicial = 0) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        const sql = `
            INSERT INTO PRODUCTOS
            (id_categoria, codigo, nombre, marca, descripcion,
             precio_compra, precio_venta, precio_minimo, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await conn.query(sql, [
            datos.id_categoria,
            datos.codigo,
            datos.nombre,
            datos.marca || null,
            datos.descripcion || null,
            datos.precio_compra,
            datos.precio_venta,
            datos.precio_minimo,
            datos.estado || 'ACTIVO'
        ]);

        const idProducto = result.insertId;

        if (idSucursal) {
            await conn.query(
                `INSERT INTO sucursal_inventario (id_sucursal, id_producto, stock)
                 VALUES (?, ?, ?)`,
                [idSucursal, idProducto, stockInicial]
            );
        }

        await conn.commit();
        return { id_producto: idProducto };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR PRODUCTO
// ======================================================
const actualizarProducto = async (idProducto, datos) => {
    const sql = `
        UPDATE PRODUCTOS SET
            id_categoria       = ?,
            codigo             = ?,
            nombre             = ?,
            marca              = ?,
            descripcion        = ?,
            precio_compra      = ?,
            precio_venta       = ?,
            precio_minimo      = ?,
            estado             = ?,
            fecha_modificacion = CURDATE()
        WHERE id_producto = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_categoria,
            datos.codigo,
            datos.nombre,
            datos.marca || null,
            datos.descripcion || null,
            datos.precio_compra,
            datos.precio_venta,
            datos.precio_minimo,
            datos.estado || 'ACTIVO',
            idProducto
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// ======================================================
const cambiarEstadoProducto = async (idProducto, estado) => {
    const sql = `
        UPDATE PRODUCTOS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_producto = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idProducto]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR PRODUCTO (físico — fallará si está en detalles/OT/ventas)
// ======================================================
const eliminarProducto = async (idProducto) => {
    const sql = `DELETE FROM PRODUCTOS WHERE id_producto = ?`;

    try {
        const [result] = await poolDB.query(sql, [idProducto]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// DESCONTAR STOCK (atómico, falla si no alcanza)
// ======================================================
const descontarStock = async (idSucursal, idProducto, cantidad) => {
    const sql = `
        UPDATE sucursal_inventario
        SET stock = stock - ?
        WHERE id_sucursal = ? AND id_producto = ? AND stock >= ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            cantidad, idSucursal, idProducto, cantidad
        ]);
        if (result.affectedRows === 0) {
            throw new Error(
                `Stock insuficiente para producto ${idProducto} en sucursal ${idSucursal}`
            );
        }
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// AUMENTAR STOCK (reposición / devolución)
// ======================================================
const aumentarStock = async (idSucursal, idProducto, cantidad) => {
    const sql = `
        UPDATE sucursal_inventario
        SET stock = stock + ?
        WHERE id_sucursal = ? AND id_producto = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            cantidad, idSucursal, idProducto
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR STOCK ABSOLUTO (fija el valor, no suma/resta)
// ======================================================
const actualizarStock = async (idSucursal, idProducto, stock) => {
    const sql = `
        INSERT INTO sucursal_inventario (id_sucursal, id_producto, stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE stock = VALUES(stock)
    `;

    try {
        const [result] = await poolDB.query(sql, [idSucursal, idProducto, stock]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    // Consultas
    listarProductos,
    listarProductosPorSucursal,
    buscarProductoPorId,
    buscarProductoPorCodigo,
    obtenerStock,

    // CRUD
    registrarProducto,
    actualizarProducto,
    cambiarEstadoProducto,
    eliminarProducto,

    // Stock
    descontarStock,
    aumentarStock,
    actualizarStock
};