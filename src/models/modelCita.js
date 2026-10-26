const poolDB = require('../config_db/config_mysql');
const { toISODate } = require('../utils/fechas');

// ======================================================
// LISTAR CITAS (con filtros)
// ======================================================
const listarCitas = async (filtros = {}) => {
    const { idSucursal = null, idMecanico = null, estado = null, fecha = null, busqueda = null } = filtros;

    let sql = `
        SELECT
            c.id_cita,
            c.id_persona,
            c.id_sucursal,
            c.id_vehiculo,
            c.fecha_cita,
            c.hora_cita,
            c.motivo,
            c.estado,
            c.fecha_modificacion,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            v.placa,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            s.nombre AS sucursal_nombre
        FROM CITAS c
        INNER JOIN PERSONAS p   ON p.id_persona  = c.id_persona
        INNER JOIN VEHICULOS v  ON v.id_vehiculo = c.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
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
    if (fecha) {
        condiciones.push('c.fecha_cita = ?');
        params.push(toISODate(fecha));
    }
    if (idMecanico) {
        condiciones.push(`c.id_cita IN (
            SELECT ot.id_cita FROM ORDENES_TRABAJO ot
            INNER JOIN mecanico_ot mot ON mot.id_orden_trabajo = ot.id_orden_trabajo
            WHERE mot.id_mecanico = ?
        )`);
        params.push(idMecanico);
    }
    if (busqueda) {
        condiciones.push(`(
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            p.documento LIKE ? OR
            p.telefono LIKE ? OR
            v.placa LIKE ?
        )`);
        const q = `%${busqueda}%`;
        params.push(q, q, q, q, q);
    }

    if (condiciones.length > 0) {
        sql += ` WHERE ` + condiciones.join(' AND ');
    }

    sql += ` ORDER BY c.fecha_cita DESC, c.hora_cita DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR CITAS SIN ORDEN DE TRABAJO (para el modal "Nueva Orden")
// ======================================================
const listarCitasSinOrden = async (idSucursal = null) => {
    let sql = `
        SELECT
            c.id_cita,
            c.id_persona,
            c.id_sucursal,
            c.id_vehiculo,
            c.fecha_cita,
            c.hora_cita,
            c.motivo,
            c.estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            v.placa,
            v.marca,
            v.modelo
        FROM CITAS c
        INNER JOIN PERSONAS p  ON p.id_persona  = c.id_persona
        INNER JOIN VEHICULOS v ON v.id_vehiculo = c.id_vehiculo
        WHERE c.estado IN ('PENDIENTE', 'CONFIRMADA')
          AND c.id_cita NOT IN (
              SELECT id_cita FROM ORDENES_TRABAJO WHERE id_cita IS NOT NULL
          )
    `;
    const params = [];

    if (idSucursal) {
        sql += ` AND c.id_sucursal = ?`;
        params.push(idSucursal);
    }

    sql += ` ORDER BY c.fecha_cita ASC, c.hora_cita ASC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR CITAS POR SUCURSAL
// ======================================================
const listarCitasPorSucursal = async (idSucursal, estado = null) => {
    let sql = `
        SELECT
            c.id_cita,
            c.id_persona,
            c.id_sucursal,
            c.id_vehiculo,
            c.fecha_cita,
            c.hora_cita,
            c.motivo,
            c.estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.telefono AS cliente_telefono,
            v.placa,
            v.marca,
            v.modelo
        FROM CITAS c
        INNER JOIN PERSONAS p  ON p.id_persona  = c.id_persona
        INNER JOIN VEHICULOS v ON v.id_vehiculo = c.id_vehiculo
        WHERE c.id_sucursal = ?
    `;
    const params = [idSucursal];

    if (estado) {
        sql += ` AND c.estado = ?`;
        params.push(estado);
    }

    sql += ` ORDER BY c.fecha_cita DESC, c.hora_cita DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR CITA POR ID
// ======================================================
const buscarCitaPorId = async (idCita) => {
    const sql = `
        SELECT
            c.id_cita,
            c.id_persona,
            c.id_sucursal,
            c.id_vehiculo,
            c.fecha_cita,
            c.hora_cita,
            c.motivo,
            c.estado,
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
            s.nombre AS sucursal_nombre
        FROM CITAS c
        INNER JOIN PERSONAS p   ON p.id_persona  = c.id_persona
        INNER JOIN VEHICULOS v  ON v.id_vehiculo = c.id_vehiculo
        INNER JOIN SUCURSALES s ON s.id_sucursal = c.id_sucursal
        WHERE c.id_cita = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idCita]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// VERIFICAR CHOQUE DE HORARIO (misma sucursal, misma fecha/hora)
// ======================================================
const existeCitaEnHorario = async (idSucursal, fechaCita, horaCita, excluirIdCita = null) => {
    let sql = `
        SELECT COUNT(*) AS total
        FROM CITAS
        WHERE id_sucursal = ?
          AND fecha_cita = ?
          AND hora_cita = ?
          AND estado IN ('PENDIENTE', 'CONFIRMADA')
    `;
    const params = [idSucursal, toISODate(fechaCita), horaCita];

    if (excluirIdCita) {
        sql += ` AND id_cita <> ?`;
        params.push(excluirIdCita);
    }

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows[0].total > 0;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR CITA
// ======================================================
const registrarCita = async (datos) => {
    const sql = `
        INSERT INTO CITAS
        (id_persona, id_sucursal, id_vehiculo, fecha_cita, hora_cita, motivo, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_persona,
            datos.id_sucursal,
            datos.id_vehiculo,
            toISODate(datos.fecha_cita),
            datos.hora_cita,
            datos.motivo || null,
            datos.estado || 'PENDIENTE'
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR CITA (fecha/hora/motivo/estado)
// ======================================================
const actualizarCita = async (idCita, datos) => {
    const sql = `
        UPDATE CITAS SET
            id_persona  = ?,
            id_sucursal = ?,
            id_vehiculo = ?,
            fecha_cita  = ?,
            hora_cita   = ?,
            motivo      = ?,
            estado      = ?,
            fecha_modificacion = CURDATE()
        WHERE id_cita = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_persona,
            datos.id_sucursal,
            datos.id_vehiculo,
            toISODate(datos.fecha_cita),
            datos.hora_cita,
            datos.motivo || null,
            datos.estado || 'PENDIENTE',
            idCita
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR ESTADO (CONFIRMADA / PENDIENTE / CANCELADA / ATENDIDA)
// ======================================================
const actualizarEstadoCita = async (idCita, estado) => {
    const sql = `
        UPDATE CITAS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_cita = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idCita]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR CITA (físico — fallará si ya tiene orden de trabajo)
// ======================================================
const eliminarCita = async (idCita) => {
    const sql = `DELETE FROM CITAS WHERE id_cita = ?`;

    try {
        const [result] = await poolDB.query(sql, [idCita]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarCitas,
    listarCitasSinOrden,
    listarCitasPorSucursal,
    buscarCitaPorId,
    existeCitaEnHorario,
    registrarCita,
    actualizarCita,
    actualizarEstadoCita,
    eliminarCita
};