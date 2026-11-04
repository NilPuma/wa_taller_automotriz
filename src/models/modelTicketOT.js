const poolDB = require('../config_db/config_mysql');
const { toISODate } = require('../utils/fechas');

const TIPO_TICKET_OT = 'TICKET_OT';

// Recupera la cabecera y las líneas del ticket asociado a un comprobante.
const buscarTicketCompleto = async (idComprobante, executor = poolDB) => {
    const sqlCabecera = `
        SELECT
            c.id_comprobante,
            c.id_orden_trabajo,
            c.id_persona,
            c.id_sucursal,
            c.tipo_comprobante,
            c.numero,
            c.serie,
            c.fecha_emision,
            c.subtotal,
            c.igv,
            c.descuento,
            c.total,
            p.tipo_documento,
            p.documento,
            TRIM(CONCAT_WS(' ', NULLIF(p.nombres, ''), NULLIF(p.apellidos, ''))) AS cliente_nombre,
            v.placa,
            v.marca,
            v.modelo,
            ot.fecha_atencion,
            s.nombre AS sucursal_nombre,
            s.direccion AS sucursal_direccion,
            s.telefono AS sucursal_telefono,
            s.ruc AS sucursal_ruc
        FROM COMPROBANTES c
        INNER JOIN ORDENES_TRABAJO ot ON ot.id_orden_trabajo = c.id_orden_trabajo
        INNER JOIN PERSONAS p ON p.id_persona = c.id_persona
        INNER JOIN VEHICULOS v ON v.id_vehiculo = ot.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
        WHERE c.id_comprobante = ?
          AND c.tipo_comprobante = ?
        LIMIT 1
    `;

    const sqlDetalle = `
        SELECT
            id_detalle,
            id_comprobante,
            cantidad,
            precio_unitario,
            subtotal,
            observacion AS descripcion
        FROM detalle_comprobante
        WHERE id_comprobante = ?
        ORDER BY id_detalle ASC
    `;

    const [cabRows] = await executor.query(sqlCabecera, [idComprobante, TIPO_TICKET_OT]);
    if (cabRows.length === 0) return null;

    const [detRows] = await executor.query(sqlDetalle, [idComprobante]);

    return {
        ...cabRows[0],
        codigo_ticket: `${cabRows[0].serie}-${String(cabRows[0].numero).padStart(8, '0')}`,
        items: detRows
    };
};

// Busca el ticket interno de una orden sin consultar comprobantes de otros tipos.
const buscarTicketPorOrden = async (idOrdenTrabajo) => {
    const sql = `
        SELECT id_comprobante
        FROM COMPROBANTES
        WHERE id_orden_trabajo = ?
          AND tipo_comprobante = ?
        LIMIT 1
    `;

    const [rows] = await poolDB.query(sql, [idOrdenTrabajo, TIPO_TICKET_OT]);
    if (rows.length === 0) return null;

    return buscarTicketCompleto(rows[0].id_comprobante);
};

// Crea una sola vez el ticket interno a partir de una orden finalizada.
const crearTicketDesdeOrden = async (idOrdenTrabajo) => {
    const conn = await poolDB.getConnection();
    let transaccionIniciada = false;
    let bloqueoNumeracionTomado = false;
    let nombreBloqueo = null;

    try {
        await conn.beginTransaction();
        transaccionIniciada = true;

        // Bloquea la OT para serializar intentos de emisión para esa orden.
        const [ordenRows] = await conn.query(
            `SELECT id_orden_trabajo, id_sucursal, estado
             FROM ORDENES_TRABAJO
             WHERE id_orden_trabajo = ?
             FOR UPDATE`,
            [idOrdenTrabajo]
        );

        if (ordenRows.length === 0) {
            const error = new Error('Orden de trabajo no encontrada');
            error.code = 'ORDEN_NO_ENCONTRADA';
            throw error;
        }

        const orden = ordenRows[0];
        if (orden.estado !== 'FINALIZADA') {
            const error = new Error('Solo se puede emitir un ticket para una orden finalizada');
            error.code = 'ORDEN_NO_FINALIZADA';
            throw error;
        }

        // Si ya fue emitido, devuelve el mismo ticket sin duplicarlo.
        const ticketExistente = await buscarTicketPorOrdenEnConexion(conn, idOrdenTrabajo);
        if (ticketExistente) {
            await conn.commit();
            transaccionIniciada = false;
            return ticketExistente;
        }

        // Usa una serie distinta por sucursal para evitar colisiones en el índice existente.
        const serie = `T${String(orden.id_sucursal).padStart(3, '0')}`;
        nombreBloqueo = `ticket_ot_numero_${orden.id_sucursal}`;
        const [bloqueoRows] = await conn.query(
            'SELECT GET_LOCK(?, 10) AS adquirido',
            [nombreBloqueo]
        );

        if (Number(bloqueoRows[0].adquirido) !== 1) {
            const error = new Error('No se pudo reservar el número del ticket; vuelva a intentarlo');
            error.code = 'NUMERACION_TICKET_OCUPADA';
            throw error;
        }
        bloqueoNumeracionTomado = true;

        // Revisa otra vez dentro del bloqueo de numeración antes de crear el registro.
        const ticketRevisado = await buscarTicketPorOrdenEnConexion(conn, idOrdenTrabajo);
        if (ticketRevisado) {
            await conn.commit();
            transaccionIniciada = false;
            return ticketRevisado;
        }

        const sqlDatos = `
            SELECT
                ot.id_persona,
                ot.id_sucursal,
                p.tipo_documento,
                p.documento,
                v.placa,
                v.marca,
                v.modelo,
                s.nombre AS sucursal_nombre,
                s.direccion AS sucursal_direccion,
                s.telefono AS sucursal_telefono,
                s.ruc AS sucursal_ruc
            FROM ORDENES_TRABAJO ot
            INNER JOIN PERSONAS p ON p.id_persona = ot.id_persona
            INNER JOIN VEHICULOS v ON v.id_vehiculo = ot.id_vehiculo
            INNER JOIN SUCURSALES s ON s.id_sucursal = ot.id_sucursal
            WHERE ot.id_orden_trabajo = ?
            LIMIT 1
        `;
        const [datosRows] = await conn.query(sqlDatos, [idOrdenTrabajo]);
        const datos = datosRows[0];

        const sqlItems = `
            SELECT
                CASE
                    WHEN d.id_producto IS NOT NULL THEN CONCAT('Producto: ', pr.nombre)
                    ELSE CONCAT('Servicio: ', se.nombre)
                END AS descripcion,
                d.cantidad,
                d.precio_unitario,
                d.subtotal
            FROM detalles_ot d
            LEFT JOIN PRODUCTOS pr ON pr.id_producto = d.id_producto
            LEFT JOIN SERVICIOS se ON se.id_servicio = d.id_servicio
            WHERE d.id_orden_trabajo = ?
            ORDER BY d.id_detalle_ot ASC
        `;
        const [items] = await conn.query(sqlItems, [idOrdenTrabajo]);

        if (items.length === 0) {
            const error = new Error('La orden no tiene productos ni servicios para incluir en el ticket');
            error.code = 'ORDEN_SIN_DETALLES';
            throw error;
        }

        const [numeroRows] = await conn.query(
            `SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente
             FROM COMPROBANTES
             WHERE id_sucursal = ?
               AND tipo_comprobante = ?
               AND serie = ?
             FOR UPDATE`,
            [datos.id_sucursal, TIPO_TICKET_OT, serie]
        );
        const numero = numeroRows[0].siguiente;

        const [totalRows] = await conn.query(
            `SELECT COALESCE(SUM(subtotal), 0) AS total
             FROM detalles_ot
             WHERE id_orden_trabajo = ?`,
            [idOrdenTrabajo]
        );
        const total = totalRows[0].total;

        // El ticket interno registra los importes de la OT sin emitir desglose tributario.
        const [insertCabecera] = await conn.query(
            `INSERT INTO COMPROBANTES
             (id_persona, id_sucursal, id_orden_trabajo, id_orden_venta,
              tipo_comprobante, numero, serie, fecha_emision,
              subtotal, igv, descuento, total)
             VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, 0, ?)`,
            [
                datos.id_persona,
                datos.id_sucursal,
                idOrdenTrabajo,
                TIPO_TICKET_OT,
                numero,
                serie,
                toISODate(new Date()),
                total,
                total
            ]
        );

        const idComprobante = insertCabecera.insertId;
        const valoresDetalle = items.map(item => [
            idComprobante,
            item.cantidad,
            item.precio_unitario,
            item.subtotal,
            item.descripcion
        ]);

        await conn.query(
            `INSERT INTO detalle_comprobante
             (id_comprobante, cantidad, precio_unitario, subtotal, observacion)
             VALUES ?`,
            [valoresDetalle]
        );

        const ticket = await buscarTicketCompleto(idComprobante, conn);
        await conn.commit();
        transaccionIniciada = false;
        return ticket;

    } catch (error) {
        if (transaccionIniciada) await conn.rollback();
        throw error;
    } finally {
        if (bloqueoNumeracionTomado) {
            try {
                await conn.query('SELECT RELEASE_LOCK(?)', [nombreBloqueo]);
            } catch (error) {
                console.error('No se pudo liberar el bloqueo de numeración del ticket:', error);
            }
        }
        conn.release();
    }
};

// Busca un ticket por OT usando una conexión que ya participa en una transacción.
const buscarTicketPorOrdenEnConexion = async (executor, idOrdenTrabajo) => {
    const [rows] = await executor.query(
        `SELECT id_comprobante
         FROM COMPROBANTES
         WHERE id_orden_trabajo = ?
           AND tipo_comprobante = ?
         LIMIT 1`,
        [idOrdenTrabajo, TIPO_TICKET_OT]
    );

    if (rows.length === 0) return null;
    return buscarTicketCompleto(rows[0].id_comprobante, executor);
};

module.exports = {
    buscarTicketPorOrden,
    buscarTicketCompleto,
    crearTicketDesdeOrden
};