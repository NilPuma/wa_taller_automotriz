/* modelo para persona */
const poolDB = require('../config_db/config_mysql');

const listarPersonas = async () => {
    const db = `SELECT * FROM personas WHERE estado = 'activo' ORDER BY id_persona DESC`;
    try {
        const [rows] = await poolDB.query(db)
        return rows
    } catch (error) {
        throw error;
    }
};

const listarUsuarios = async () => {
    const db = "SELECT * FROM usuarios";
    try {
        const [rows] = await poolDB.query(db)
        return rows
    } catch (error) {
        throw error;
    }
};

module.exports = {
    listarPersonas,
    listarUsuarios
}