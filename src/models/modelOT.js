const poolDB = require('../config_db/config_mysql');
const { toISODate } = require('../utils/fechas');

// ======================================================
// LISTAR ÓRDENES DE TRABAJO (con filtros opcionales)
// ======================================================
const listarOrdenes = async (filtros = {}) => {
    const {
        idSucursal = null,
        idMecanico = null,
        estado = null,
        busqueda = null
    } = filtros;

    let sql = `
        SELECT
            ot.id_orden_trabajo,
            ot.id_cita,
            ot.id_cotizacion,
            ot.id_persona,
            ot.id_sucursal,
            ot.id_vehiculo,
            ot.observacion,
            ot.fecha_atencion,
            ot.estado,
            ot.fecha_modificacion,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            v.placa,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            s.nombre AS sucursal_nombre,
            GROUP_CONCAT(DISTINCT CONCAT(pm.nombres, ' ', COALESCE(pm.apellidos, '')) SEPARATOR ', ') AS mecanicos,
            GROUP_CONCAT(DISTINCT mot.id_mecanico) AS ids_mecanicos
        FROM ORDENES_TRABAJO ot
        INNER JOIN PERSONAS p       ON p.id_persona  = ot.id_persona
        INNER JOIN VEHICULOS v      ON v.id_vehiculo = ot.id_vehiculo
        INNER JOIN SUCURSALES s     ON s.id_sucursal = ot.id_sucursal
        LEFT JOIN mecanico_ot mot   ON mot.id_orden_trabajo = ot.id_orden_trabajo
        LEFT JOIN MECANICOS m       ON m.id_mecanico = mot.id_mecanico
        LEFT JOIN PERSONAS pm       ON pm.id_persona = m.id_persona
    `;
    const params = [];
    const condiciones = [];

    if (idSucursal) {
        condiciones.push('ot.id_sucursal = ?');
        params.push(idSucursal);
    }
    if (estado && estado !== 'todas') {
        condiciones.push('ot.estado = ?');
        params.push(estado);
    }
    if (idMecanico) {
        condiciones.push(`ot.id_orden_trabajo IN (
            SELECT id_orden_trabajo FROM mecanico_ot WHERE id_mecanico = ?
        )`);
        params.push(idMecanico);
    }
    if (busqueda) {
        condiciones.push(`(
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            p.documento LIKE ? OR
            v.placa LIKE ? OR
            CAST(ot.id_orden_trabajo AS CHAR) LIKE ?
        )`);
        const q = `%${busqueda}%`;
        params.push(q, q, q, q, q);
    }

    if (condiciones.length > 0) {
        sql += ` WHERE ` + condiciones.join(' AND ');
    }

    sql += ` GROUP BY ot.id_orden_trabajo ORDER BY ot.id_orden_trabajo DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR ÓRDENES POR MECÁNICO (dashboard del mecánico)
// ======================================================
const listarOrdenesPorMecanico = async (idMecanico, estado = null) => {
    let sql = `
        SELECT
            ot.id_orden_trabajo,
            ot.id_cita,
            ot.id_cotizacion,
            ot.id_persona,
            ot.id_sucursal,
            ot.id_vehiculo,
            ot.observacion,
            ot.fecha_atencion,
            ot.estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            v.placa,
            v.marca,
            v.modelo,
            v.\`año\` AS anio
        FROM ORDENES_TRABAJO ot
        INNER JOIN PERSONAS p       ON p.id_persona  = ot.id_persona
        INNER JOIN VEHICULOS v      ON v.id_vehiculo = ot.id_vehiculo
        INNER JOIN mecanico_ot mot  ON mot.id_orden_trabajo = ot.id_orden_trabajo
        WHERE mot.id_mecanico = ?
    `;
    const params = [idMecanico];

    if (estado && estado !== 'todas') {
        sql += ` AND ot.estado = ?`;
        params.push(estado);
    }

    sql += ` ORDER BY ot.id_orden_trabajo DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR ORDEN POR ID (cabecera, con mecanicos y cliente)
// ======================================================
const buscarOrdenPorId = async (idOrden) => {
    const sql = `
        SELECT
            ot.id_orden_trabajo,
            ot.id_cita,
            ot.id_cotizacion,
            ot.id_persona,
            ot.id_sucursal,
            ot.id_vehiculo,
            ot.observacion,
            ot.fecha_atencion,
            ot.estado,
            ot.fecha_modificacion,
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
            s.igv AS sucursal_igv
        FROM ORDENES_TRABAJO ot
        INNER JOIN PERSONAS p   ON p.id_persona  = ot.id_persona
        INNER JOIN VEHICULOS v  ON v.id_vehiculo = ot.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = ot.id_sucursal
        WHERE ot.id_orden_trabajo = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idOrden]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR ORDEN CON DETALLE COMPLETO (cabecera + detalles + mecánicos)
// ======================================================
const buscarOrdenConDetalle = async (idOrden) => {
    const sqlCabecera = `
        SELECT
            ot.id_orden_trabajo,
            ot.id_cita,
            ot.id_cotizacion,
            ot.id_persona,
            ot.id_sucursal,
            ot.id_vehiculo,
            ot.observacion,
            ot.fecha_atencion,
            ot.estado,
            ot.fecha_modificacion,
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
            s.igv AS sucursal_igv
        FROM ORDENES_TRABAJO ot
        INNER JOIN PERSONAS p   ON p.id_persona  = ot.id_persona
        INNER JOIN VEHICULOS v  ON v.id_vehiculo = ot.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = ot.id_sucursal
        WHERE ot.id_orden_trabajo = ?
        LIMIT 1
    `;

    const sqlDetalles = `
        SELECT
            d.id_detalle_ot,
            d.id_orden_trabajo,
            d.id_servicio,
            d.id_producto,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
            d.observacion,
            COALESCE(pr.nombre, se.nombre) AS descripcion,
            CASE
                WHEN d.id_producto IS NOT NULL THEN 'PRODUCTO'
                ELSE 'SERVICIO'
            END AS tipo
        FROM detalles_ot d
        LEFT JOIN PRODUCTOS pr ON pr.id_producto = d.id_producto
        LEFT JOIN SERVICIOS se ON se.id_servicio = d.id_servicio
        WHERE d.id_orden_trabajo = ?
        ORDER BY d.id_detalle_ot ASC
    `;

    const sqlMecanicos = `
        SELECT
            mot.id_mecanico_ot,
            mot.id_mecanico,
            m.especialidad,
            p.nombres,
            p.apellidos,
            p.documento,
            p.telefono
        FROM mecanico_ot mot
        INNER JOIN MECANICOS m ON m.id_mecanico = mot.id_mecanico
        INNER JOIN PERSONAS p  ON p.id_persona  = m.id_persona
        WHERE mot.id_orden_trabajo = ?
    `;

    try {
        const [cabRows] = await poolDB.query(sqlCabecera, [idOrden]);
        if (cabRows.length === 0) return null;

        const [detRows] = await poolDB.query(sqlDetalles, [idOrden]);
        const [mecRows] = await poolDB.query(sqlMecanicos, [idOrden]);

        return {
            ...cabRows[0],
            detalles: detRows,
            mecanicos: mecRows
        };
    } catch (error) {
        throw error;
    }
};

// ======================================================
// VERIFICAR SI UNA COTIZACIÓN YA FUE USADA EN UNA OT
// ======================================================
const cotizacionYaUsada = async (idCotizacion) => {
    const sql = `
        SELECT COUNT(*) AS total
        FROM ORDENES_TRABAJO
        WHERE id_cotizacion = ?
    `;

    try {
        const [rows] = await poolDB.query(sql, [idCotizacion]);
        return rows[0].total > 0;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR ORDEN COMPLETA
// (cabecera + detalles + mecánicos + descuento de stock, transacción)
// ======================================================
const registrarOrden = async (datos) => {
    const {
        id_cita = null,
        id_cotizacion = null,
        id_persona,
        id_sucursal,
        id_vehiculo,
        observacion = null,
        fecha_atencion = null,
        estado = 'PENDIENTE',
        ids_mecanicos = [],
        items = []
    } = datos;

    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        // 1) Insertar cabecera
        const sqlCab = `
            INSERT INTO ORDENES_TRABAJO
            (id_cita, id_cotizacion, id_persona, id_sucursal, id_vehiculo,
             observacion, fecha_atencion, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [resCab] = await conn.query(sqlCab, [
            id_cita, id_cotizacion, id_persona, id_sucursal, id_vehiculo,
            observacion, toISODate(fecha_atencion), estado
        ]);
        const idOrden = resCab.insertId;

        // 2) Insertar detalles + descontar stock
        if (Array.isArray(items) && items.length > 0) {
            const valuesDetalles = items.map(it => [
                idOrden,
                it.id_servicio || null,
                it.id_producto || null,
                it.cantidad,
                it.precio_unitario,
                it.subtotal,
                it.observacion || null
            ]);

            await conn.query(
                `INSERT INTO detalles_ot
                 (id_orden_trabajo, id_servicio, id_producto, cantidad,
                  precio_unitario, subtotal, observacion)
                 VALUES ?`,
                [valuesDetalles]
            );

            // Descontar stock de cada producto
            for (const it of items) {
                if (it.id_producto) {
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
            }
        }

        // 3) Asignar mecánicos
        if (Array.isArray(ids_mecanicos) && ids_mecanicos.length > 0) {
            const valuesMec = ids_mecanicos.map(idMec => [idMec, idOrden]);
            await conn.query(
                `INSERT INTO mecanico_ot (id_mecanico, id_orden_trabajo) VALUES ?`,
                [valuesMec]
            );
        }

        await conn.commit();
        return { id_orden_trabajo: idOrden };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR CABECERA (sin tocar detalles/mecánicos)
// ======================================================
const actualizarOrden = async (idOrden, datos) => {
    const sql = `
        UPDATE ORDENES_TRABAJO SET
            observacion        = ?,
            fecha_atencion     = ?,
            estado             = ?,
            fecha_modificacion = CURDATE()
        WHERE id_orden_trabajo = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.observacion || null,
            toISODate(datos.fecha_atencion),
            datos.estado || 'PENDIENTE',
            idOrden
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO DE LA ORDEN
// ======================================================
const cambiarEstadoOrden = async (idOrden, estado) => {
    const sql = `
        UPDATE ORDENES_TRABAJO SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_orden_trabajo = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idOrden]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REEMPLAZAR DETALLES
// (transacción: revierte stock anterior, borra, inserta, descuenta nuevo stock)
// ======================================================
const reemplazarDetallesOrden = async (idOrden, idSucursal, items) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        // 1) Leer detalles actuales para revertir stock
        const [detallesActuales] = await conn.query(
            `SELECT id_producto, cantidad FROM detalles_ot
             WHERE id_orden_trabajo = ? AND id_producto IS NOT NULL`,
            [idOrden]
        );

        for (const d of detallesActuales) {
            await conn.query(
                `UPDATE sucursal_inventario
                 SET stock = stock + ?
                 WHERE id_sucursal = ? AND id_producto = ?`,
                [d.cantidad, idSucursal, d.id_producto]
            );
        }

        // 2) Borrar detalles actuales
        await conn.query(
            `DELETE FROM detalles_ot WHERE id_orden_trabajo = ?`,
            [idOrden]
        );

        // 3) Insertar nuevos detalles + descontar stock
        if (Array.isArray(items) && items.length > 0) {
            const values = items.map(it => [
                idOrden,
                it.id_servicio || null,
                it.id_producto || null,
                it.cantidad,
                it.precio_unitario,
                it.subtotal,
                it.observacion || null
            ]);

            await conn.query(
                `INSERT INTO detalles_ot
                 (id_orden_trabajo, id_servicio, id_producto, cantidad,
                  precio_unitario, subtotal, observacion)
                 VALUES ?`,
                [values]
            );

            for (const it of items) {
                if (it.id_producto) {
                    const [upd] = await conn.query(
                        `UPDATE sucursal_inventario
                         SET stock = stock - ?
                         WHERE id_sucursal = ? AND id_producto = ? AND stock >= ?`,
                        [it.cantidad, idSucursal, it.id_producto, it.cantidad]
                    );
                    if (upd.affectedRows === 0) {
                        throw new Error(
                            `Stock insuficiente para producto ${it.id_producto}`
                        );
                    }
                }
            }
        }

        await conn.commit();
        return { ok: true };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ASIGNAR MECÁNICOS (reemplaza los existentes)
// ======================================================
const asignarMecanicosAOrden = async (idOrden, idsMecanicos) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        await conn.query(
            `DELETE FROM mecanico_ot WHERE id_orden_trabajo = ?`,
            [idOrden]
        );

        if (Array.isArray(idsMecanicos) && idsMecanicos.length > 0) {
            const values = idsMecanicos.map(idMec => [idMec, idOrden]);
            await conn.query(
                `INSERT INTO mecanico_ot (id_mecanico, id_orden_trabajo) VALUES ?`,
                [values]
            );
        }

        await conn.commit();
        return { ok: true, total: idsMecanicos.length };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ELIMINAR ORDEN
// (transacción: revierte stock, borra detalles + mecanicos + cabecera)
// ======================================================
const eliminarOrden = async (idOrden) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        // Leer sucursal e items con producto para revertir stock
        const [cabRows] = await conn.query(
            `SELECT id_sucursal FROM ORDENES_TRABAJO WHERE id_orden_trabajo = ?`,
            [idOrden]
        );
        if (cabRows.length === 0) {
            throw new Error('Orden no encontrada');
        }
        const idSucursal = cabRows[0].id_sucursal;

        const [detalles] = await conn.query(
            `SELECT id_producto, cantidad FROM detalles_ot
             WHERE id_orden_trabajo = ? AND id_producto IS NOT NULL`,
            [idOrden]
        );

        for (const d of detalles) {
            await conn.query(
                `UPDATE sucursal_inventario
                 SET stock = stock + ?
                 WHERE id_sucursal = ? AND id_producto = ?`,
                [d.cantidad, idSucursal, d.id_producto]
            );
        }

        await conn.query(`DELETE FROM detalles_ot WHERE id_orden_trabajo = ?`, [idOrden]);
        await conn.query(`DELETE FROM mecanico_ot WHERE id_orden_trabajo = ?`, [idOrden]);

        const [result] = await conn.query(
            `DELETE FROM ORDENES_TRABAJO WHERE id_orden_trabajo = ?`,
            [idOrden]
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
    listarOrdenes,
    listarOrdenesPorMecanico,
    buscarOrdenPorId,
    buscarOrdenConDetalle,
    cotizacionYaUsada,
    registrarOrden,
    actualizarOrden,
    cambiarEstadoOrden,
    reemplazarDetallesOrden,
    asignarMecanicosAOrden,
    eliminarOrden
};