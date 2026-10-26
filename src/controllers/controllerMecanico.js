const model = require('../models/modelMecanico');
const modelPersonas = require('../models/modelPersona');

// ======================================================
// LISTAR MECÁNICOS (con búsqueda y filtro por sucursal)
// GET /api/mecanicos?busqueda=texto&idSucursal=1
// ======================================================
const listarMecanicos = async (req, res) => {
    try {
        const { busqueda, idSucursal } = req.query;

        const mecanicos = await model.listarMecanicos(
            busqueda || null,
            idSucursal || null
        );

        return res.json({ ok: true, mecanicos });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar mecánicos'
        });
    }
};

// ======================================================
// LISTAR MECÁNICOS POR SUCURSAL
// GET /api/mecanicos/sucursal/:idSucursal
// ======================================================
const listarMecanicosPorSucursal = async (req, res) => {
    try {
        const { idSucursal } = req.params;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        const mecanicos = await model.listarMecanicosPorSucursal(idSucursal);

        return res.json({ ok: true, mecanicos });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar mecánicos por sucursal'
        });
    }
};

// ======================================================
// BUSCAR MECÁNICO POR ID
// GET /api/mecanicos/:id
// ======================================================
const buscarMecanicoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de mecánico requerido'
            });
        }

        const mecanico = await model.buscarMecanicoPorId(id);

        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El mecánico no existe'
            });
        }

        return res.json({ ok: true, mecanico });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar mecánico'
        });
    }
};

// ======================================================
// BUSCAR MECÁNICO POR PERSONA
// GET /api/mecanicos/persona/:idPersona
// ======================================================
const buscarMecanicoPorPersona = async (req, res) => {
    try {
        const { idPersona } = req.params;

        if (!idPersona) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de persona requerido'
            });
        }

        const mecanico = await model.buscarMecanicoPorPersona(idPersona);

        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona no tiene registro de mecánico'
            });
        }

        return res.json({ ok: true, mecanico });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar mecánico por persona'
        });
    }
};

// ======================================================
// REGISTRAR MECÁNICO
// POST /api/mecanicos
// body: { id_persona, especialidad, horario, id_sucursales: [] }
// ======================================================
const registrarMecanico = async (req, res) => {
    try {
        const {
            id_persona,
            especialidad,
            horario,
            id_sucursales = []
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La persona es obligatoria'
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

        // Verificar que la persona no sea ya mecánico
        const existeMecanico = await model.buscarMecanicoPorPersona(id_persona);

        if (existeMecanico) {
            return res.status(409).json({
                ok: false,
                mensaje: 'La persona ya está registrada como mecánico'
            });
        }

        const resultado = await model.registrarMecanico({
            id_persona,
            especialidad: especialidad || null,
            horario: horario || null,
            estado: 'ACTIVO'
        });

        const idMecanico = resultado.insertId;

        // Asignar sucursales si se enviaron
        if (Array.isArray(id_sucursales) && id_sucursales.length > 0) {
            await model.asignarSucursalesAMecanico(idMecanico, id_sucursales);
        }

        return res.status(201).json({
            ok: true,
            mensaje: 'Mecánico registrado correctamente',
            id_mecanico: idMecanico
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar mecánico'
        });
    }
};

// ======================================================
// ACTUALIZAR MECÁNICO
// PUT /api/mecanicos/:id
// body: { especialidad, horario, estado, id_sucursales: [] }
// ======================================================
const actualizarMecanico = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            especialidad,
            horario,
            estado,
            id_sucursales
        } = req.body;

        // Verificar existencia
        const mecanico = await model.buscarMecanicoPorId(id);

        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Mecánico no encontrado'
            });
        }

        await model.actualizarMecanico(id, {
            especialidad: especialidad || null,
            horario: horario || null,
            estado: estado || mecanico.estado
        });

        // Reemplazar sucursales si se enviaron
        if (Array.isArray(id_sucursales)) {
            await model.asignarSucursalesAMecanico(id, id_sucursales);
        }

        return res.json({
            ok: true,
            mensaje: 'Mecánico actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar mecánico'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// PATCH /api/mecanicos/:id/estado
// body: { estado: 'ACTIVO' | 'INACTIVO' }
// ======================================================
const cambiarEstadoMecanico = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const mecanico = await model.buscarMecanicoPorId(id);

        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Mecánico no encontrado'
            });
        }

        await model.cambiarEstadoMecanico(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado del mecánico'
        });
    }
};

// ======================================================
// ELIMINAR MECÁNICO (físico — falla si tiene OT o informes)
// DELETE /api/mecanicos/:id
// ======================================================
const eliminarMecanico = async (req, res) => {
    try {
        const { id } = req.params;

        const mecanico = await model.buscarMecanicoPorId(id);

        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Mecánico no encontrado'
            });
        }

        await model.eliminarMecanico(id);

        return res.json({
            ok: true,
            mensaje: 'Mecánico eliminado correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: tiene OT asignadas o informes
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: el mecánico tiene órdenes o informes asociados. Use cambiar estado a INACTIVO.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar mecánico'
        });
    }
};

// ======================================================
// LISTAR SUCURSALES DE UN MECÁNICO
// GET /api/mecanicos/:id/sucursales
// ======================================================
const listarSucursalesDeMecanico = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de mecánico requerido'
            });
        }

        const mecanico = await model.buscarMecanicoPorId(id);

        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Mecánico no encontrado'
            });
        }

        const sucursales = await model.listarSucursalesDeMecanico(id);

        return res.json({ ok: true, sucursales });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar sucursales del mecánico'
        });
    }
};

// ======================================================
// ASIGNAR SUCURSALES A UN MECÁNICO (reemplaza las existentes)
// PUT /api/mecanicos/:id/sucursales
// body: { id_sucursales: [1, 2] }
// ======================================================
const asignarSucursalesAMecanico = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursales } = req.body;

        if (!Array.isArray(id_sucursales)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe enviar un arreglo de sucursales'
            });
        }

        const mecanico = await model.buscarMecanicoPorId(id);

        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Mecánico no encontrado'
            });
        }

        await model.asignarSucursalesAMecanico(id, id_sucursales);

        return res.json({
            ok: true,
            mensaje: 'Sucursales asignadas correctamente',
            total: id_sucursales.length
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al asignar sucursales'
        });
    }
};

// ======================================================
// QUITAR UNA SUCURSAL A UN MECÁNICO
// DELETE /api/mecanicos/:id/sucursales/:idSucursal
// ======================================================
const quitarSucursalAMecanico = async (req, res) => {
    try {
        const { id, idSucursal } = req.params;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        await model.quitarSucursalAMecanico(id, idSucursal);

        return res.json({
            ok: true,
            mensaje: 'Sucursal removida correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al quitar sucursal'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    // Mecánicos
    listarMecanicos,
    listarMecanicosPorSucursal,
    buscarMecanicoPorId,
    buscarMecanicoPorPersona,
    registrarMecanico,
    actualizarMecanico,
    cambiarEstadoMecanico,
    eliminarMecanico,

    // Sucursales
    listarSucursalesDeMecanico,
    asignarSucursalesAMecanico,
    quitarSucursalAMecanico
};