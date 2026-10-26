const model = require('../models/modelProducto');
const modelCategorias = require('../models/modelCategoria');

// ======================================================
// LISTAR PRODUCTOS (global, sin stock)
// GET /api/productos?busqueda=texto
// ======================================================
const listarProductos = async (req, res) => {
    try {
        const { busqueda } = req.query;

        const productos = await model.listarProductos(busqueda || null);

        return res.json({ ok: true, productos });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar productos'
        });
    }
};

// ======================================================
// LISTAR PRODUCTOS POR SUCURSAL (con stock)
// GET /api/productos/sucursal/:idSucursal?busqueda=texto
// ======================================================
const listarProductosPorSucursal = async (req, res) => {
    try {
        const { idSucursal } = req.params;
        const { busqueda } = req.query;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        const productos = await model.listarProductosPorSucursal(
            idSucursal,
            busqueda || null
        );

        return res.json({ ok: true, productos });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar productos por sucursal'
        });
    }
};

// ======================================================
// BUSCAR PRODUCTO POR ID (con stock si se pasa idSucursal)
// GET /api/productos/:id?idSucursal=1
// ======================================================
const buscarProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const { idSucursal } = req.query;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de producto requerido'
            });
        }

        const producto = await model.buscarProductoPorId(id, idSucursal || null);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El producto no existe'
            });
        }

        return res.json({ ok: true, producto });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar producto'
        });
    }
};

// ======================================================
// BUSCAR PRODUCTO POR CÓDIGO
// GET /api/productos/codigo/:codigo
// ======================================================
const buscarProductoPorCodigo = async (req, res) => {
    try {
        const { codigo } = req.params;

        if (!codigo) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Código de producto requerido'
            });
        }

        const producto = await model.buscarProductoPorCodigo(codigo);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El producto no existe'
            });
        }

        return res.json({ ok: true, producto });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar producto por código'
        });
    }
};

// ======================================================
// REGISTRAR PRODUCTO
// POST /api/productos
// body: { id_categoria, codigo, nombre, marca, descripcion,
//         precio_compra, precio_venta, precio_minimo,
//         id_sucursal, stock_inicial }
// ======================================================
const registrarProducto = async (req, res) => {
    try {
        const {
            id_categoria,
            codigo,
            nombre,
            marca,
            descripcion,
            precio_compra,
            precio_venta,
            precio_minimo,
            id_sucursal,
            stock_inicial
        } = req.body;

        // Validaciones obligatorias
        if (!id_categoria || !codigo || !nombre
            || precio_compra === undefined
            || precio_venta === undefined
            || precio_minimo === undefined) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Categoría, código, nombre y precios son obligatorios'
            });
        }

        // Verificar que la categoría exista
        const categoria = await modelCategorias.buscarCategoriaPorId(id_categoria);

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La categoría asociada no existe'
            });
        }

        // Verificar código duplicado
        const existeCodigo = await model.buscarProductoPorCodigo(codigo);

        if (existeCodigo) {
            return res.status(409).json({
                ok: false,
                mensaje: 'Ya existe un producto con ese código'
            });
        }

        // Validar precios coherentes
        const pc = Number(precio_compra);
        const pv = Number(precio_venta);
        const pm = Number(precio_minimo);

        if (pc < 0 || pv < 0 || pm < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los precios no pueden ser negativos'
            });
        }

        const resultado = await model.registrarProducto(
            {
                id_categoria,
                codigo,
                nombre,
                marca: marca || null,
                descripcion: descripcion || null,
                precio_compra: pc,
                precio_venta: pv,
                precio_minimo: pm,
                estado: 'ACTIVO'
            },
            id_sucursal || null,
            Number(stock_inicial) || 0
        );

        return res.status(201).json({
            ok: true,
            mensaje: 'Producto registrado correctamente',
            id_producto: resultado.id_producto
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar producto'
        });
    }
};

// ======================================================
// ACTUALIZAR PRODUCTO
// PUT /api/productos/:id
// body: { id_categoria, codigo, nombre, marca, descripcion,
//         precio_compra, precio_venta, precio_minimo, estado }
// ======================================================
const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            id_categoria,
            codigo,
            nombre,
            marca,
            descripcion,
            precio_compra,
            precio_venta,
            precio_minimo,
            estado
        } = req.body;

        // Verificar existencia
        const producto = await model.buscarProductoPorId(id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        // Validaciones obligatorias
        if (!id_categoria || !codigo || !nombre
            || precio_compra === undefined
            || precio_venta === undefined
            || precio_minimo === undefined) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Categoría, código, nombre y precios son obligatorios'
            });
        }

        // Verificar que la categoría exista
        const categoria = await modelCategorias.buscarCategoriaPorId(id_categoria);

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La categoría asociada no existe'
            });
        }

        // Verificar que el código no choque con otro producto
        const existeCodigo = await model.buscarProductoPorCodigo(codigo);

        if (existeCodigo && existeCodigo.id_producto != id) {
            return res.status(409).json({
                ok: false,
                mensaje: 'El código ya está registrado en otro producto'
            });
        }

        await model.actualizarProducto(id, {
            id_categoria,
            codigo,
            nombre,
            marca: marca || null,
            descripcion: descripcion || null,
            precio_compra: Number(precio_compra),
            precio_venta: Number(precio_venta),
            precio_minimo: Number(precio_minimo),
            estado: estado || producto.estado
        });

        return res.json({
            ok: true,
            mensaje: 'Producto actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar producto'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// PATCH /api/productos/:id/estado
// body: { estado: 'ACTIVO' | 'INACTIVO' }
// ======================================================
const cambiarEstadoProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const producto = await model.buscarProductoPorId(id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        await model.cambiarEstadoProducto(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado del producto'
        });
    }
};

// ======================================================
// ELIMINAR PRODUCTO (físico — falla si está en detalles/OT/ventas)
// DELETE /api/productos/:id
// ======================================================
const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        const producto = await model.buscarProductoPorId(id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        await model.eliminarProducto(id);

        return res.json({
            ok: true,
            mensaje: 'Producto eliminado correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: está en cotizaciones, OT, ventas o comprobantes
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: el producto tiene registros asociados. Use cambiar estado a INACTIVO.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar producto'
        });
    }
};

// ======================================================
// OBTENER STOCK DE UN PRODUCTO EN UNA SUCURSAL
// GET /api/productos/:id/stock/:idSucursal
// ======================================================
const obtenerStock = async (req, res) => {
    try {
        const { id, idSucursal } = req.params;

        if (!idSucursal) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        const producto = await model.buscarProductoPorId(id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        const stock = await model.obtenerStock(idSucursal, id);

        return res.json({ ok: true, stock });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener stock'
        });
    }
};

// ======================================================
// DESCONTAR STOCK (ajuste manual / devolución de venta)
// POST /api/productos/:id/stock/descontar
// body: { id_sucursal, cantidad }
// ======================================================
const descontarStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursal, cantidad } = req.body;

        if (!id_sucursal || !cantidad || cantidad <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Sucursal y cantidad mayor a 0 son obligatorias'
            });
        }

        const producto = await model.buscarProductoPorId(id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        await model.descontarStock(id_sucursal, id, Number(cantidad));

        return res.json({
            ok: true,
            mensaje: 'Stock descontado correctamente'
        });

    } catch (error) {
        console.error(error);

        // El modelo lanza este error si no hay stock suficiente
        if (error.message && error.message.includes('Stock insuficiente')) {
            return res.status(409).json({
                ok: false,
                mensaje: error.message
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al descontar stock'
        });
    }
};

// ======================================================
// AUMENTAR STOCK (reposición / devolución)
// POST /api/productos/:id/stock/aumentar
// body: { id_sucursal, cantidad }
// ======================================================
const aumentarStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursal, cantidad } = req.body;

        if (!id_sucursal || !cantidad || cantidad <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Sucursal y cantidad mayor a 0 son obligatorias'
            });
        }

        const producto = await model.buscarProductoPorId(id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        await model.aumentarStock(id_sucursal, id, Number(cantidad));

        return res.json({
            ok: true,
            mensaje: 'Stock aumentado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al aumentar stock'
        });
    }
};

// ======================================================
// ACTUALIZAR STOCK ABSOLUTO (ajuste de inventario)
// PUT /api/productos/:id/stock
// body: { id_sucursal, stock }
// ======================================================
const actualizarStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_sucursal, stock } = req.body;

        if (!id_sucursal || stock === undefined || Number(stock) < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Sucursal y stock mayor o igual a 0 son obligatorios'
            });
        }

        const producto = await model.buscarProductoPorId(id);

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        await model.actualizarStock(id_sucursal, id, Number(stock));

        return res.json({
            ok: true,
            mensaje: 'Stock actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar stock'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarProductos,
    listarProductosPorSucursal,
    buscarProductoPorId,
    buscarProductoPorCodigo,
    registrarProducto,
    actualizarProducto,
    cambiarEstadoProducto,
    eliminarProducto,
    obtenerStock,
    descontarStock,
    aumentarStock,
    actualizarStock
};