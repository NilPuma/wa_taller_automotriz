const model = require('../models/modelOT');
const modelPersonas = require('../models/modelPersona');
const modelVehiculos = require('../models/modelVehiculo');
const modelMecanicos = require('../models/modelMecanico');
const modelProductos = require('../models/modelProducto');
const modelServicios = require('../models/modelServicio');
const modelSucursales = require('../models/modelSucursal');

// ======================================================
// REGLAS DE NEGOCIO: TRANSICIONES DE ESTADO
// ======================================================
// FINALIZADA y CANCELADA son estados TERMINALES:
// no se puede volver a activar la orden.
const TRANSICIONES_ESTADO = {
    'PENDIENTE':  ['EN PROCESO', 'CANCELADA'],
    'EN PROCESO': ['FINALIZADA', 'CANCELADA'],
    'FINALIZADA': [],
    'CANCELADA':  []
};

const ESTADOS_TERMINALES = ['FINALIZADA', 'CANCELADA'];

const esEstadoTerminal = (estado) => ESTADOS_TERMINALES.includes(estado);

// ======================================================
// LISTAR ÓRDENES (con filtros)
// GET /api/ordenes?idSucursal=1&idMecanico=1&estado=PENDIENTE&busqueda=texto
// ======================================================
const listarOrdenes = async (req, res) => {
    try {
        const { idSucursal, idMecanico, estado, busqueda } = req.query;

        const ordenes = await model.listarOrdenes({
            idSucursal: idSucursal || null,
            idMecanico: idMecanico || null,
            estado: estado || null,
            busqueda: busqueda || null
        });

        return res.json({ ok: true, ordenes });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar órdenes de trabajo'
        });
    }
};

// ======================================================
// LISTAR ÓRDENES POR MECÁNICO (dashboard del mecánico)
// GET /api/ordenes/mecanico/:idMecanico?estado=PENDIENTE
// ======================================================
const listarOrdenesPorMecanico = async (req, res) => {
    try {
        const { idMecanico } = req.params;
        const { estado } = req.query;

        if (!idMecanico) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de mecánico requerido'
            });
        }

        const ordenes = await model.listarOrdenesPorMecanico(
            idMecanico,
            estado || null
        );

        return res.json({ ok: true, ordenes });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar órdenes por mecánico'
        });
    }
};

// ======================================================
// BUSCAR ORDEN POR ID (cabecera)
// GET /api/ordenes/:id
// ======================================================
const buscarOrdenPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de orden requerido'
            });
        }

        const orden = await model.buscarOrdenPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden no existe'
            });
        }

        return res.json({ ok: true, orden });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar orden'
        });
    }
};

// ======================================================
// BUSCAR ORDEN CON DETALLE COMPLETO (cabecera + detalles + mecánicos)
// GET /api/ordenes/:id/detalle
// ======================================================
const buscarOrdenConDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de orden requerido'
            });
        }

        const orden = await model.buscarOrdenConDetalle(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden no existe'
            });
        }

        return res.json({ ok: true, orden });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar orden con detalle'
        });
    }
};

// ======================================================
// REGISTRAR ORDEN (cabecera + detalles + mecánicos + stock, transacción)
// POST /api/ordenes
// body: { id_cita, id_cotizacion, id_persona, id_sucursal, id_vehiculo,
//         observacion, fecha_atencion, ids_mecanicos: [], items: [] }
// ======================================================
const registrarOrden = async (req, res) => {
    try {
        const {
            id_cita,
            id_cotizacion,
            id_persona,
            id_sucursal,
            id_vehiculo,
            observacion,
            fecha_atencion,
            ids_mecanicos = [],
            items = []
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona || !id_sucursal || !id_vehiculo) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona, sucursal y vehículo son obligatorios'
            });
        }

        // Verificar persona
        const persona = await modelPersonas.buscarPersonaPorId(id_persona);
        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona asociada no existe'
            });
        }

        // Verificar vehículo y pertenencia
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

        // Verificar sucursal
        const sucursal = await modelSucursales.buscarSucursalPorId(id_sucursal);
        if (!sucursal) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La sucursal no existe'
            });
        }

        // Verificar que la cotización no haya sido usada en otra OT
        if (id_cotizacion) {
            const yaUsada = await model.cotizacionYaUsada(id_cotizacion);
            if (yaUsada) {
                return res.status(409).json({
                    ok: false,
                    mensaje: 'La cotización ya fue usada en otra orden de trabajo.'
                });
            }
        }

        // Validar mecánicos
        const mecanicosValidados = [];
        if (Array.isArray(ids_mecanicos) && ids_mecanicos.length > 0) {
            for (const idMec of ids_mecanicos) {
                const mecanico = await modelMecanicos.buscarMecanicoPorId(idMec);
                if (!mecanico) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: `El mecánico ${idMec} no existe`
                    });
                }
                mecanicosValidados.push(idMec);
            }
        }

        // Validar items (XOR producto/servicio + stock)
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

            if (tieneProducto) {
                const producto = await modelProductos.buscarProductoPorId(it.id_producto);
                if (!producto) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: `El producto ${it.id_producto} no existe`
                    });
                }

                // Validar stock antes de la transacción
                const stock = await modelProductos.obtenerStock(id_sucursal, it.id_producto);
                if (stock < Number(it.cantidad)) {
                    return res.status(409).json({
                        ok: false,
                        mensaje: `Stock insuficiente para producto ${it.id_producto}. Disponible: ${stock}`
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

        const resultado = await model.registrarOrden({
            id_cita: id_cita || null,
            id_cotizacion: id_cotizacion || null,
            id_persona,
            id_sucursal,
            id_vehiculo,
            observacion: observacion || null,
            fecha_atencion: fecha_atencion || null,
            estado: 'PENDIENTE',
            ids_mecanicos: mecanicosValidados,
            items: itemsValidados
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Orden de trabajo registrada correctamente',
            id_orden_trabajo: resultado.id_orden_trabajo
        });

    } catch (error) {
        console.error(error);

        // Constraint UNIQUE: la cotización ya fue usada (condición de carrera)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                ok: false,
                mensaje: 'La cotización ya fue usada en otra orden de trabajo.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar orden de trabajo'
        });
    }
};

// ======================================================
// ACTUALIZAR ORDEN (cabecera)
// PUT /api/ordenes/:id
// body: { observacion, fecha_atencion, estado }
// ======================================================
const actualizarOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { observacion, fecha_atencion, estado } = req.body;

        const orden = await model.buscarOrdenPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Orden no encontrada'
            });
        }

        // Regla de negocio: no editar cabecera de una OT terminal
        if (esEstadoTerminal(orden.estado)) {
            return res.status(409).json({
                ok: false,
                mensaje: `No se puede modificar una orden en estado ${orden.estado}.`
            });
        }

        // Si se envía un estado nuevo, debe respetar las transiciones permitidas
        if (estado && estado !== orden.estado) {
            const permitidos = TRANSICIONES_ESTADO[orden.estado] || [];
            if (!permitidos.includes(estado)) {
                return res.status(409).json({
                    ok: false,
                    mensaje: `Transición no permitida: ${orden.estado} → ${estado}.`
                });
            }
        }

        await model.actualizarOrden(id, {
            observacion: observacion || null,
            fecha_atencion: fecha_atencion || null,
            estado: estado || orden.estado
        });

        return res.json({
            ok: true,
            mensaje: 'Orden actualizada correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar orden'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO DE LA ORDEN
// PATCH /api/ordenes/:id/estado
// body: { estado: 'PENDIENTE' | 'EN PROCESO' | 'FINALIZADA' | 'CANCELADA' }
// ======================================================
const cambiarEstadoOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const estadosValidos = ['PENDIENTE', 'EN PROCESO', 'FINALIZADA', 'CANCELADA'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Estado inválido. Use: ' + estadosValidos.join(', ')
            });
        }

        const orden = await model.buscarOrdenPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Orden no encontrada'
            });
        }

        // Sin cambios: idempotente
        if (orden.estado === estado) {
            return res.status(400).json({
                ok: false,
                mensaje: `La orden ya se encuentra en estado ${estado}.`
            });
        }

        // Regla de negocio: transiciones permitidas
        const permitidos = TRANSICIONES_ESTADO[orden.estado] || [];
        if (!permitidos.includes(estado)) {
            return res.status(409).json({
                ok: false,
                mensaje: `Transición no permitida: ${orden.estado} → ${estado}.`
            });
        }

        await model.cambiarEstadoOrden(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado de la orden'
        });
    }
};

// ======================================================
// REEMPLAZAR DETALLES
// (revierte stock anterior + inserta nuevos + descuenta nuevo stock)
// PUT /api/ordenes/:id/detalles
// body: { id_sucursal, items: [...] }
// ======================================================
const reemplazarDetallesOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursal, items } = req.body;

        const orden = await model.buscarOrdenPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Orden no encontrada'
            });
        }

        // Regla de negocio: no tocar repuestos de una OT terminal
        // (evita doble descuento/devolución de stock)
        if (esEstadoTerminal(orden.estado)) {
            return res.status(409).json({
                ok: false,
                mensaje: `No se pueden modificar los repuestos de una orden en estado ${orden.estado}.`
            });
        }

        const idSucursal = id_sucursal || orden.id_sucursal;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe enviar al menos un item'
            });
        }

        // Validar items (XOR + existencia)
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

            if (tieneProducto) {
                const producto = await modelProductos.buscarProductoPorId(it.id_producto);
                if (!producto) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: `El producto ${it.id_producto} no existe`
                    });
                }
            } else {
                const servicio = await modelServicios.buscarServicioPorId(it.id_servicio);
                if (!servicio) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: `El servicio ${it.id_servicio} no existe`
                    });
                }
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

        await model.reemplazarDetallesOrden(id, idSucursal, itemsValidados);

        return res.json({
            ok: true,
            mensaje: 'Detalles actualizados correctamente'
        });

    } catch (error) {
        console.error(error);

        if (error.message && error.message.includes('Stock insuficiente')) {
            return res.status(409).json({
                ok: false,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al reemplazar detalles de la orden'
        });
    }
};

// ======================================================
// ASIGNAR MECÁNICOS A LA ORDEN (reemplaza los existentes)
// PUT /api/ordenes/:id/mecanicos
// body: { ids_mecanicos: [1, 2] }
// ======================================================
const asignarMecanicosAOrden = async (req, res) => {
    try {
        const { id } = req.params;
        const { ids_mecanicos } = req.body;

        if (!Array.isArray(ids_mecanicos)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe enviar un arreglo de mecánicos'
            });
        }

        const orden = await model.buscarOrdenPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Orden no encontrada'
            });
        }

        // Regla de negocio: no reasignar mecánicos en una OT terminal
        if (esEstadoTerminal(orden.estado)) {
            return res.status(409).json({
                ok: false,
                mensaje: `No se pueden reasignar mecánicos en una orden en estado ${orden.estado}.`
            });
        }

        // Validar que los mecánicos existan
        for (const idMec of ids_mecanicos) {
            const mecanico = await modelMecanicos.buscarMecanicoPorId(idMec);
            if (!mecanico) {
                return res.status(404).json({
                    ok: false,
                    mensaje: `El mecánico ${idMec} no existe`
                });
            }
        }

        await model.asignarMecanicosAOrden(id, ids_mecanicos);

        return res.json({
            ok: true,
            mensaje: 'Mecánicos asignados correctamente',
            total: ids_mecanicos.length
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al asignar mecánicos a la orden'
        });
    }
};

// ======================================================
// ELIMINAR ORDEN (revierte stock + borra detalles + mecánicos + cabecera)
// DELETE /api/ordenes/:id
// ======================================================
const eliminarOrden = async (req, res) => {
    try {
        const { id } = req.params;

        const orden = await model.buscarOrdenPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Orden no encontrada'
            });
        }

        // Regla de negocio: no eliminar una OT finalizada (rompería historial)
        if (orden.estado === 'FINALIZADA') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar una orden FINALIZADA. Use CANCELADA si aplica.'
            });
        }

        await model.eliminarOrden(id);

        return res.json({
            ok: true,
            mensaje: 'Orden eliminada correctamente'
        });

    } catch (error) {
        console.error(error);

        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: la orden tiene comprobantes o informes asociados.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar orden'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarOrdenes,
    listarOrdenesPorMecanico,
    buscarOrdenPorId,
    buscarOrdenConDetalle,
    registrarOrden,
    actualizarOrden,
    cambiarEstadoOrden,
    reemplazarDetallesOrden,
    asignarMecanicosAOrden,
    eliminarOrden
};