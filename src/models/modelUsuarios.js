const poolDB = require('../config_db/config_mysql');

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
    listarUsuarios
}