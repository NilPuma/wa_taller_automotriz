const modelTicketOT = require('../models/modelTicketOT');
const serviceTicketPDF = require('../services/serviceTicketPDF');

// Valida que el parámetro de ruta sea un identificador entero positivo.
const leerIdPositivo = (valor) => {
    if (!/^\d+$/.test(String(valor || ''))) return null;

    const id = Number(valor);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// Traduce errores de negocio del modelo a respuestas HTTP.
const responderErrorTicket = (res, error, mensajeGenerico) => {
    const erroresConocidos = {
        ORDEN_NO_ENCONTRADA: { status: 404, mensaje: 'Orden de trabajo no encontrada' },
        ORDEN_NO_FINALIZADA: { status: 409, mensaje: 'Solo se emite ticket para órdenes finalizadas' },
        ORDEN_SIN_DETALLES: { status: 409, mensaje: 'La orden no tiene detalles para incluir en el ticket' },
        TICKET_SIN_ITEMS_TIPO: { status: 409, mensaje: 'La orden no tiene conceptos de ese tipo para incluir en el ticket' },
        TIPO_TICKET_INVALIDO: { status: 400, mensaje: 'El tipo de ticket solicitado no es válido' },
        NUMERACION_TICKET_OCUPADA: { status: 503, mensaje: 'No se pudo asignar el número del ticket; vuelva a intentarlo' },
        TICKET_NO_ENCONTRADO: { status: 404, mensaje: 'Ticket no encontrado' }
    };

    const respuesta = erroresConocidos[error.code];
    if (respuesta) {
        return res.status(respuesta.status).json({ ok: false, mensaje: respuesta.mensaje });
    }

    console.error(error);
    return res.status(500).json({ ok: false, mensaje: mensajeGenerico });
};

// Crea el ticket de una OT finalizada o devuelve el ticket existente.
const emitirTicketOT = async (req, res) => {
    const idOrdenTrabajo = leerIdPositivo(req.params.idOrden);
    if (!idOrdenTrabajo) {
        return res.status(400).json({
            ok: false,
            mensaje: 'El identificador de la orden de trabajo no es válido'
        });
    }

    try {
        const ticket = await modelTicketOT.crearTicketDesdeOrden(idOrdenTrabajo);
        return res.json({
            ok: true,
            mensaje: 'Ticket de orden de trabajo disponible',
            ticket
        });
    } catch (error) {
        return responderErrorTicket(res, error, 'Error al emitir el ticket de la orden');
    }
};

// Busca el ticket existente asociado a una orden de trabajo.
const buscarTicketOTPorOrden = async (req, res) => {
    const idOrdenTrabajo = leerIdPositivo(req.params.idOrden);
    if (!idOrdenTrabajo) {
        return res.status(400).json({
            ok: false,
            mensaje: 'El identificador de la orden de trabajo no es válido'
        });
    }

    try {
        const ticket = await modelTicketOT.buscarTicketPorOrden(idOrdenTrabajo);
        if (!ticket) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La orden todavía no tiene un ticket emitido'
            });
        }

        return res.json({ ok: true, ticket });
    } catch (error) {
        return responderErrorTicket(res, error, 'Error al buscar el ticket de la orden');
    }
};

// Recupera los datos de un ticket para consultarlo o pasarlo al generador PDF.
const buscarTicketOTPorId = async (req, res) => {
    const idTicket = leerIdPositivo(req.params.idTicket);
    if (!idTicket) {
        return res.status(400).json({
            ok: false,
            mensaje: 'El identificador del ticket no es válido'
        });
    }

    try {
        const ticket = await modelTicketOT.buscarTicketCompleto(idTicket);
        if (!ticket) {
            return res.status(404).json({ ok: false, mensaje: 'Ticket no encontrado' });
        }

        return res.json({ ok: true, ticket });
    } catch (error) {
        return responderErrorTicket(res, error, 'Error al buscar el ticket');
    }
};

// Genera y envía el PDF de un ticket ya registrado.
const descargarTicketPDFOT = async (req, res) => {
    const idTicket = leerIdPositivo(req.params.idTicket);
    if (!idTicket) {
        return res.status(400).json({
            ok: false,
            mensaje: 'El identificador del ticket no es válido'
        });
    }

    try {
        const tipo = String(req.query.tipo || 'general').toLowerCase();
        const archivo = await serviceTicketPDF.generarPDFTicketOT(idTicket, tipo);
        const nombreArchivo = String(archivo.nombreArchivo || 'ticket-ot.pdf')
            .replace(/[^a-zA-Z0-9._-]/g, '_');

        return res
            .status(200)
            .type('application/pdf')
            .attachment(nombreArchivo)
            .send(archivo.contenidoPDF);
    } catch (error) {
        return responderErrorTicket(res, error, 'Error al generar el PDF del ticket');
    }
};
module.exports = {
    emitirTicketOT,
    buscarTicketOTPorOrden,
    buscarTicketOTPorId,
    descargarTicketPDFOT
};