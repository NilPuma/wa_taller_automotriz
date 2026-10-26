const model = require('../models/modelPersona');

// ======================================================
// LISTAR PERSONAS (con búsqueda opcional)
// GET /api/personas?busqueda=texto
// ======================================================
const listarPersonas = async (req, res) => {
    try {
        const { busqueda } = req.query;

        const personas = await model.listarPersonas(busqueda || null);

        return res.json({ ok: true, personas });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar personas'
        });
    }
};

// ======================================================
// LISTAR PERSONAS POR ROL
// GET /api/personas/rol/:idRol
// ======================================================
const listarPersonasPorRol = async (req, res) => {
    try {
        const { idRol } = req.params;

        if (!idRol) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de rol requerido'
            });
        }

        const personas = await model.listarPersonasPorRol(idRol);

        return res.json({ ok: true, personas });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar personas por rol'
        });
    }
};

// ======================================================
// BUSCAR PERSONA POR ID
// GET /api/personas/:id
// ======================================================
const buscarPersonaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de persona requerido'
            });
        }

        const persona = await model.buscarPersonaPorId(id);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona no existe'
            });
        }

        return res.json({ ok: true, persona });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar persona'
        });
    }
};

// ======================================================
// BUSCAR PERSONA POR DOCUMENTO
// GET /api/personas/documento/:tipoDocumento/:documento
// ======================================================
const buscarPersonaPorDocumento = async (req, res) => {
    try {
        const { tipoDocumento, documento } = req.params;

        if (!tipoDocumento || !documento) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Tipo de documento y número son obligatorios'
            });
        }

        const persona = await model.buscarPersonaPorDocumento(tipoDocumento, documento);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona no existe'
            });
        }

        return res.json({ ok: true, persona });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar persona por documento'
        });
    }
};

// ======================================================
// REGISTRAR PERSONA
// POST /api/personas
// body: { tipo_persona, tipo_documento, documento, nombres, apellidos, correo, direccion, telefono }
// ======================================================
const registrarPersona = async (req, res) => {
    try {
        const {
            tipo_persona,
            tipo_documento,
            documento,
            nombres,
            apellidos,
            correo,
            direccion,
            telefono
        } = req.body;

        // Validaciones obligatorias
        if (!tipo_documento || !documento || !nombres) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Tipo de documento, documento y nombres son obligatorios'
            });
        }

        // Verificar duplicado por documento
        const existe = await model.buscarPersonaPorDocumento(tipo_documento, documento);

        if (existe) {
            return res.status(409).json({
                ok: false,
                mensaje: 'Ya existe una persona con ese documento'
            });
        }

        const resultado = await model.registrarPersona({
            tipo_persona: tipo_persona || 'NATURAL',
            tipo_documento,
            documento,
            nombres,
            apellidos: apellidos || null,
            correo: correo || null,
            direccion: direccion || null,
            telefono: telefono || null,
            estado: 'ACTIVO'
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Persona registrada correctamente',
            id_persona: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar persona'
        });
    }
};

// ======================================================
// ACTUALIZAR PERSONA
// PUT /api/personas/:id
// body: { tipo_persona, tipo_documento, documento, nombres, apellidos, correo, direccion, telefono, estado }
// ======================================================
const actualizarPersona = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tipo_persona,
            tipo_documento,
            documento,
            nombres,
            apellidos,
            correo,
            direccion,
            telefono,
            estado
        } = req.body;

        // Verificar existencia
        const persona = await model.buscarPersonaPorId(id);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Persona no encontrada'
            });
        }

        // Validaciones obligatorias
        if (!tipo_documento || !documento || !nombres) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Tipo de documento, documento y nombres son obligatorios'
            });
        }

        // Verificar que el documento no choque con otra persona
        const existeDocumento = await model.buscarPersonaPorDocumento(tipo_documento, documento);

        if (existeDocumento && existeDocumento.id_persona != id) {
            return res.status(409).json({
                ok: false,
                mensaje: 'El documento ya está registrado en otra persona'
            });
        }

        await model.actualizarPersona(id, {
            tipo_persona: tipo_persona || persona.tipo_persona,
            tipo_documento,
            documento,
            nombres,
            apellidos: apellidos || null,
            correo: correo || null,
            direccion: direccion || null,
            telefono: telefono || null,
            estado: estado || persona.estado
        });

        return res.json({
            ok: true,
            mensaje: 'Persona actualizada correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar persona'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// PATCH /api/personas/:id/estado
// body: { estado: 'ACTIVO' | 'INACTIVO' }
// ======================================================
const cambiarEstadoPersona = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const persona = await model.buscarPersonaPorId(id);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Persona no encontrada'
            });
        }

        await model.cambiarEstadoPersona(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado de la persona'
        });
    }
};

// ======================================================
// ELIMINAR PERSONA (físico — falla si tiene dependencias)
// DELETE /api/personas/:id
// ======================================================
const eliminarPersona = async (req, res) => {
    try {
        const { id } = req.params;

        const persona = await model.buscarPersonaPorId(id);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Persona no encontrada'
            });
        }

        await model.eliminarPersona(id);

        return res.json({
            ok: true,
            mensaje: 'Persona eliminada correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: la persona tiene vehículos, usuarios, citas, etc.
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: la persona tiene registros asociados. Use cambiar estado a INACTIVO.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar persona'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarPersonas,
    listarPersonasPorRol,
    buscarPersonaPorId,
    buscarPersonaPorDocumento,
    registrarPersona,
    actualizarPersona,
    cambiarEstadoPersona,
    eliminarPersona
};