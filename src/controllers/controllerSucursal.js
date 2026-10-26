const model = require('../models/modelSucursal');

// ======================================================
// LISTAR SUCURSALES
// GET /api/sucursales
// ======================================================
const listarSucursales = async (req, res) => {
    try {
        const sucursales = await model.listarSucursales();

        return res.json({ ok: true, sucursales });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al listar sucursales'
        });
    }
};

// ======================================================
// BUSCAR SUCURSAL POR ID
// GET /api/sucursales/:id
// ======================================================
const buscarSucursalPorId = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID de sucursal requerido'
            });
        }

        const sucursal = await model.buscarSucursalPorId(id);

        if (!sucursal) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La sucursal no existe'
            });
        }

        return res.json({ ok: true, sucursal });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al buscar sucursal'
        });
    }
};

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
    listarSucursales,
    buscarSucursalPorId
};