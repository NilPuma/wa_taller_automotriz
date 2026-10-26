const poolDB = require('../config_db/config_mysql');
const { toISODate } = require('../utils/fechas');

// ======================================================
// LISTAR INFORMES (con filtros opcionales)
// ======================================================
const listarInformes = async (filtros = {}) => {
    const { idMecanico = null, idSucursal = null, busqueda = null } = filtros;

    let sql = `
        SELECT
            i.id_informe,
            i.id_orden_trabajo,
            i.id_mecanico,
            i.titulo,
            i.observacion,
            i.fecha_modificacion,
            pm.nombres AS mecanico_nombres,
            pm.apellidos AS mecanico_apellidos,
            ot.fecha_atencion,
            ot.estado AS orden_estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            v.placa,
            v.marca,
            v.modelo,
            (SELECT COUNT(*) FROM EVIDENCIAS e WHERE e.id_informe = i.id_informe) AS total_evidencias
        FROM INFORMES i
        INNER JOIN ORDENES_TRABAJO ot ON ot.id_orden_trabajo = i.id_orden_trabajo
        INNER JOIN MECANICOS m        ON m.id_mecanico = i.id_mecanico
        INNER JOIN PERSONAS pm        ON pm.id_persona = m.id_persona
        INNER JOIN PERSONAS p         ON p.id_persona = ot.id_persona
        INNER JOIN VEHICULOS v        ON v.id_vehiculo = ot.id_vehiculo
    `;
    const params = [];
    const condiciones = [];

    if (idMecanico) {
        condiciones.push('i.id_mecanico = ?');
        params.push(idMecanico);
    }
    if (idSucursal) {
        condiciones.push('ot.id_sucursal = ?');
        params.push(idSucursal);
    }
    if (busqueda) {
        condiciones.push(`(
            i.titulo LIKE ? OR
            i.observacion LIKE ? OR
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            v.placa LIKE ? OR
            CAST(i.id_orden_trabajo AS CHAR) LIKE ?
        )`);
        const q = `%${busqueda}%`;
        params.push(q, q, q, q, q, q);
    }

    if (condiciones.length > 0) {
        sql += ` WHERE ` + condiciones.join(' AND ');
    }

    sql += ` ORDER BY i.id_informe DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR INFORME POR ID (cabecera)
// ======================================================
const buscarInformePorId = async (idInforme) => {
    const sql = `
        SELECT
            i.id_informe,
            i.id_orden_trabajo,
            i.id_mecanico,
            i.titulo,
            i.observacion,
            i.fecha_modificacion,
            pm.nombres AS mecanico_nombres,
            pm.apellidos AS mecanico_apellidos,
            ot.id_sucursal,
            ot.fecha_atencion,
            ot.estado AS orden_estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            v.placa,
            v.marca,
            v.modelo,
            v.\`año\` AS anio
        FROM INFORMES i
        INNER JOIN ORDENES_TRABAJO ot ON ot.id_orden_trabajo = i.id_orden_trabajo
        INNER JOIN MECANICOS m        ON m.id_mecanico = i.id_mecanico
        INNER JOIN PERSONAS pm        ON pm.id_persona = m.id_persona
        INNER JOIN PERSONAS p         ON p.id_persona = ot.id_persona
        INNER JOIN VEHICULOS v        ON v.id_vehiculo = ot.id_vehiculo
        WHERE i.id_informe = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idInforme]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR INFORME POR ORDEN DE TRABAJO (con evidencias)
// ======================================================
const buscarInformePorOrden = async (idOrdenTrabajo) => {
    const sqlCabecera = `
        SELECT
            i.id_informe,
            i.id_orden_trabajo,
            i.id_mecanico,
            i.titulo,
            i.observacion,
            i.fecha_modificacion,
            pm.nombres AS mecanico_nombres,
            pm.apellidos AS mecanico_apellidos,
            ot.id_sucursal,
            ot.fecha_atencion,
            ot.estado AS orden_estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            v.placa,
            v.marca,
            v.modelo
        FROM INFORMES i
        INNER JOIN ORDENES_TRABAJO ot ON ot.id_orden_trabajo = i.id_orden_trabajo
        INNER JOIN MECANICOS m        ON m.id_mecanico = i.id_mecanico
        INNER JOIN PERSONAS pm        ON pm.id_persona = m.id_persona
        INNER JOIN PERSONAS p         ON p.id_persona = ot.id_persona
        INNER JOIN VEHICULOS v        ON v.id_vehiculo = ot.id_vehiculo
        WHERE i.id_orden_trabajo = ?
        LIMIT 1
    `;

    const sqlEvidencias = `
        SELECT
            id_evidencia,
            id_informe,
            url_archivo,
            descripcion,
            fecha_registro,
            fecha_modificacion
        FROM EVIDENCIAS
        WHERE id_informe = ?
        ORDER BY id_evidencia ASC
    `;

    try {
        const [cabRows] = await poolDB.query(sqlCabecera, [idOrdenTrabajo]);
        if (cabRows.length === 0) return null;

        const [evRows] = await poolDB.query(sqlEvidencias, [cabRows[0].id_informe]);

        return {
            ...cabRows[0],
            evidencias: evRows
        };
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR INFORME COMPLETO POR ID (con evidencias)
// ======================================================
const buscarInformeConEvidencias = async (idInforme) => {
    const sqlCabecera = `
        SELECT
            i.id_informe,
            i.id_orden_trabajo,
            i.id_mecanico,
            i.titulo,
            i.observacion,
            i.fecha_modificacion,
            pm.nombres AS mecanico_nombres,
            pm.apellidos AS mecanico_apellidos,
            ot.id_sucursal,
            ot.fecha_atencion,
            ot.estado AS orden_estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            v.placa,
            v.marca,
            v.modelo
        FROM INFORMES i
        INNER JOIN ORDENES_TRABAJO ot ON ot.id_orden_trabajo = i.id_orden_trabajo
        INNER JOIN MECANICOS m        ON m.id_mecanico = i.id_mecanico
        INNER JOIN PERSONAS pm        ON pm.id_persona = m.id_persona
        INNER JOIN PERSONAS p         ON p.id_persona = ot.id_persona
        INNER JOIN VEHICULOS v        ON v.id_vehiculo = ot.id_vehiculo
        WHERE i.id_informe = ?
        LIMIT 1
    `;

    const sqlEvidencias = `
        SELECT
            id_evidencia,
            id_informe,
            url_archivo,
            descripcion,
            fecha_registro,
            fecha_modificacion
        FROM EVIDENCIAS
        WHERE id_informe = ?
        ORDER BY id_evidencia ASC
    `;

    try {
        const [cabRows] = await poolDB.query(sqlCabecera, [idInforme]);
        if (cabRows.length === 0) return null;

        const [evRows] = await poolDB.query(sqlEvidencias, [idInforme]);

        return {
            ...cabRows[0],
            evidencias: evRows
        };
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR INFORME (cabecera + evidencias iniciales, transacción)
// ======================================================
const registrarInforme = async (datos) => {
    const {
        id_orden_trabajo,
        id_mecanico,
        titulo = null,
        observacion = null,
        evidencias = []
    } = datos;

    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        const sqlCab = `
            INSERT INTO INFORMES
            (id_orden_trabajo, id_mecanico, titulo, observacion)
            VALUES (?, ?, ?, ?)
        `;
        const [resCab] = await conn.query(sqlCab, [
            id_orden_trabajo,
            id_mecanico,
            titulo,
            observacion
        ]);
        const idInforme = resCab.insertId;

        if (Array.isArray(evidencias) && evidencias.length > 0) {
            const values = evidencias.map(ev => [
                idInforme,
                ev.url_archivo,
                ev.descripcion || null,
                toISODate(ev.fecha_registro)
            ]);

            await conn.query(
                `INSERT INTO EVIDENCIAS
                 (id_informe, url_archivo, descripcion, fecha_registro)
                 VALUES ?`,
                [values]
            );
        }

        await conn.commit();
        return { id_informe: idInforme };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// ACTUALIZAR CABECERA DEL INFORME
// ======================================================
const actualizarInforme = async (idInforme, datos) => {
    const sql = `
        UPDATE INFORMES SET
            titulo             = ?,
            observacion        = ?,
            fecha_modificacion = CURDATE()
        WHERE id_informe = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.titulo || null,
            datos.observacion || null,
            idInforme
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// OBTENER O CREAR INFORME PARA UNA ORDEN
// (útil: el mecánico puede subir evidencias sin crear informe manualmente)
// ======================================================
const obtenerOCrearInformePorOrden = async (idOrdenTrabajo, idMecanico) => {
    const sqlBuscar = `SELECT * FROM INFORMES WHERE id_orden_trabajo = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sqlBuscar, [idOrdenTrabajo]);
        if (rows.length > 0) return rows[0];

        const sqlInsert = `
            INSERT INTO INFORMES (id_orden_trabajo, id_mecanico, titulo, observacion)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await poolDB.query(sqlInsert, [
            idOrdenTrabajo,
            idMecanico,
            'Informe de OT-' + String(idOrdenTrabajo).padStart(4, '0'),
            null
        ]);

        return {
            id_informe: result.insertId,
            id_orden_trabajo: idOrdenTrabajo,
            id_mecanico: idMecanico,
            titulo: 'Informe de OT-' + String(idOrdenTrabajo).padStart(4, '0'),
            observacion: null
        };
    } catch (error) {
        throw error;
    }
};

// ======================================================
// AGREGAR EVIDENCIAS A UN INFORME (transacción)
// ======================================================
const agregarEvidencias = async (idInforme, evidencias) => {
    if (!Array.isArray(evidencias) || evidencias.length === 0) {
        throw new Error('Debe enviar al menos una evidencia');
    }

    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        const values = evidencias.map(ev => [
            idInforme,
            ev.url_archivo,
            ev.descripcion || null,
            toISODate(ev.fecha_registro)
        ]);

        await conn.query(
            `INSERT INTO EVIDENCIAS
             (id_informe, url_archivo, descripcion, fecha_registro)
             VALUES ?`,
            [values]
        );

        const [rows] = await conn.query(
            `SELECT id_evidencia, id_informe, url_archivo, descripcion, fecha_registro
             FROM EVIDENCIAS
             WHERE id_informe = ?
             ORDER BY id_evidencia DESC
             LIMIT ?`,
            [idInforme, evidencias.length]
        );

        await conn.commit();
        return rows;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// ======================================================
// BUSCAR EVIDENCIA POR ID
// ======================================================
const buscarEvidenciaPorId = async (idEvidencia) => {
    const sql = `SELECT * FROM EVIDENCIAS WHERE id_evidencia = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [idEvidencia]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR EVIDENCIAS POR INFORME
// ======================================================
const listarEvidenciasPorInforme = async (idInforme) => {
    const sql = `
        SELECT
            id_evidencia,
            id_informe,
            url_archivo,
            descripcion,
            fecha_registro,
            fecha_modificacion
        FROM EVIDENCIAS
        WHERE id_informe = ?
        ORDER BY id_evidencia ASC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idInforme]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR EVIDENCIA
// ======================================================
const eliminarEvidencia = async (idEvidencia) => {
    const sql = `DELETE FROM EVIDENCIAS WHERE id_evidencia = ?`;

    try {
        const [result] = await poolDB.query(sql, [idEvidencia]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR INFORME COMPLETO (transacción: evidencias + cabecera)
// ======================================================
const eliminarInforme = async (idInforme) => {
    const conn = await poolDB.getConnection();

    try {
        await conn.beginTransaction();

        await conn.query(
            `DELETE FROM EVIDENCIAS WHERE id_informe = ?`,
            [idInforme]
        );

        const [result] = await conn.query(
            `DELETE FROM INFORMES WHERE id_informe = ?`,
            [idInforme]
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
    // Informes
    listarInformes,
    buscarInformePorId,
    buscarInformePorOrden,
    buscarInformeConEvidencias,
    registrarInforme,
    actualizarInforme,
    obtenerOCrearInformePorOrden,
    eliminarInforme,

    // Evidencias
    agregarEvidencias,
    buscarEvidenciaPorId,
    listarEvidenciasPorInforme,
    eliminarEvidencia
};