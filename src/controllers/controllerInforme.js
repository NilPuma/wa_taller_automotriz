const model = require('../models/modelInforme');
const modelOrdenes = require('../models/modelOT');
const modelMecanicos = require('../models/modelMecanico');

const path = require('path');
const fs = require('fs');

// Ruta base de los archivos físicos (coincide con el destino de multer)
const RUTA_EVIDENCIAS = path.join(__dirname, '../../public/uploads/evidencias');

// ======================================================
// LISTAR INFORMES (con filtros)
// GET /api/informes?idMecanico=1&idSucursal=1&busqueda=texto
// ======================================================
const listarInformes = async (req, res) => {
    try {
        const { idMecanico, idSucursal, busqueda } = req.query;

        const informes = await model.listarInformes({
            idMecanico: idMecanico || null,
            idSucursal: idSucursal || null,
            busqueda: busqueda || null
        });

        return res.json({ ok: true, informes });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar informes'
        });
    }
};

// ======================================================
// BUSCAR INFORME POR ID (con evidencias)
// GET /api/informes/:id
// ======================================================
const buscarInformePorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de informe requerido'
            });
        }

        const informe = await model.buscarInformeConEvidencias(id);

        if (!informe) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El informe no existe'
            });
        }

        return res.json({ ok: true, informe });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar informe'
        });
    }
};

// ======================================================
// BUSCAR INFORME POR ORDEN DE TRABAJO (con evidencias)
// GET /api/informes/orden/:idOrden
// ======================================================
const buscarInformePorOrden = async (req, res) => {
    try {
        const { idOrden } = req.params;

        if (!idOrden) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de orden requerido'
            });
        }

        const informe = await model.buscarInformePorOrden(idOrden);

        if (!informe) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden no tiene informe registrado'
            });
        }

        return res.json({ ok: true, informe });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar informe por orden'
        });
    }
};

// ======================================================
// REGISTRAR INFORME (cabecera + evidencias opcionales)
// POST /api/informes
// multipart/form-data:
//   id_orden_trabajo, id_mecanico, titulo, observacion
//   evidencias[] (archivos)
// ======================================================
const registrarInforme = async (req, res) => {
    try {
        const { id_orden_trabajo, id_mecanico, titulo, observacion } = req.body;

        // Helper para limpiar archivos si falla la validación
        const limpiarArchivos = () => {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.unlink(f.path, () => {}));
            }
        };

        // Validaciones obligatorias
        if (!id_orden_trabajo || !id_mecanico) {
            limpiarArchivos();
            return res.status(400).json({
                ok: false,
                mensaje: 'Orden de trabajo y mecánico son obligatorios'
            });
        }

        // Verificar orden
        const orden = await modelOrdenes.buscarOrdenPorId(id_orden_trabajo);
        if (!orden) {
            limpiarArchivos();
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden de trabajo no existe'
            });
        }

        // Verificar mecánico
        const mecanico = await modelMecanicos.buscarMecanicoPorId(id_mecanico);
        if (!mecanico) {
            limpiarArchivos();
            return res.status(404).json({
                ok: false,
                mensaje: 'El mecánico no existe'
            });
        }

        // Verificar que la orden no tenga ya un informe
        const existeInforme = await model.buscarInformePorOrden(id_orden_trabajo);
        if (existeInforme) {
            limpiarArchivos();
            return res.status(409).json({
                ok: false,
                mensaje: 'La orden ya tiene un informe registrado'
            });
        }

        // Procesar evidencias (si vienen)
        const evidencias = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                evidencias.push({
                    url_archivo: `/uploads/evidencias/${file.filename}`,
                    descripcion: file.originalname,
                    fecha_registro: new Date().toISOString().split('T')[0]
                });
            });
        }

        const resultado = await model.registrarInforme({
            id_orden_trabajo,
            id_mecanico,
            titulo: titulo || null,
            observacion: observacion || null,
            evidencias
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Informe registrado correctamente',
            id_informe: resultado.id_informe,
            total_evidencias: evidencias.length
        });

    } catch (error) {
        console.error(error);

        // Limpiar archivos si falló algo después de multer
        if (req.files && req.files.length > 0) {
            req.files.forEach(f => fs.unlink(f.path, () => {}));
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar informe'
        });
    }
};

// ======================================================
// ACTUALIZAR INFORME (cabecera)
// PUT /api/informes/:id
// body: { titulo, observacion }
// ======================================================
const actualizarInforme = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, observacion } = req.body;

        const informe = await model.buscarInformePorId(id);

        if (!informe) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Informe no encontrado'
            });
        }

        await model.actualizarInforme(id, {
            titulo: titulo || null,
            observacion: observacion || null
        });

        return res.json({
            ok: true,
            mensaje: 'Informe actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar informe'
        });
    }
};

// ======================================================
// OBTENER O CREAR INFORME PARA UNA ORDEN
// POST /api/informes/orden/:idOrden
// body: { id_mecanico }
// ======================================================
const obtenerOCrearInforme = async (req, res) => {
    try {
        const { idOrden } = req.params;
        const { id_mecanico } = req.body;

        if (!id_mecanico) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El mecánico es obligatorio'
            });
        }

        const orden = await modelOrdenes.buscarOrdenPorId(idOrden);
        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden de trabajo no existe'
            });
        }

        const mecanico = await modelMecanicos.buscarMecanicoPorId(id_mecanico);
        if (!mecanico) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El mecánico no existe'
            });
        }

        const informe = await model.obtenerOCrearInformePorOrden(idOrden, id_mecanico);

        return res.json({ ok: true, informe });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener o crear informe'
        });
    }
};

// ======================================================
// AGREGAR EVIDENCIAS A UN INFORME (multipart)
// POST /api/informes/:id/evidencias
// multipart/form-data: evidencias[] (archivos)
// ======================================================
const agregarEvidencias = async (req, res) => {
    try {
        const { id } = req.params;

        // Limpiar archivos si algo falla
        const limpiarArchivos = () => {
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => fs.unlink(f.path, () => {}));
            }
        };

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe subir al menos una imagen'
            });
        }

        const informe = await model.buscarInformePorId(id);

        if (!informe) {
            limpiarArchivos();
            return res.status(404).json({
                ok: false,
                mensaje: 'Informe no encontrado'
            });
        }

        // Verificar límite total (20 evidencias por informe)
        const existentes = await model.listarEvidenciasPorInforme(id);
        const MAX_EVIDENCIAS = 20;

        if (existentes.length + req.files.length > MAX_EVIDENCIAS) {
            limpiarArchivos();
            return res.status(409).json({
                ok: false,
                mensaje: `Máximo ${MAX_EVIDENCIAS} evidencias por informe. Actualmente hay ${existentes.length}.`
            });
        }

        // Preparar evidencias
        const evidencias = req.files.map(file => ({
            url_archivo: `/uploads/evidencias/${file.filename}`,
            descripcion: file.originalname,
            fecha_registro: new Date().toISOString().split('T')[0]
        }));

        const nuevas = await model.agregarEvidencias(id, evidencias);

        return res.status(201).json({
            ok: true,
            mensaje: 'Evidencias agregadas correctamente',
            total: nuevas.length,
            evidencias: nuevas
        });

    } catch (error) {
        console.error(error);

        // Limpiar archivos si falló algo después de multer
        if (req.files && req.files.length > 0) {
            req.files.forEach(f => fs.unlink(f.path, () => {}));
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al agregar evidencias'
        });
    }
};

// ======================================================
// LISTAR EVIDENCIAS DE UN INFORME
// GET /api/informes/:id/evidencias
// ======================================================
const listarEvidencias = async (req, res) => {
    try {
        const { id } = req.params;

        const informe = await model.buscarInformePorId(id);

        if (!informe) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Informe no encontrado'
            });
        }

        const evidencias = await model.listarEvidenciasPorInforme(id);

        return res.json({ ok: true, evidencias });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar evidencias'
        });
    }
};

// ======================================================
// ELIMINAR EVIDENCIA (BD + archivo físico)
// DELETE /api/informes/evidencias/:id
// ======================================================
const eliminarEvidencia = async (req, res) => {
    try {
        const { id } = req.params;

        const evidencia = await model.buscarEvidenciaPorId(id);

        if (!evidencia) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Evidencia no encontrada'
            });
        }

        // 1) Eliminar de la BD
        await model.eliminarEvidencia(id);

        // 2) Eliminar archivo físico
        if (evidencia.url_archivo) {
            const nombreArchivo = path.basename(evidencia.url_archivo);
            const archivoFisico = path.join(RUTA_EVIDENCIAS, nombreArchivo);

            fs.unlink(archivoFisico, (error) => {
                if (error && error.code !== 'ENOENT') {
                    console.error('No se pudo eliminar archivo físico:', error.message);
                }
            });
        }

        return res.json({
            ok: true,
            mensaje: 'Evidencia eliminada correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar evidencia'
        });
    }
};

// ======================================================
// ELIMINAR INFORME (transacción: evidencias + cabecera + archivos)
// DELETE /api/informes/:id
// ======================================================
const eliminarInforme = async (req, res) => {
    try {
        const { id } = req.params;

        const informe = await model.buscarInformeConEvidencias(id);

        if (!informe) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Informe no encontrado'
            });
        }

        // 1) Eliminar de la BD (transacción: evidencias + cabecera)
        await model.eliminarInforme(id);

        // 2) Eliminar archivos físicos
        if (informe.evidencias && informe.evidencias.length > 0) {
            informe.evidencias.forEach(ev => {
                if (ev.url_archivo) {
                    const nombreArchivo = path.basename(ev.url_archivo);
                    const archivoFisico = path.join(RUTA_EVIDENCIAS, nombreArchivo);
                    fs.unlink(archivoFisico, (error) => {
                        if (error && error.code !== 'ENOENT') {
                            console.error('No se pudo eliminar archivo:', error.message);
                        }
                    });
                }
            });
        }

        return res.json({
            ok: true,
            mensaje: 'Informe eliminado correctamente'
        });

    } catch (error) {
        console.error(error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: el informe tiene registros asociados.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar informe'
        });
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
    registrarInforme,
    actualizarInforme,
    obtenerOCrearInforme,
    eliminarInforme,

    // Evidencias
    agregarEvidencias,
    listarEvidencias,
    eliminarEvidencia
};