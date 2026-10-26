const model = require('../models/modelVehiculo');
const modelPersonas = require('../models/modelPersona');

// ======================================================
// LISTAR VEHÍCULOS (con búsqueda opcional)
// GET /api/vehiculos?busqueda=texto
// ======================================================
const listarVehiculos = async (req, res) => {
    try {
        const { busqueda } = req.query;

        const vehiculos = await model.listarVehiculos(busqueda || null);

        return res.json({ ok: true, vehiculos });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar vehículos'
        });
    }
};

// ======================================================
// LISTAR VEHÍCULOS POR PERSONA
// GET /api/vehiculos/persona/:idPersona
// ======================================================
const listarVehiculosPorPersona = async (req, res) => {
    try {
        const { idPersona } = req.params;

        if (!idPersona) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de persona requerido'
            });
        }

        const vehiculos = await model.listarVehiculosPorPersona(idPersona);

        return res.json({ ok: true, vehiculos });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar vehículos de la persona'
        });
    }
};

// ======================================================
// BUSCAR VEHÍCULO POR ID
// GET /api/vehiculos/:id
// ======================================================
const buscarVehiculoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de vehículo requerido'
            });
        }

        const vehiculo = await model.buscarVehiculoPorId(id);

        if (!vehiculo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El vehículo no existe'
            });
        }

        return res.json({ ok: true, vehiculo });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar vehículo'
        });
    }
};

// ======================================================
// BUSCAR VEHÍCULO POR PLACA (usado en cotizaciones)
// GET /api/vehiculos/placa/:placa
// ======================================================
const buscarVehiculoPorPlaca = async (req, res) => {
    try {
        const { placa } = req.params;

        if (!placa) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe ingresar una placa'
            });
        }

        const vehiculo = await model.buscarVehiculoPorPlaca(placa);

        if (!vehiculo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'No existe un vehículo con esa placa'
            });
        }

        return res.json({ ok: true, vehiculo });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar vehículo por placa'
        });
    }
};

// ======================================================
// REGISTRAR VEHÍCULO
// POST /api/vehiculos
// body: { id_persona, placa, vin, marca, modelo, anio, color, numero_motor, numero_chasis, tipo_combustible, observaciones }
// ======================================================
const registrarVehiculo = async (req, res) => {
    try {
        const {
            id_persona,
            placa,
            vin,
            marca,
            modelo,
            anio,
            color,
            numero_motor,
            numero_chasis,
            tipo_combustible,
            observaciones
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona || !placa) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona y placa son obligatorias'
            });
        }

        // Verificar que la persona exista
        const persona = await modelPersonas.buscarPersonaPorId(id_persona);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona asociada no existe'
            });
        }

        // Verificar placa duplicada
        const existePlaca = await model.buscarVehiculoPorPlaca(placa);

        if (existePlaca) {
            return res.status(409).json({
                ok: false,
                mensaje: 'Ya existe un vehículo con esa placa'
            });
        }

        const resultado = await model.registrarVehiculo({
            id_persona,
            placa,
            vin: vin || null,
            marca: marca || null,
            modelo: modelo || null,
            anio: anio || null,
            color: color || null,
            numero_motor: numero_motor || null,
            numero_chasis: numero_chasis || null,
            tipo_combustible: tipo_combustible || null,
            observaciones: observaciones || null,
            estado: 'ACTIVO'
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Vehículo registrado correctamente',
            id_vehiculo: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar vehículo'
        });
    }
};

// ======================================================
// ACTUALIZAR VEHÍCULO
// PUT /api/vehiculos/:id
// body: { id_persona, placa, vin, marca, modelo, anio, color, numero_motor, numero_chasis, tipo_combustible, observaciones, estado }
// ======================================================
const actualizarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_persona,
            placa,
            vin,
            marca,
            modelo,
            anio,
            color,
            numero_motor,
            numero_chasis,
            tipo_combustible,
            observaciones,
            estado
        } = req.body;

        // Verificar existencia
        const vehiculo = await model.buscarVehiculoPorId(id);

        if (!vehiculo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Vehículo no encontrado'
            });
        }

        // Validaciones obligatorias
        if (!id_persona || !placa) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona y placa son obligatorias'
            });
        }

        // Verificar que la persona exista
        const persona = await modelPersonas.buscarPersonaPorId(id_persona);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona asociada no existe'
            });
        }

        // Verificar que la placa no choque con otro vehículo
        const existePlaca = await model.buscarVehiculoPorPlaca(placa);

        if (existePlaca && existePlaca.id_vehiculo != id) {
            return res.status(409).json({
                ok: false,
                mensaje: 'La placa ya está registrada en otro vehículo'
            });
        }

        await model.actualizarVehiculo(id, {
            id_persona,
            placa,
            vin: vin || null,
            marca: marca || null,
            modelo: modelo || null,
            anio: anio || null,
            color: color || null,
            numero_motor: numero_motor || null,
            numero_chasis: numero_chasis || null,
            tipo_combustible: tipo_combustible || null,
            observaciones: observaciones || null,
            estado: estado || vehiculo.estado
        });

        return res.json({
            ok: true,
            mensaje: 'Vehículo actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar vehículo'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// PATCH /api/vehiculos/:id/estado
// body: { estado: 'ACTIVO' | 'INACTIVO' }
// ======================================================
const cambiarEstadoVehiculo = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const vehiculo = await model.buscarVehiculoPorId(id);

        if (!vehiculo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Vehículo no encontrado'
            });
        }

        await model.cambiarEstadoVehiculo(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado del vehículo'
        });
    }
};

// ======================================================
// ELIMINAR VEHÍCULO (físico — falla si tiene citas/órdenes)
// DELETE /api/vehiculos/:id
// ======================================================
const eliminarVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        const vehiculo = await model.buscarVehiculoPorId(id);

        if (!vehiculo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Vehículo no encontrado'
            });
        }

        await model.eliminarVehiculo(id);

        return res.json({
            ok: true,
            mensaje: 'Vehículo eliminado correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: el vehículo tiene citas, cotizaciones u órdenes
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: el vehículo tiene registros asociados. Use cambiar estado a INACTIVO.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar vehículo'
        });
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