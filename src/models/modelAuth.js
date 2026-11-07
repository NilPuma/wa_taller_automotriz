const poolDB = require('../config_db/config_mysql');

/* const listarUsuarios = async () => {
    const db = "SELECT * FROM usuarios";
    try {
        const [rows] = await poolDB.query(db)
        return rows
    } catch (error) {
        throw error;
    }
}; */
const buscarUsuario = async (usuario) => {

    const sql = `SELECT * FROM usuarios WHERE usuario = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [usuario]);
        return rows.length > 0 ? rows[0] : null;

    } catch (error) {
        throw error;
    }
};

module.exports = {
    buscarUsuario
}