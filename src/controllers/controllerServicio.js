const model = require('../models/modelServicio');

// ======================================================
// LISTAR SERVICIOS (global, con búsqueda opcional)
// GET /api/servicios?busqueda=texto
// ======================================================
const listarServicios = async (req, res) => {
    try {
        const { busqueda } = req.query;

        const servicios = await model.listarServicios(busqueda || null);

        return res.json({ ok: true, servicios });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar servicios'
        });
    }
};

// ======================================================
// LISTAR SERVICIOS POR SUCURSAL
// GET /api/servicios/sucursal/:idSucursal?busqueda=texto
// ======================================================
const listarServiciosPorSucursal = async (req, res) => {
    try {
        const { idSucursal } = req.params;
        const { busqueda } = req.query;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        const servicios = await model.listarServiciosPorSucursal(
            idSucursal,
            busqueda || null
        );

        return res.json({ ok: true, servicios });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar servicios por sucursal'
        });
    }
};

// ======================================================
// BUSCAR SERVICIO POR ID
// GET /api/servicios/:id
// ======================================================
const buscarServicioPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de servicio requerido'
            });
        }

        const servicio = await model.buscarServicioPorId(id);

        if (!servicio) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El servicio no existe'
            });
        }

        return res.json({ ok: true, servicio });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar servicio'
        });
    }
};

// ======================================================
// REGISTRAR SERVICIO
// POST /api/servicios
// body: { nombre, precio_base, precio_regular, descripcion, id_sucursales: [] }
// ======================================================
const registrarServicio = async (req, res) => {
    try {
        const {
            nombre,
            precio_base,
            precio_regular,
            descripcion,
            id_sucursales = []
        } = req.body;

        // Validaciones obligatorias
        if (!nombre || precio_base === undefined || precio_regular === undefined) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Nombre, precio base y precio regular son obligatorios'
            });
        }

        // Validar precios
        const pb = Number(precio_base);
        const pr = Number(precio_regular);

        if (pb < 0 || pr < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los precios no pueden ser negativos'
            });
        }

        if (pr < pb) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El precio regular no puede ser menor al precio base'
            });
        }

        const resultado = await model.registrarServicio(
            {
                nombre,
                precio_base: pb,
                precio_regular: pr,
                descripcion: descripcion || null,
                estado: 'ACTIVO'
            },
            Array.isArray(id_sucursales) ? id_sucursales : []
        );

        return res.status(201).json({
            ok: true,
            mensaje: 'Servicio registrado correctamente',
            id_servicio: resultado.id_servicio
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar servicio'
        });
    }
};

// ======================================================
// ACTUALIZAR SERVICIO
// PUT /api/servicios/:id
// body: { nombre, precio_base, precio_regular, descripcion, estado, id_sucursales: [] }
// ======================================================
const actualizarServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            precio_base,
            precio_regular,
            descripcion,
            estado,
            id_sucursales
        } = req.body;

        // Verificar existencia
        const servicio = await model.buscarServicioPorId(id);

        if (!servicio) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Servicio no encontrado'
            });
        }

        // Validaciones obligatorias
        if (!nombre || precio_base === undefined || precio_regular === undefined) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Nombre, precio base y precio regular son obligatorios'
            });
        }

        // Validar precios
        const pb = Number(precio_base);
        const pr = Number(precio_regular);

        if (pb < 0 || pr < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los precios no pueden ser negativos'
            });
        }

        if (pr < pb) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El precio regular no puede ser menor al precio base'
            });
        }

        await model.actualizarServicio(id, {
            nombre,
            precio_base: pb,
            precio_regular: pr,
            descripcion: descripcion || null,
            estado: estado || servicio.estado
        });

        // Reemplazar sucursales si se enviaron
        if (Array.isArray(id_sucursales)) {
            await model.asignarSucursalesAServicio(id, id_sucursales);
        }

        return res.json({
            ok: true,
            mensaje: 'Servicio actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar servicio'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// PATCH /api/servicios/:id/estado
// body: { estado: 'ACTIVO' | 'INACTIVO' }
// ======================================================
const cambiarEstadoServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const servicio = await model.buscarServicioPorId(id);

        if (!servicio) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Servicio no encontrado'
            });
        }

        await model.cambiarEstadoServicio(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado del servicio'
        });
    }
};

// ======================================================
// ELIMINAR SERVICIO (físico — falla si está en detalles/OT)
// DELETE /api/servicios/:id
// ======================================================
const eliminarServicio = async (req, res) => {
    try {
        const { id } = req.params;

        const servicio = await model.buscarServicioPorId(id);

        if (!servicio) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Servicio no encontrado'
            });
        }

        await model.eliminarServicio(id);

        return res.json({
            ok: true,
            mensaje: 'Servicio eliminado correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: está en detalle_cotizacion o detalles_ot
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: el servicio tiene registros asociados. Use cambiar estado a INACTIVO.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar servicio'
        });
    }
};

// ======================================================
// LISTAR SUCURSALES DE UN SERVICIO
// GET /api/servicios/:id/sucursales
// ======================================================
const listarSucursalesDeServicio = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de servicio requerido'
            });
        }

        const servicio = await model.buscarServicioPorId(id);

        if (!servicio) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Servicio no encontrado'
            });
        }

        const sucursales = await model.listarSucursalesDeServicio(id);

        return res.json({ ok: true, sucursales });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar sucursales del servicio'
        });
    }
};

// ======================================================
// ASIGNAR SUCURSALES A UN SERVICIO (reemplaza las existentes)
// PUT /api/servicios/:id/sucursales
// body: { id_sucursales: [1, 2] }
// ======================================================
const asignarSucursalesAServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursales } = req.body;

        if (!Array.isArray(id_sucursales)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe enviar un arreglo de sucursales'
            });
        }

        const servicio = await model.buscarServicioPorId(id);

        if (!servicio) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Servicio no encontrado'
            });
        }

        await model.asignarSucursalesAServicio(id, id_sucursales);

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
// QUITAR UNA SUCURSAL A UN SERVICIO
// DELETE /api/servicios/:id/sucursales/:idSucursal
// ======================================================
const quitarSucursalAServicio = async (req, res) => {
    try {
        const { id, idSucursal } = req.params;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        await model.quitarSucursalAServicio(id, idSucursal);

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
    // Servicios
    listarServicios,
    listarServiciosPorSucursal,
    buscarServicioPorId,
    registrarServicio,
    actualizarServicio,
    cambiarEstadoServicio,
    eliminarServicio,

    // Sucursales
    listarSucursalesDeServicio,
    asignarSucursalesAServicio,
    quitarSucursalAServicio
};