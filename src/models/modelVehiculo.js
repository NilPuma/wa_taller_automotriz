const poolDB = require('../config_db/config_mysql');

// ======================================================
// LISTAR VEHÍCULOS (con búsqueda opcional por placa/marca/modelo)
// ======================================================
const listarVehiculos = async (busqueda = null) => {
    let sql = `
        SELECT
            v.id_vehiculo,
            v.id_persona,
            v.placa,
            v.vin,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            v.color,
            v.numero_motor,
            v.numero_chasis,
            v.tipo_combustible,
            v.observaciones,
            v.estado,
            v.fecha_modificacion,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono
        FROM VEHICULOS v
        INNER JOIN PERSONAS p ON p.id_persona = v.id_persona
    `;
    const params = [];

    if (busqueda) {
        sql += ` WHERE (
            v.placa LIKE ? OR
            v.marca LIKE ? OR
            v.modelo LIKE ? OR
            v.vin LIKE ? OR
            p.nombres LIKE ? OR
            p.apellidos LIKE ? OR
            p.documento LIKE ?
        )`;
        const q = `%${busqueda}%`;
        params.push(q, q, q, q, q, q, q);
    }

    sql += ` ORDER BY v.id_vehiculo DESC`;

    try {
        const [rows] = await poolDB.query(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// LISTAR VEHÍCULOS DE UNA PERSONA
// ======================================================
const listarVehiculosPorPersona = async (idPersona) => {
    const sql = `
        SELECT
            id_vehiculo,
            id_persona,
            placa,
            vin,
            marca,
            modelo,
            \`año\` AS anio,
            color,
            numero_motor,
            numero_chasis,
            tipo_combustible,
            observaciones,
            estado,
            fecha_modificacion
        FROM VEHICULOS
        WHERE id_persona = ?
        ORDER BY id_vehiculo DESC
    `;

    try {
        const [rows] = await poolDB.query(sql, [idPersona]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR VEHÍCULO POR ID
// ======================================================
const buscarVehiculoPorId = async (idVehiculo) => {
    const sql = `
        SELECT
            v.id_vehiculo,
            v.id_persona,
            v.placa,
            v.vin,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            v.color,
            v.numero_motor,
            v.numero_chasis,
            v.tipo_combustible,
            v.observaciones,
            v.estado,
            v.fecha_modificacion,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            p.correo AS cliente_correo
        FROM VEHICULOS v
        INNER JOIN PERSONAS p ON p.id_persona = v.id_persona
        WHERE v.id_vehiculo = ?
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [idVehiculo]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// BUSCAR VEHÍCULO POR PLACA (usado en "Buscar placa" de cotizaciones)
// ======================================================
const buscarVehiculoPorPlaca = async (placa) => {
    const sql = `
        SELECT
            v.id_vehiculo,
            v.id_persona,
            v.placa,
            v.vin,
            v.marca,
            v.modelo,
            v.\`año\` AS anio,
            v.color,
            v.numero_motor,
            v.numero_chasis,
            v.tipo_combustible,
            v.observaciones,
            v.estado,
            p.nombres AS cliente_nombres,
            p.apellidos AS cliente_apellidos,
            p.documento AS cliente_documento,
            p.telefono AS cliente_telefono,
            p.correo AS cliente_correo,
            p.direccion AS cliente_direccion
        FROM VEHICULOS v
        INNER JOIN PERSONAS p ON p.id_persona = v.id_persona
        WHERE UPPER(v.placa) = UPPER(?)
        LIMIT 1
    `;

    try {
        const [rows] = await poolDB.query(sql, [placa]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// REGISTRAR VEHÍCULO
// ======================================================
const registrarVehiculo = async (datos) => {
    const sql = `
        INSERT INTO VEHICULOS
        (id_persona, placa, vin, marca, modelo, \`año\`, color,
         numero_motor, numero_chasis, tipo_combustible, observaciones, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_persona,
            datos.placa.toUpperCase(),
            datos.vin || null,
            datos.marca || null,
            datos.modelo || null,
            datos.anio || null,
            datos.color || null,
            datos.numero_motor || null,
            datos.numero_chasis || null,
            datos.tipo_combustible || null,
            datos.observaciones || null,
            datos.estado || 'ACTIVO'
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ACTUALIZAR VEHÍCULO
// ======================================================
const actualizarVehiculo = async (idVehiculo, datos) => {
    const sql = `
        UPDATE VEHICULOS SET
            id_persona       = ?,
            placa            = ?,
            vin              = ?,
            marca            = ?,
            modelo           = ?,
            \`año\`            = ?,
            color            = ?,
            numero_motor     = ?,
            numero_chasis    = ?,
            tipo_combustible = ?,
            observaciones    = ?,
            estado           = ?,
            fecha_modificacion = CURDATE()
        WHERE id_vehiculo = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [
            datos.id_persona,
            datos.placa.toUpperCase(),
            datos.vin || null,
            datos.marca || null,
            datos.modelo || null,
            datos.anio || null,
            datos.color || null,
            datos.numero_motor || null,
            datos.numero_chasis || null,
            datos.tipo_combustible || null,
            datos.observaciones || null,
            datos.estado || 'ACTIVO',
            idVehiculo
        ]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// ======================================================
const cambiarEstadoVehiculo = async (idVehiculo, estado) => {
    const sql = `
        UPDATE VEHICULOS SET
            estado = ?,
            fecha_modificacion = CURDATE()
        WHERE id_vehiculo = ?
    `;

    try {
        const [result] = await poolDB.query(sql, [estado, idVehiculo]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// ELIMINAR VEHÍCULO (físico — fallará si tiene citas/órdenes)
// ======================================================
const eliminarVehiculo = async (idVehiculo) => {
    const sql = `DELETE FROM VEHICULOS WHERE id_vehiculo = ?`;

    try {
        const [result] = await poolDB.query(sql, [idVehiculo]);
        return result;
    } catch (error) {
        throw error;
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarVehiculos,
    listarVehiculosPorPersona,
    buscarVehiculoPorId,
    buscarVehiculoPorPlaca,
    registrarVehiculo,
    actualizarVehiculo,
    cambiarEstadoVehiculo,
    eliminarVehiculo
};