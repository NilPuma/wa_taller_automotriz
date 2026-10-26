const model = require('../models/modelCita');
const modelPersonas = require('../models/modelPersona');
const modelVehiculos = require('../models/modelVehiculo');

// ======================================================
// LISTAR CITAS (con filtros)
// GET /api/citas?idSucursal=1&estado=PENDIENTE&fecha=2026-10-14&idMecanico=1&busqueda=texto
// ======================================================
const listarCitas = async (req, res) => {
    try {
        const { idSucursal, idMecanico, estado, fecha, busqueda } = req.query;

        const citas = await model.listarCitas({
            idSucursal: idSucursal || null,
            idMecanico: idMecanico || null,
            estado: estado || null,
            fecha: fecha || null,
            busqueda: busqueda || null
        });

        return res.json({ ok: true, citas });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar citas'
        });
    }
};

// ======================================================
// LISTAR CITAS SIN ORDEN DE TRABAJO (para modal "Nueva Orden")
// GET /api/citas/sin-orden?idSucursal=1
// ======================================================
const listarCitasSinOrden = async (req, res) => {
    try {
        const { idSucursal } = req.query;

        const citas = await model.listarCitasSinOrden(idSucursal || null);

        return res.json({ ok: true, citas });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar citas sin orden'
        });
    }
};

// ======================================================
// LISTAR CITAS POR SUCURSAL
// GET /api/citas/sucursal/:idSucursal?estado=PENDIENTE
// ======================================================
const listarCitasPorSucursal = async (req, res) => {
    try {
        const { idSucursal } = req.params;
        const { estado } = req.query;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        const citas = await model.listarCitasPorSucursal(idSucursal, estado || null);

        return res.json({ ok: true, citas });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar citas por sucursal'
        });
    }
};

// ======================================================
// BUSCAR CITA POR ID
// GET /api/citas/:id
// ======================================================
const buscarCitaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de cita requerido'
            });
        }

        const cita = await model.buscarCitaPorId(id);

        if (!cita) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La cita no existe'
            });
        }

        return res.json({ ok: true, cita });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar cita'
        });
    }
};

// ======================================================
// REGISTRAR CITA
// POST /api/citas
// body: { id_persona, id_sucursal, id_vehiculo, fecha_cita, hora_cita, motivo }
// ======================================================
const registrarCita = async (req, res) => {
    try {
        const {
            id_persona,
            id_sucursal,
            id_vehiculo,
            fecha_cita,
            hora_cita,
            motivo
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona || !id_sucursal || !id_vehiculo || !fecha_cita || !hora_cita) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona, sucursal, vehículo, fecha y hora son obligatorios'
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

        // Verificar que el vehículo exista y pertenezca a la persona
        const vehiculo = await modelVehiculos.buscarVehiculoPorId(id_vehiculo);

        if (!vehiculo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El vehículo asociado no existe'
            });
        }

        if (vehiculo.id_persona != id_persona) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El vehículo no pertenece a la persona seleccionada'
            });
        }

        // Verificar choque de horario en la misma sucursal
        const existeHorario = await model.existeCitaEnHorario(
            id_sucursal,
            fecha_cita,
            hora_cita
        );

        if (existeHorario) {
            return res.status(409).json({
                ok: false,
                mensaje: 'Ya existe una cita en esa sucursal, fecha y hora'
            });
        }

        const resultado = await model.registrarCita({
            id_persona,
            id_sucursal,
            id_vehiculo,
            fecha_cita,
            hora_cita,
            motivo: motivo || null,
            estado: 'PENDIENTE'
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Cita registrada correctamente',
            id_cita: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar cita'
        });
    }
};

// ======================================================
// ACTUALIZAR CITA
// PUT /api/citas/:id
// body: { id_persona, id_sucursal, id_vehiculo, fecha_cita, hora_cita, motivo, estado }
// ======================================================
const actualizarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_persona,
            id_sucursal,
            id_vehiculo,
            fecha_cita,
            hora_cita,
            motivo,
            estado
        } = req.body;

        // Verificar existencia
        const cita = await model.buscarCitaPorId(id);

        if (!cita) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cita no encontrada'
            });
        }

        // Validaciones obligatorias
        if (!id_persona || !id_sucursal || !id_vehiculo || !fecha_cita || !hora_cita) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona, sucursal, vehículo, fecha y hora son obligatorios'
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

        // Verificar que el vehículo exista y pertenezca a la persona
        const vehiculo = await modelVehiculos.buscarVehiculoPorId(id_vehiculo);

        if (!vehiculo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El vehículo asociado no existe'
            });
        }

        if (vehiculo.id_persona != id_persona) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El vehículo no pertenece a la persona seleccionada'
            });
        }

        // Verificar choque de horario (excluyendo la cita actual)
        const existeHorario = await model.existeCitaEnHorario(
            id_sucursal,
            fecha_cita,
            hora_cita,
            id
        );

        if (existeHorario) {
            return res.status(409).json({
                ok: false,
                mensaje: 'Ya existe otra cita en esa sucursal, fecha y hora'
            });
        }

        await model.actualizarCita(id, {
            id_persona,
            id_sucursal,
            id_vehiculo,
            fecha_cita,
            hora_cita,
            motivo: motivo || null,
            estado: estado || cita.estado
        });

        return res.json({
            ok: true,
            mensaje: 'Cita actualizada correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar cita'
        });
    }
};

// ======================================================
// ACTUALIZAR ESTADO DE CITA
// PATCH /api/citas/:id/estado
// body: { estado: 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'ATENDIDA' }
// ======================================================
const actualizarEstadoCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const estadosValidos = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'ATENDIDA'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Estado inválido. Use: ' + estadosValidos.join(', ')
            });
        }

        const cita = await model.buscarCitaPorId(id);

        if (!cita) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cita no encontrada'
            });
        }

        await model.actualizarEstadoCita(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar estado de la cita'
        });
    }
};

// ======================================================
// ELIMINAR CITA (físico — falla si ya tiene orden de trabajo)
// DELETE /api/citas/:id
// ======================================================
const eliminarCita = async (req, res) => {
    try {
        const { id } = req.params;

        const cita = await model.buscarCitaPorId(id);

        if (!cita) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cita no encontrada'
            });
        }

        await model.eliminarCita(id);

        return res.json({
            ok: true,
            mensaje: 'Cita eliminada correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: ya existe una OT asociada
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: la cita ya tiene una orden de trabajo asociada. Use cambiar estado a CANCELADA.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar cita'
        });
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
    registrarCita,
    actualizarCita,
    actualizarEstadoCita,
    eliminarCita
};