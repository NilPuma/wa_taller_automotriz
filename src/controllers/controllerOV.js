const model = require('../models/modelOV');
const modelPersonas = require('../models/modelPersona');
const modelProductos = require('../models/modelProducto');
const modelSucursales = require('../models/modelSucursal');

// ======================================================
// LISTAR ÓRDENES DE VENTA (con filtros)
// GET /api/ventas?idSucursal=1&estado=PAGADA&idPersona=5&busqueda=texto
// ======================================================
const listarOrdenesVenta = async (req, res) => {
    try {
        const { idSucursal, estado, idPersona, busqueda } = req.query;

        const ordenes = await model.listarOrdenesVenta({
            idSucursal: idSucursal || null,
            estado: estado || null,
            idPersona: idPersona || null,
            busqueda: busqueda || null
        });

        return res.json({ ok: true, ordenes });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar órdenes de venta'
        });
    }
};

// ======================================================
// LISTAR VENTAS POR PERSONA (historial del cliente)
// GET /api/ventas/persona/:idPersona
// ======================================================
const listarVentasPorPersona = async (req, res) => {
    try {
        const { idPersona } = req.params;

        if (!idPersona) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de persona requerido'
            });
        }

        const persona = await modelPersonas.buscarPersonaPorId(idPersona);

        if (!persona) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La persona no existe'
            });
        }

        const ordenes = await model.listarOrdenesVenta({ idPersona });

        return res.json({ ok: true, ordenes });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar ventas de la persona'
        });
    }
};

// ======================================================
// BUSCAR ORDEN DE VENTA POR ID (cabecera)
// GET /api/ventas/:id
// ======================================================
const buscarOrdenVentaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de orden de venta requerido'
            });
        }

        const orden = await model.buscarOrdenVentaPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden de venta no existe'
            });
        }

        return res.json({ ok: true, orden });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar orden de venta'
        });
    }
};

// ======================================================
// BUSCAR ORDEN DE VENTA CON DETALLE
// GET /api/ventas/:id/detalle
// ======================================================
const buscarOrdenVentaConDetalle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de orden de venta requerido'
            });
        }

        const orden = await model.buscarOrdenVentaConDetalle(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden de venta no existe'
            });
        }

        return res.json({ ok: true, orden });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar orden de venta con detalle'
        });
    }
};

// ======================================================
// REGISTRAR VENTA (cabecera + detalles + descuento stock, transacción)
// POST /api/ventas
// body: { id_persona, id_sucursal, observacion, descuento, fecha_atencion, items: [] }
// ======================================================
const registrarVenta = async (req, res) => {
    try {
        const {
            id_persona,
            id_sucursal,
            observacion,
            descuento,
            fecha_atencion,
            items
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona || !id_sucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona y sucursal son obligatorias'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La venta debe tener al menos un producto'
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

        // Verificar sucursal
        const sucursal = await modelSucursales.buscarSucursalPorId(id_sucursal);
        if (!sucursal) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La sucursal no existe'
            });
        }

        // Validar items (solo productos + stock)
        const itemsValidados = [];
        for (const it of items) {
            if (!it.id_producto) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada item debe tener un producto'
                });
            }

            if (!it.cantidad || Number(it.cantidad) <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada item debe tener cantidad mayor a 0'
                });
            }

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
                cantidad: Number(it.cantidad),
                precio_unitario: Number(it.precio_unitario),
                subtotal: Number(it.precio_unitario) * Number(it.cantidad),
                observacion: it.observacion || null
            });
        }

        const resultado = await model.registrarOrdenVenta({
            id_persona,
            id_sucursal,
            observacion: observacion || null,
            descuento: Number(descuento) || 0,
            fecha_atencion: fecha_atencion || null,
            estado: 'PENDIENTE',
            items: itemsValidados
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Venta registrada correctamente',
            id_orden_venta: resultado.id_orden_venta,
            monto_orden_venta: resultado.monto_orden_venta
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar venta'
        });
    }
};

// ======================================================
// ACTUALIZAR ESTADO DE ORDEN DE VENTA
// PATCH /api/ventas/:id/estado
// body: { estado: 'PENDIENTE' | 'PAGADA' | 'ANULADA' }
// ======================================================
const actualizarEstadoOrdenVenta = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const estadosValidos = ['PENDIENTE', 'PAGADA', 'ANULADA'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Estado inválido. Use: ' + estadosValidos.join(', ')
            });
        }

        const orden = await model.buscarOrdenVentaPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Orden de venta no encontrada'
            });
        }

        await model.actualizarEstadoOrdenVenta(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar estado de la venta'
        });
    }
};

// ======================================================
// ELIMINAR ORDEN DE VENTA (revierte stock + borra detalles + cabecera)
// DELETE /api/ventas/:id
// ======================================================
const eliminarOrdenVenta = async (req, res) => {
    try {
        const { id } = req.params;

        const orden = await model.buscarOrdenVentaPorId(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Orden de venta no encontrada'
            });
        }

        await model.eliminarOrdenVenta(id);

        return res.json({
            ok: true,
            mensaje: 'Orden de venta eliminada correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: ya tiene comprobante asociado
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: la orden tiene un comprobante asociado. Use cambiar estado a ANULADA.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar orden de venta'
        });
    }
};

// ======================================================
// LISTAR COMPROBANTES (con filtros)
// GET /api/comprobantes?idSucursal=1&tipo=BOLETA&estado=EMITIDO&idPersona=4&busqueda=texto
// ======================================================
const listarComprobantes = async (req, res) => {
    try {
        const { idSucursal, tipo, estado, idPersona, busqueda } = req.query;

        const comprobantes = await model.listarComprobantes({
            idSucursal: idSucursal || null,
            tipoComprobante: tipo || null,
            estado: estado || null,
            idPersona: idPersona || null,
            busqueda: busqueda || null
        });

        return res.json({ ok: true, comprobantes });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar comprobantes'
        });
    }
};

// ======================================================
// BUSCAR COMPROBANTE POR ID (con detalle)
// GET /api/comprobantes/:id
// ======================================================
const buscarComprobantePorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de comprobante requerido'
            });
        }

        const comprobante = await model.buscarComprobantePorId(id);

        if (!comprobante) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El comprobante no existe'
            });
        }

        return res.json({ ok: true, comprobante });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar comprobante'
        });
    }
};

// ======================================================
// OBTENER SIGUIENTE NÚMERO (previsualización)
// GET /api/comprobantes/siguiente-numero?idSucursal=1&tipo=BOLETA&serie=B001
// ======================================================
const obtenerSiguienteNumero = async (req, res) => {
    try {
        const { idSucursal, tipo, serie } = req.query;

        if (!idSucursal || !tipo || !serie) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Sucursal, tipo y serie son obligatorios'
            });
        }

        const numero = await model.obtenerSiguienteNumero(idSucursal, tipo, serie);

        return res.json({ ok: true, numero });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener siguiente número'
        });
    }
};

// ======================================================
// EMITIR COMPROBANTE (cabecera + detalles, transacción con FOR UPDATE)
// POST /api/comprobantes
// body: {
//   id_persona, id_sucursal,
//   id_orden_trabajo | id_orden_venta (uno solo),
//   tipo_comprobante, serie, fecha_emision,
//   subtotal, igv, descuento, total,
//   observacion, items: []
// }
// ======================================================
const emitirComprobante = async (req, res) => {
    try {
        const {
            id_persona,
            id_sucursal,
            id_orden_trabajo,
            id_orden_venta,
            tipo_comprobante,
            serie,
            fecha_emision,
            subtotal,
            igv,
            descuento,
            total,
            observacion,
            items
        } = req.body;

        // Validaciones obligatorias
        if (!id_persona || !id_sucursal || !tipo_comprobante || !serie || !fecha_emision) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Persona, sucursal, tipo, serie y fecha son obligatorios'
            });
        }

        // XOR: exactamente uno de orden_trabajo u orden_venta
        if (!id_orden_trabajo && !id_orden_venta) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe asociar el comprobante a una orden de trabajo o de venta'
            });
        }
        if (id_orden_trabajo && id_orden_venta) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No puede asociar el comprobante a ambas órdenes a la vez'
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El comprobante debe tener al menos un item'
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

        // Verificar sucursal
        const sucursal = await modelSucursales.buscarSucursalPorId(id_sucursal);
        if (!sucursal) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La sucursal no existe'
            });
        }

        // Validar totales
        const sub = Number(subtotal) || 0;
        const igvNum = Number(igv) || 0;
        const desc = Number(descuento) || 0;
        const tot = Number(total) || 0;

        if (sub < 0 || igvNum < 0 || desc < 0 || tot < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los montos no pueden ser negativos'
            });
        }

        // Validar items
        const itemsValidados = [];
        for (const it of items) {
            if (!it.cantidad || Number(it.cantidad) <= 0) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Cada item debe tener cantidad mayor a 0'
                });
            }
            itemsValidados.push({
                cantidad: Number(it.cantidad),
                precio_unitario: Number(it.precio_unitario),
                subtotal: Number(it.precio_unitario) * Number(it.cantidad),
                observacion: it.observacion || null
            });
        }

        const resultado = await model.emitirComprobante({
            id_persona,
            id_sucursal,
            id_orden_trabajo: id_orden_trabajo || null,
            id_orden_venta: id_orden_venta || null,
            tipo_comprobante,
            serie,
            fecha_emision,
            subtotal: sub,
            igv: igvNum,
            descuento: desc,
            total: tot,
            estado: 'EMITIDO',
            observacion: observacion || null,
            items: itemsValidados
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Comprobante emitido correctamente',
            id_comprobante: resultado.id_comprobante,
            numero: resultado.numero,
            serie: resultado.serie
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al emitir comprobante'
        });
    }
};

// ======================================================
// ACTUALIZAR ESTADO DE COMPROBANTE (EMITIDO / ANULADO)
// PATCH /api/comprobantes/:id/estado
// body: { estado: 'EMITIDO' | 'ANULADO' }
// ======================================================
const actualizarEstadoComprobante = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const estadosValidos = ['EMITIDO', 'ANULADO'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Estado inválido. Use: ' + estadosValidos.join(', ')
            });
        }

        const comprobante = await model.buscarComprobantePorId(id);

        if (!comprobante) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Comprobante no encontrado'
            });
        }

        await model.actualizarEstadoComprobante(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar estado del comprobante'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    // Órdenes de venta
    listarOrdenesVenta,
    listarVentasPorPersona,
    buscarOrdenVentaPorId,
    buscarOrdenVentaConDetalle,
    registrarVenta,
    actualizarEstadoOrdenVenta,
    eliminarOrdenVenta,

    // Comprobantes
    listarComprobantes,
    buscarComprobantePorId,
    obtenerSiguienteNumero,
    emitirComprobante,
    actualizarEstadoComprobante
};