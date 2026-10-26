const poolDB = require('../config_db/config_mysql');
const { toISODate } = require('../utils/fechas');

// ======================================================
// LISTAR COTIZACIONES (con filtros opcionales)
// ======================================================
const listarCotizaciones = async (filtros = {}) => {
    const { idSucursal = null, estado = null, idPersona = null, busqueda = null } = filtros;

    let sql = `
        SELECT
            c.id_cotizacion,
            c.id_persona,
            c.id_sucursal,
            c.id_vehiculo,
            c.observacion,
            c.monto_cotizacion,
            c.estado,
            c.validez,
            c.fecha_cotizacion,
            c.fecha_modificacion,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            v.placa,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            s.nombre AS sucursal_nombre,
            (ot.id_orden_trabajo IS NOT NULL) AS tiene_ot,
            ot.id_orden_trabajo
        FROM COTIZACIONES c
        INNER JOIN PERSONAS p   ON p.id_persona  = c.id_persona
        INNER JOIN VEHICULOS v  ON v.id_vehiculo = c.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
        LEFT JOIN ORDENES_TRABAJO ot ON ot.id_cotizacion = c.id_cotizacion
    `;
    const params = [];
    const condiciones = [];

    if (idSucursal) {
        condiciones.push('c.id_sucursal = ?');
        params.push(idSucursal);
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
            v.placa LIKE ? OR
            CAST(c.id_cotizacion AS CHAR) LIKE ?
        )`);
        const q = `%${busqueda}%`;
        params.push(q, q, q, q, q);
    }

    if (condiciones.length > 0) {
        sql += ` WHERE ` + condiciones.join(' AND ');
    }

    sql += ` ORDER BY c.id_cotizacion DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR COTIZACIÓN POR ID (cabecera, sin detalles)
// ======================================================
const buscarCotizacionPorId = async (idCotizacion) => {
    const sql = `
        SELECT
            c.id_cotizacion,
            c.id_persona,
            c.id_sucursal,
            c.id_vehiculo,
            c.observacion,
            c.monto_cotizacion,
            c.estado,
            c.validez,
            c.fecha_cotizacion,
            c.fecha_modificacion,
            p.tipo_documento,
            p.documento,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.correo AS cliente_correo,
            p.telefono AS cliente_telefono,
            p.direccion AS cliente_direccion,
            v.placa,
            v.vin,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            v.color,
            v.tipo_combustible,
            s.nombre AS sucursal_nombre,
            s.igv AS sucursal_igv,
            (ot.id_orden_trabajo IS NOT NULL) AS tiene_ot,
            ot.id_orden_trabajo
        FROM COTIZACIONES c
        INNER JOIN PERSONAS p   ON p.id_persona  = c.id_persona
        INNER JOIN VEHICULOS v  ON v.id_vehiculo = c.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
        LEFT JOIN ORDENES_TRABAJO ot ON ot.id_cotizacion = c.id_cotizacion
        WHERE c.id_cotizacion = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idCotizacion]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR COTIZACIÓN CON DETALLE (cabecera + items)
// ======================================================
const buscarCotizacionConDetalle = async (idCotizacion) => {
    const sqlCabecera = `
        SELECT
            c.id_cotizacion,
            c.id_persona,
            c.id_sucursal,
            c.id_vehiculo,
            c.observacion,
            c.monto_cotizacion,
            c.estado,
            c.validez,
            c.fecha_cotizacion,
            c.fecha_modificacion,
            p.tipo_documento,
            p.documento,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.correo AS cliente_correo,
            p.telefono AS cliente_telefono,
            p.direccion AS cliente_direccion,
            v.placa,
            v.vin,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            v.color,
            v.tipo_combustible,
            s.nombre AS sucursal_nombre,
            s.igv AS sucursal_igv,
            (ot.id_orden_trabajo IS NOT NULL) AS tiene_ot,
            ot.id_orden_trabajo
        FROM COTIZACIONES c
        INNER JOIN PERSONAS p   ON p.id_persona  = c.id_persona
        INNER JOIN VEHICULOS v  ON v.id_vehiculo = c.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
        LEFT JOIN ORDENES_TRABAJO ot ON ot.id_cotizacion = c.id_cotizacion
        WHERE c.id_cotizacion = ?
        LIMIT 1
    `;

    const sqlDetalle = `
        SELECT
            dc.id_detalle_cotizacion,
            dc.id_cotizacion,
            dc.id_producto,
            dc.id_servicio,
            dc.cantidad,
            dc.precio_unitario,
            dc.subtotal,
            dc.observacion,
            COALESCE(pr.nombre, se.nombre) AS descripcion,
            CASE
                WHEN dc.id_producto IS NOT NULL THEN 'PRODUCTO'
                ELSE 'SERVICIO'
            END AS tipo
        FROM detalle_cotizacion dc
        LEFT JOIN PRODUCTOS pr ON pr.id_producto = dc.id_producto
        LEFT JOIN SERVICIOS se ON se.id_servicio = dc.id_servicio
        WHERE dc.id_cotizacion = ?
        ORDER BY dc.id_detalle_cotizacion ASC
    `;

    try {
        const [cabRows] = await poolDB.query(sqlCabecera, [idCotizacion]);
        if (cabRows.length === 0) return null;

        const [detRows] = await poolDB.query(sqlDetalle, [idCotizacion]);

        return {
            ...cabRows[0],
            items: detRows
        };
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR COTIZACIÓN COMPLETA (cabecera + detalles, transacción)
// ======================================================
const registrarCotizacion = async (datos) => {
    const {
        id_persona,
        id_sucursal,
        id_vehiculo,
        observacion = null,
        estado = 'PENDIENTE',
        validez = null,
        fecha_cotizacion,
        items = []
    } = datos;

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('La cotización debe tener al menos un item');
    }

    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        // Calcular monto total (subtotal sin IGV, como en el mock)
        const montoCotizacion = items.reduce(
            (acc, it) => acc + (Number(it.subtotal) || 0),
            0
        );

        const sqlCab = `
            INSERT INTO COTIZACIONES
            (id_persona, id_sucursal, id_vehiculo, observacion,
             monto_cotizacion, estado, validez, fecha_cotizacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [resCab] = await conn.query(sqlCab, [
            id_persona,
            id_sucursal,
            id_vehiculo,
            observacion,
            montoCotizacion,
            estado,
            validez,
            toISODate(fecha_cotizacion)
        ]);

        const idCotizacion = resCab.insertId;

        const valuesDetalles = items.map(it => [
            idCotizacion,
            it.id_producto || null,
            it.id_servicio || null,
            it.cantidad,
            it.precio_unitario,
            it.subtotal,
            it.observacion || null
        ]);

        await conn.query(
            `INSERT INTO detalle_cotizacion
             (id_cotizacion, id_producto, id_servicio, cantidad,
              precio_unitario, subtotal, observacion)
             VALUES ?`,
            [valuesDetalles]
        );

        await conn.commit();

        return { id_cotizacion: idCotizacion, monto_cotizacion: montoCotizacion };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR CABECERA (sin tocar detalles)
// ======================================================
const actualizarCotizacion = async (idCotizacion, datos) => {
    const sql = `
        UPDATE COTIZACIONES SET
            observacion        = ?,
            estado             = ?,
            validez            = ?,
            fecha_cotizacion   = ?,
            fecha_modificacion = CURDATE()
        WHERE id_cotizacion = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.observacion || null,
            datos.estado || 'PENDIENTE',
            datos.validez || null,
            toISODate(datos.fecha_cotizacion),
            idCotizacion
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REEMPLAZAR DETALLES (transacción: borra + inserta + recalcula monto)
// ======================================================
const reemplazarDetallesCotizacion = async (idCotizacion, items) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('La cotización debe tener al menos un item');
    }

    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        await conn.query(
            `DELETE FROM detalle_cotizacion WHERE id_cotizacion = ?`,
            [idCotizacion]
        );

        const montoCotizacion = items.reduce(
            (acc, it) => acc + (Number(it.subtotal) || 0),
            0
        );

        const values = items.map(it => [
            idCotizacion,
            it.id_producto || null,
            it.id_servicio || null,
            it.cantidad,
            it.precio_unitario,
            it.subtotal,
            it.observacion || null
        ]);

        await conn.query(
            `INSERT INTO detalle_cotizacion
             (id_cotizacion, id_producto, id_servicio, cantidad,
              precio_unitario, subtotal, observacion)
             VALUES ?`,
            [values]
        );

        await conn.query(
            `UPDATE COTIZACIONES SET
                monto_cotizacion   = ?,
                fecha_modificacion = CURDATE()
             WHERE id_cotizacion = ?`,
            [montoCotizacion, idCotizacion]
        );

        await conn.commit();
        return { id_cotizacion: idCotizacion, monto_cotizacion: montoCotizacion };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR ESTADO
// ======================================================
const actualizarEstadoCotizacion = async (idCotizacion, estado) => {
    const sql = `
        UPDATE COTIZACIONES SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_cotizacion = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idCotizacion]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR COTIZACIÓN (transacción: borra detalles + cabecera)
// ======================================================
const eliminarCotizacion = async (idCotizacion) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        await conn.query(
            `DELETE FROM detalle_cotizacion WHERE id_cotizacion = ?`,
            [idCotizacion]
        );

        const [result] = await conn.query(
            `DELETE FROM COTIZACIONES WHERE id_cotizacion = ?`,
            [idCotizacion]
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
// EXPORTS
// ======================================================
module.exports = {
    listarCotizaciones,
    buscarCotizacionPorId,
    buscarCotizacionConDetalle,
    registrarCotizacion,
    actualizarCotizacion,
    reemplazarDetallesCotizacion,
    actualizarEstadoCotizacion,
    eliminarCotizacion
};