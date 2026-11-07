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


// Buscar persona por ID
const buscarPersonaId = async (idPersona) => {

    const sql = `SELECT * FROM personas WHERE id_persona = ? LIMIT 1`;

    try { 
        const [rows] = await poolDB.query(sql, [idPersona]);
        return rows.length > 0 ? rows[0]: null;

    } catch (error) {

        throw error;
    }
};
const buscarDocumento = async (documento, idPersona) => {

    const sql = `SELECT id_persona FROM personas WHERE documento = ? AND id_persona <> ? LIMIT 1`;

    try {

        const [rows] = await poolDB.query(
            sql,
            [
                documento,
                idPersona
            ]
        );
        return rows.length > 0 ? rows[0]: null;
    } catch (error) {

        throw error;
    }

};

const actualizarPersona = async (idPersona, datos) => {
    const sql = `UPDATE personas SET documento = ?, nombres = ?, apellidos = ?, telefono = ?, fecha_modificacion = CURDATE() WHERE id_persona = ?`;

    try {
        const [result] = await poolDB.query(
            sql,
            [
                datos.documento,
                datos.nombres,
                datos.apellidos,
                datos.telefono,
                idPersona
            ]
        );
        return result;
    } catch (error) {

        throw error;
    }

};

const buscarPersona = async (persona) => {

    const sql = `SELECT * FROM personas WHERE documento = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [persona]);
        return rows.length > 0 ? rows[0] : null;
        
    } catch (error) {
        throw error;
    }
};
const buscarUsuario = async (usuario) => {

    const sql = `SELECT * FROM usuarios WHERE usuario = ? LIMIT 1`;

    try {
        const [rows] = await poolDB.query(sql, [usuario]);
        return rows.length > 0 ? rows[0] : null;
        
    } catch (error) {
        throw error;
    }
};

const registrarPersona = async (datosPersona, datosUsuario) => {
    const conexion = await poolDB.getConnection();
    try {
        // Iniciamos la transacción
        await conexion.beginTransaction();

        const sqlPersona = `INSERT INTO personas (tipo_persona, tipo_documento, documento, nombres, apellidos, direccion, telefono, correo, estado, fecha_modificacion)VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const [resPersona] = await conexion.query(sqlPersona,
            [
                datosPersona.tipo_persona,
                datosPersona.tipo_documento,
                datosPersona.documento,
                datosPersona.nombres,
                datosPersona.apellidos,
                datosPersona.direccion,
                datosPersona.telefono,
                datosPersona.correo,
                datosPersona.estado,
                datosPersona.fecha
            ]
        );
        //Obtener id de la persona
        const id_persona = resPersona.insertId;

        //Insertar Usuario
        const sqlUsuario = `INSERT INTO usuarios(id_persona, id_rol, usuario, password, estado, fecha_modificacion)VALUES (?, ?, ?, ?, ?, ?)`;

        const [resUsuario] = await conexion.query(sqlUsuario,
            [
                id_persona,
                datosUsuario.rol,
                datosUsuario.correo,
                datosUsuario.passwordHash,
                datosUsuario.estado,
                datosUsuario.fecha
            ]
        );
        //Confirmar la transaccion
        await conexion.commit();
        return {
            id_persona: id_persona,
            id_usuario: resUsuario.insertId
        };
    } catch (error) {
        // Si algo falla, deshacemos todo
        await conexion.rollback();
        throw error;
    } finally {
        // Liberamos la conexión
        conexion.release();
    }

};

const eliminarPersona = async (idPersona) => {

    const sql = `UPDATE personas SET estado = 'inactivo', fecha_modificacion = CURDATE() WHERE id_persona = ?`;

    try {

        const [result] = await poolDB.query( sql, [idPersona]);


        return result;


    } catch (error) {

        throw error;

    }

};

module.exports = {
    listarPersonas,
    listarUsuarios,
    buscarPersonaId,
    buscarDocumento,
    buscarPersona,
    buscarUsuario,
    registrarPersona,
    actualizarPersona,
    eliminarPersona
}