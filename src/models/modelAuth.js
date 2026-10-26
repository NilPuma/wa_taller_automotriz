const poolDB = require('../config_db/config_mysql');

const buscarUsuario = async (usuario) => {
    // Buscamos en la columna 'usuario' (que ahora contiene el correo)
    const sql = `SELECT * FROM USUARIOS WHERE usuario = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [usuario]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    buscarUsuario
};