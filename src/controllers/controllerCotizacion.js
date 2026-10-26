const model = require('../models/modelCotizacion');
const modelPersonas = require('../models/modelPersona');
const modelVehiculos = require('../models/modelVehiculo');
const modelProductos = require('../models/modelProducto');
const modelServicios = require('../models/modelServicio');

// ======================================================
// LISTAR COTIZACIONES (con filtros)
// GET /api/cotizaciones?idSucursal=1&estado=PENDIENTE&idPersona=4&busqueda=texto
// ======================================================
const listarCotizaciones = async (req, res) => {
    try {
        const { idSucursal, estado, idPersona, busqueda } = req.query;

        const cotizaciones = await model.listarCotizaciones({
            idSucursal: idSucursal || null,
            estado: estado || null,
            idPersona: idPersona || null,
            busqueda: busqueda || null
        });

        return res.json({ ok: true, cotizaciones });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar cotizaciones'
        });
    }
};

// ======================================================
// BUSCAR COTIZACIÓN POR ID (cabecera)
// GET /api/cotizaciones/:id
// ======================================================
const buscarCotizacionPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de cotización requerido'
            });
        }

        const cotizacion = await model.buscarCotizacionPorId(id);

        if (!cotizacion) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La cotización no existe'
            });
        }

        return res.json({ ok: true, cotizacion });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar cotización'
        });
    }
};

// ======================================================
// BUSCAR COTIZACIÓN CON DETALLE (cabecera + items)
// GET /api/cotizaciones/:id/detalle
// ======================================================
const buscarCotizacionConDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de cotización requerido'
            });
        }

        const cotizacion = await model.buscarCotizacionConDetalle(id);

        if (!cotizacion) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La cotización no existe'
            });
        }

        return res.json({ ok: true, cotizacion });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar cotización con detalle'
        });
    }
};

// ======================================================
// REGISTRAR COTIZACIÓN (cabecera + detalles, transacción)
// POST /api/cotizaciones
// body: { id_persona, id_sucursal, id_vehiculo, observacion, validez, fecha_cotizacion, items: [...] }
// ======================================================
const registrarCotizacion = async (req, res) => {
    try {
        const {
            id_persona,
            id_sucursal,
            id_vehiculo,
            observacion,
            validez,
            fecha_cotizacion,
            items
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona || !id_sucursal || !id_vehiculo || !fecha_cotizacion) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona, sucursal, vehículo y fecha son obligatorios'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La cotización debe tener al menos un item'
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

        // Validar items (XOR producto/servicio + coherencia)
        const itemsValidados = [];
        for (const it of items) {
            if (!it.cantidad || Number(it.cantidad) <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada item debe tener cantidad mayor a 0'
                });
            }

            const tieneProducto = it.id_producto !== undefined && it.id_producto !== null;
            const tieneServicio = it.id_servicio !== undefined && it.id_servicio !== null;

            if (tieneProducto === tieneServicio) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada item debe tener producto O servicio, no ambos'
                });
            }

            // Validar precio unitario obligatorio
            if (it.precio_unitario === undefined || it.precio_unitario === null) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El precio unitario es obligatorio'
                });
            }

            if (tieneProducto) {
                const producto = await modelProductos.buscarProductoPorId(it.id_producto);
                if (!producto) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: `El producto ${it.id_producto} no existe`
                    });
                }
                itemsValidados.push({
                    id_producto: it.id_producto,
                    id_servicio: null,
                    cantidad: Number(it.cantidad),
                    precio_unitario: Number(it.precio_unitario),
                    subtotal: Number(it.precio_unitario) * Number(it.cantidad),
                    observacion: it.observacion || null
                });
            } else {
                const servicio = await modelServicios.buscarServicioPorId(it.id_servicio);
                if (!servicio) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: `El servicio ${it.id_servicio} no existe`
                    });
                }
                itemsValidados.push({
                    id_producto: null,
                    id_servicio: it.id_servicio,
                    cantidad: Number(it.cantidad),
                    precio_unitario: Number(it.precio_unitario),
                    subtotal: Number(it.precio_unitario) * Number(it.cantidad),
                    observacion: it.observacion || null
                });
            }
        }

        const resultado = await model.registrarCotizacion({
            id_persona,
            id_sucursal,
            id_vehiculo,
            observacion: observacion || null,
            estado: 'PENDIENTE',
            validez: validez || null,
            fecha_cotizacion,
            items: itemsValidados
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Cotización registrada correctamente',
            id_cotizacion: resultado.id_cotizacion,
            monto_cotizacion: resultado.monto_cotizacion
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar cotización'
        });
    }
};

// ======================================================
// ACTUALIZAR COTIZACIÓN (cabecera)
// PUT /api/cotizaciones/:id
// body: { observacion, estado, validez, fecha_cotizacion }
// ======================================================
const actualizarCotizacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { observacion, estado, validez, fecha_cotizacion } = req.body;

        // Verificar existencia
        const cotizacion = await model.buscarCotizacionPorId(id);

        if (!cotizacion) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cotización no encontrada'
            });
        }

        if (!fecha_cotizacion) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La fecha de cotización es obligatoria'
            });
        }

        await model.actualizarCotizacion(id, {
            observacion: observacion || null,
            estado: estado || cotizacion.estado,
            validez: validez || null,
            fecha_cotizacion
        });

        return res.json({
            ok: true,
            mensaje: 'Cotización actualizada correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar cotización'
        });
    }
};

// ======================================================
// REEMPLAZAR DETALLES (transacción: borra + inserta + recalcula monto)
// PUT /api/cotizaciones/:id/detalles
// body: { items: [...] }
// ======================================================
const reemplazarDetallesCotizacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { items } = req.body;

        const cotizacion = await model.buscarCotizacionPorId(id);

        if (!cotizacion) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cotización no encontrada'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe enviar al menos un item'
            });
        }

        // Validar items (XOR + coherencia)
        const itemsValidados = [];
        for (const it of items) {
            if (!it.cantidad || Number(it.cantidad) <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada item debe tener cantidad mayor a 0'
                });
            }

            const tieneProducto = it.id_producto !== undefined && it.id_producto !== null;
            const tieneServicio = it.id_servicio !== undefined && it.id_servicio !== null;

            if (tieneProducto === tieneServicio) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada item debe tener producto O servicio, no ambos'
                });
            }

            // Validar precio unitario obligatorio
            if (it.precio_unitario === undefined || it.precio_unitario === null) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El precio unitario es obligatorio'
                });
            }

            itemsValidados.push({
                id_producto: tieneProducto ? it.id_producto : null,
                id_servicio: tieneServicio ? it.id_servicio : null,
                cantidad: Number(it.cantidad),
                precio_unitario: Number(it.precio_unitario),
                subtotal: Number(it.precio_unitario) * Number(it.cantidad),
                observacion: it.observacion || null
            });
        }

        const resultado = await model.reemplazarDetallesCotizacion(id, itemsValidados);

        return res.json({
            ok: true,
            mensaje: 'Detalles actualizados correctamente',
            monto_cotizacion: resultado.monto_cotizacion
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al reemplazar detalles de cotización'
        });
    }
};

// ======================================================
// ACTUALIZAR ESTADO DE COTIZACIÓN
// PATCH /api/cotizaciones/:id/estado
// body: { estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' }
// ======================================================
const actualizarEstadoCotizacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const estadosValidos = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Estado inválido. Use: ' + estadosValidos.join(', ')
            });
        }

        const cotizacion = await model.buscarCotizacionPorId(id);

        if (!cotizacion) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cotización no encontrada'
            });
        }

        await model.actualizarEstadoCotizacion(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar estado de la cotización'
        });
    }
};

// ======================================================
// ELIMINAR COTIZACIÓN (transacción: borra detalles + cabecera)
// DELETE /api/cotizaciones/:id
// ======================================================
const eliminarCotizacion = async (req, res) => {
    try {
        const { id } = req.params;

        const cotizacion = await model.buscarCotizacionPorId(id);

        if (!cotizacion) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cotización no encontrada'
            });
        }

        await model.eliminarCotizacion(id);

        return res.json({
            ok: true,
            mensaje: 'Cotización eliminada correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: ya tiene OT asociada
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: la cotización tiene una orden de trabajo asociada.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar cotización'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarCotizaciones,
    buscarCotizacionPorId,
    buscarCotizacionConDetalle,
    registrarCotizacion,
    actualizarCotizacion,
    reemplazarDetallesCotizacion,
    actualizarEstadoCotizacion,
    eliminarCotizacion
};