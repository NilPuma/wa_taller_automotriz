const poolDB = require('../config_db/config_mysql');
const { toISODate } = require('../utils/fechas');

// ======================================================
// LISTAR ÓRDENES DE VENTA (con filtros opcionales)
// ======================================================
const listarOrdenesVenta = async (filtros = {}) => {
    const { idSucursal = null, estado = null, idPersona = null, busqueda = null } = filtros;

    let sql = `
        SELECT
            ov.id_orden_venta,
            ov.id_persona,
            ov.id_sucursal,
            ov.observacion,
            ov.monto_orden_venta,
            ov.descuento,
            ov.fecha_atencion,
            ov.estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            s.nombre AS sucursal_nombre,
            (SELECT COUNT(*) FROM detalle_venta dv WHERE dv.id_orden_venta = ov.id_orden_venta) AS total_items
        FROM ORDENES_VENTA ov
        INNER JOIN PERSONAS p   ON p.id_persona  = ov.id_persona
        INNER JOIN SUCURSALES s ON s.id_sucursal = ov.id_sucursal
    `;
    const params = [];
    const condiciones = [];

    if (idSucursal) {
        condiciones.push('ov.id_sucursal = ?');
        params.push(idSucursal);
    }
    if (estado) {
        condiciones.push('ov.estado = ?');
        params.push(estado);
    }
    if (idPersona) {
        condiciones.push('ov.id_persona = ?');
        params.push(idPersona);
    }
    if (busqueda) {
        condiciones.push(`(
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            p.documento LIKE ? OR
            CAST(ov.id_orden_venta AS CHAR) LIKE ?
        )`);
        const q = `%${busqueda}%`;
        params.push(q, q, q, q);
    }

    if (condiciones.length > 0) {
        sql += ` WHERE ` + condiciones.join(' AND ');
    }

    sql += ` ORDER BY ov.id_orden_venta DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR ORDEN DE VENTA POR ID (cabecera)
// ======================================================
const buscarOrdenVentaPorId = async (idOrdenVenta) => {
    const sql = `
        SELECT
            ov.id_orden_venta,
            ov.id_persona,
            ov.id_sucursal,
            ov.observacion,
            ov.monto_orden_venta,
            ov.descuento,
            ov.fecha_atencion,
            ov.estado,
            p.tipo_documento,
            p.documento,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.correo AS cliente_correo,
            p.telefono AS cliente_telefono,
            p.direccion AS cliente_direccion,
            s.nombre AS sucursal_nombre,
            s.igv AS sucursal_igv
        FROM ORDENES_VENTA ov
        INNER JOIN PERSONAS p   ON p.id_persona  = ov.id_persona
        INNER JOIN SUCURSALES s ON s.id_sucursal = ov.id_sucursal
        WHERE ov.id_orden_venta = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idOrdenVenta]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR ORDEN DE VENTA CON DETALLE
// ======================================================
const buscarOrdenVentaConDetalle = async (idOrdenVenta) => {
    const sqlCabecera = `
        SELECT
            ov.id_orden_venta,
            ov.id_persona,
            ov.id_sucursal,
            ov.observacion,
            ov.monto_orden_venta,
            ov.descuento,
            ov.fecha_atencion,
            ov.estado,
            p.tipo_documento,
            p.documento,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.correo AS cliente_correo,
            p.telefono AS cliente_telefono,
            s.nombre AS sucursal_nombre,
            s.igv AS sucursal_igv
        FROM ORDENES_VENTA ov
        INNER JOIN PERSONAS p   ON p.id_persona  = ov.id_persona
        INNER JOIN SUCURSALES s ON s.id_sucursal = ov.id_sucursal
        WHERE ov.id_orden_venta = ?
        LIMIT 1
    `;

    const sqlDetalle = `
        SELECT
            dv.id_detalle_venta,
            dv.id_orden_venta,
            dv.id_producto,
            dv.cantidad,
            dv.precio_unitario,
            dv.subtotal,
            dv.observacion,
            pr.codigo AS producto_codigo,
            pr.nombre AS producto_nombre,
            pr.marca AS producto_marca
        FROM detalle_venta dv
        INNER JOIN PRODUCTOS pr ON pr.id_producto = dv.id_producto
        WHERE dv.id_orden_venta = ?
        ORDER BY dv.id_detalle_venta ASC
    `;

    try {
        const [cabRows] = await poolDB.query(sqlCabecera, [idOrdenVenta]);
        if (cabRows.length === 0) return null;

        const [detRows] = await poolDB.query(sqlDetalle, [idOrdenVenta]);

        return {
            ...cabRows[0],
            items: detRows
        };
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR ORDEN DE VENTA
// (cabecera + detalles + descuento stock, transacción)
// ======================================================
const registrarOrdenVenta = async (datos) => {
    const {
        id_persona,
        id_sucursal,
        observacion = null,
        descuento = 0,
        fecha_atencion = null,
        estado = 'PENDIENTE',
        items = []
    } = datos;

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('La orden de venta debe tener al menos un item');
    }

    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        // Calcular monto total
        const montoOrden = items.reduce(
            (acc, it) => acc + (Number(it.subtotal) || 0),
            0
        );

        // 1) Insertar cabecera
        const sqlCab = `
            INSERT INTO ORDENES_VENTA
            (id_persona, id_sucursal, observacion, monto_orden_venta,
             descuento, fecha_atencion, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [resCab] = await conn.query(sqlCab, [
            id_persona,
            id_sucursal,
            observacion,
            montoOrden,
            descuento,
            toISODate(fecha_atencion),
            estado
        ]);
        const idOrdenVenta = resCab.insertId;

        // 2) Insertar detalles + descontar stock
        const valuesDetalles = items.map(it => [
            idOrdenVenta,
            it.id_producto,
            it.cantidad,
            it.precio_unitario,
            it.subtotal,
            it.observacion || null
        ]);

        await conn.query(
            `INSERT INTO detalle_venta
             (id_orden_venta, id_producto, cantidad, precio_unitario, subtotal, observacion)
             VALUES ?`,
            [valuesDetalles]
        );

        for (const it of items) {
            const [upd] = await conn.query(
                `UPDATE sucursal_inventario
                 SET stock = stock - ?
                 WHERE id_sucursal = ? AND id_producto = ? AND stock >= ?`,
                [it.cantidad, id_sucursal, it.id_producto, it.cantidad]
            );
            if (upd.affectedRows === 0) {
                throw new Error(
                    `Stock insuficiente para producto ${it.id_producto}`
                );
            }
        }

        await conn.commit();
        return { id_orden_venta: idOrdenVenta, monto_orden_venta: montoOrden };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR ESTADO DE ORDEN DE VENTA
// ======================================================
const actualizarEstadoOrdenVenta = async (idOrdenVenta, estado) => {
    const sql = `
        UPDATE ORDENES_VENTA SET
            estado = ?
        WHERE id_orden_venta = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idOrdenVenta]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR ORDEN DE VENTA
// (transacción: revierte stock + borra detalles + cabecera)
// ======================================================
const eliminarOrdenVenta = async (idOrdenVenta) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        const [cabRows] = await conn.query(
            `SELECT id_sucursal FROM ORDENES_VENTA WHERE id_orden_venta = ?`,
            [idOrdenVenta]
        );
        if (cabRows.length === 0) throw new Error('Orden de venta no encontrada');

        const idSucursal = cabRows[0].id_sucursal;

        // Leer detalles y revertir stock
        const [detalles] = await conn.query(
            `SELECT id_producto, cantidad FROM detalle_venta WHERE id_orden_venta = ?`,
            [idOrdenVenta]
        );

        for (const d of detalles) {
            await conn.query(
                `UPDATE sucursal_inventario
                 SET stock = stock + ?
                 WHERE id_sucursal = ? AND id_producto = ?`,
                [d.cantidad, idSucursal, d.id_producto]
            );
        }

        await conn.query(`DELETE FROM detalle_venta WHERE id_orden_venta = ?`, [idOrdenVenta]);
        const [result] = await conn.query(
            `DELETE FROM ORDENES_VENTA WHERE id_orden_venta = ?`,
            [idOrdenVenta]
        );

        await conn.commit();
        return result;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// LISTAR COMPROBANTES (con filtros)
// ======================================================
const listarComprobantes = async (filtros = {}) => {
    const {
        idSucursal = null,
        tipoComprobante = null,
        estado = null,
        idPersona = null,
        busqueda = null
    } = filtros;

    let sql = `
        SELECT
            c.id_comprobante,
            c.id_persona,
            c.id_sucursal,
            c.id_orden_trabajo,
            c.id_orden_venta,
            c.tipo_comprobante,
            c.numero,
            c.serie,
            c.fecha_emision,
            c.subtotal,
            c.igv,
            c.descuento,
            c.total,
            c.estado,
            c.observacion,
            c.fecha_modificacion,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            s.nombre AS sucursal_nombre
        FROM COMPROBANTES c
        INNER JOIN PERSONAS p   ON p.id_persona  = c.id_persona
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
    `;
    const params = [];
    const condiciones = [];

    if (idSucursal) {
        condiciones.push('c.id_sucursal = ?');
        params.push(idSucursal);
    }
    if (tipoComprobante) {
        condiciones.push('c.tipo_comprobante = ?');
        params.push(tipoComprobante);
    }
    if (estado) {
        condiciones.push('c.estado = ?');
        params.push(estado);
    }
    if (idPersona) {
        condiciones.push('c.id_persona = ?');
        params.push(idPersona);
    }
    if (busqueda) {
        condiciones.push(`(
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            p.documento LIKE ? OR
            CAST(c.numero AS CHAR) LIKE ? OR
            c.serie LIKE ?
        )`);
        const q = `%${busqueda}%`;
        params.push(q, q, q, q, q);
    }

    if (condiciones.length > 0) {
        sql += ` WHERE ` + condiciones.join(' AND ');
    }

    sql += ` ORDER BY c.id_comprobante DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR COMPROBANTE POR ID (con detalle)
// ======================================================
const buscarComprobantePorId = async (idComprobante) => {
    const sqlCabecera = `
        SELECT
            c.id_comprobante,
            c.id_persona,
            c.id_sucursal,
            c.id_orden_trabajo,
            c.id_orden_venta,
            c.tipo_comprobante,
            c.numero,
            c.serie,
            c.fecha_emision,
            c.subtotal,
            c.igv,
            c.descuento,
            c.total,
            c.estado,
            c.observacion,
            c.fecha_modificacion,
            p.tipo_documento,
            p.documento,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.correo AS cliente_correo,
            p.telefono AS cliente_telefono,
            p.direccion AS cliente_direccion,
            s.nombre AS sucursal_nombre,
            s.ruc AS sucursal_ruc,
            s.direccion AS sucursal_direccion,
            s.igv AS sucursal_igv
        FROM COMPROBANTES c
        INNER JOIN PERSONAS p   ON p.id_persona  = c.id_persona
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
        WHERE c.id_comprobante = ?
        LIMIT 1
    `;

    const sqlDetalle = `
        SELECT
            id_detalle,
            id_comprobante,
            cantidad,
            precio_unitario,
            subtotal,
            observacion
        FROM detalle_comprobante
        WHERE id_comprobante = ?
        ORDER BY id_detalle ASC
    `;

    try {
        const [cabRows] = await poolDB.query(sqlCabecera, [idComprobante]);
        if (cabRows.length === 0) return null;

        const [detRows] = await poolDB.query(sqlDetalle, [idComprobante]);

        return {
            ...cabRows[0],
            items: detRows
        };
    } catch (error) {
        throw error;
    }
};

// ======================================================
// GENERAR NÚMERO DE COMPROBANTE (secuencial por tipo/serie/sucursal)
// ======================================================
const obtenerSiguienteNumero = async (idSucursal, tipoComprobante, serie) => {
    const sql = `
        SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente
        FROM COMPROBANTES
        WHERE id_sucursal = ? AND tipo_comprobante = ? AND serie = ?
    `;

    try {
        const [rows] = await poolDB.query(sql, [idSucursal, tipoComprobante, serie]);
        return rows[0].siguiente;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EMITIR COMPROBANTE
// (cabecera + detalles, transacción)
// ======================================================
const emitirComprobante = async (datos) => {
    const {
        id_persona,
        id_sucursal,
        id_orden_trabajo = null,
        id_orden_venta = null,
        tipo_comprobante,
        serie,
        fecha_emision,
        subtotal,
        igv,
        descuento = 0,
        total,
        estado = 'EMITIDO',
        observacion = null,
        items = []
    } = datos;

    // Validar XOR: exactamente uno de orden_trabajo u orden_venta
    if (!id_orden_trabajo && !id_orden_venta) {
        throw new Error('Debe asociar el comprobante a una orden de trabajo o de venta');
    }
    if (id_orden_trabajo && id_orden_venta) {
        throw new Error('No puede asociar el comprobante a ambas órdenes a la vez');
    }
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('El comprobante debe tener al menos un item');
    }

    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        // Calcular siguiente número dentro de la transacción
        const [numRows] = await conn.query(
            `SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente
             FROM COMPROBANTES
             WHERE id_sucursal = ? AND tipo_comprobante = ? AND serie = ?
             FOR UPDATE`,
            [id_sucursal, tipo_comprobante, serie]
        );
        const numero = numRows[0].siguiente;

        // 1) Insertar cabecera
        const sqlCab = `
            INSERT INTO COMPROBANTES
            (id_persona, id_sucursal, id_orden_trabajo, id_orden_venta,
             tipo_comprobante, numero, serie, fecha_emision,
             subtotal, igv, descuento, total, estado, observacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [resCab] = await conn.query(sqlCab, [
            id_persona, id_sucursal, id_orden_trabajo, id_orden_venta,
            tipo_comprobante, numero, serie, toISODate(fecha_emision),
            subtotal, igv, descuento, total, estado, observacion
        ]);
        const idComprobante = resCab.insertId;

        // 2) Insertar detalles
        const valuesDetalles = items.map(it => [
            idComprobante,
            it.cantidad,
            it.precio_unitario,
            it.subtotal,
            it.observacion || null
        ]);

        await conn.query(
            `INSERT INTO detalle_comprobante
             (id_comprobante, cantidad, precio_unitario, subtotal, observacion)
             VALUES ?`,
            [valuesDetalles]
        );

        await conn.commit();
        return { id_comprobante: idComprobante, numero, serie };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR ESTADO DE COMPROBANTE (EMITIDO / ANULADO)
// ======================================================
const actualizarEstadoComprobante = async (idComprobante, estado) => {
    const sql = `
        UPDATE COMPROBANTES SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_comprobante = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idComprobante]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    // Órdenes de venta
    listarOrdenesVenta,
    buscarOrdenVentaPorId,
    buscarOrdenVentaConDetalle,
    registrarOrdenVenta,
    actualizarEstadoOrdenVenta,
    eliminarOrdenVenta,

    // Comprobantes
    listarComprobantes,
    buscarComprobantePorId,
    obtenerSiguienteNumero,
    emitirComprobante,
    actualizarEstadoComprobante
};