const model = require('../models/modelCategoria');

// ======================================================
// LISTAR CATEGORÍAS (con búsqueda opcional)
// GET /api/categorias?busqueda=texto
// ======================================================
const listarCategorias = async (req, res) => {
    try {
        const { busqueda } = req.query;

        const categorias = await model.listarCategorias(busqueda || null);

        return res.json({ ok: true, categorias });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar categorías'
        });
    }
};

// ======================================================
// BUSCAR CATEGORÍA POR ID
// GET /api/categorias/:id
// ======================================================
const buscarCategoriaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de categoría requerido'
            });
        }

        const categoria = await model.buscarCategoriaPorId(id);

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La categoría no existe'
            });
        }

        return res.json({ ok: true, categoria });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar categoría'
        });
    }
};

// ======================================================
// REGISTRAR CATEGORÍA
// POST /api/categorias
// body: { nombre, descripcion }
// ======================================================
const registrarCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        // Validaciones obligatorias
        if (!nombre) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El nombre de la categoría es obligatorio'
            });
        }

        // Verificar duplicado por nombre (búsqueda exacta dentro de listar)
        const categorias = await model.listarCategorias(nombre);
        const existe = categorias.some(
            c => c.nombre.toLowerCase() === nombre.toLowerCase()
        );

        if (existe) {
            return res.status(409).json({
                ok: false,
                mensaje: 'Ya existe una categoría con ese nombre'
            });
        }

        const resultado = await model.registrarCategoria({
            nombre,
            descripcion: descripcion || null,
            estado: 'ACTIVO'
        });

        return res.status(201).json({
            ok: true,
            mensaje: 'Categoría registrada correctamente',
            id_categoria: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar categoría'
        });
    }
};

// ======================================================
// ACTUALIZAR CATEGORÍA
// PUT /api/categorias/:id
// body: { nombre, descripcion, estado }
// ======================================================
const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, estado } = req.body;

        // Verificar existencia
        const categoria = await model.buscarCategoriaPorId(id);

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Categoría no encontrada'
            });
        }

        // Validaciones obligatorias
        if (!nombre) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El nombre de la categoría es obligatorio'
            });
        }

        // Verificar que el nombre no choque con otra categoría
        const categorias = await model.listarCategorias(nombre);
        const existe = categorias.some(
            c => c.nombre.toLowerCase() === nombre.toLowerCase()
            && c.id_categoria != id
        );

        if (existe) {
            return res.status(409).json({
                ok: false,
                mensaje: 'El nombre ya está registrado en otra categoría'
            });
        }

        await model.actualizarCategoria(id, {
            nombre,
            descripcion: descripcion || null,
            estado: estado || categoria.estado
        });

        return res.json({
            ok: true,
            mensaje: 'Categoría actualizada correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar categoría'
        });
    }
};

// ======================================================
// CAMBIAR ESTADO (soft delete / reactivar)
// PATCH /api/categorias/:id/estado
// body: { estado: 'ACTIVO' | 'INACTIVO' }
// ======================================================
const cambiarEstadoCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado es obligatorio'
            });
        }

        const categoria = await model.buscarCategoriaPorId(id);

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Categoría no encontrada'
            });
        }

        await model.cambiarEstadoCategoria(id, estado);

        return res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado de la categoría'
        });
    }
};

// ======================================================
// ELIMINAR CATEGORÍA (físico — falla si tiene productos)
// DELETE /api/categorias/:id
// ======================================================
const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const categoria = await model.buscarCategoriaPorId(id);

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Categoría no encontrada'
            });
        }

        await model.eliminarCategoria(id);

        return res.json({
            ok: true,
            mensaje: 'Categoría eliminada correctamente'
        });

    } catch (error) {
        console.error(error);

        // FK constraint: tiene productos asociados
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                ok: false,
                mensaje: 'No se puede eliminar: la categoría tiene productos asociados. Use cambiar estado a INACTIVO.'
            });
        }

        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar categoría'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarCategorias,
    buscarCategoriaPorId,
    registrarCategoria,
    actualizarCategoria,
    cambiarEstadoCategoria,
    eliminarCategoria
};