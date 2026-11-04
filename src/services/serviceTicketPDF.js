const puppeteer = require('puppeteer');
const modelTicketOT = require('../models/modelTicketOT');

const ANCHO_TICKET_MM = 80;
const MARGEN_TICKET_MM = 4;

// Escapa texto para que los datos guardados no se interpreten como HTML.
const escaparHTML = (valor) => String(valor ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
})[caracter]);

// Formatea montos con dos decimales y la moneda usada por el taller.
const formatearMonto = (valor) => `S/ ${Number(valor || 0).toFixed(2)}`;

// Muestra fechas DATE de MySQL sin desplazar el día por la zona horaria.
const formatearFecha = (valor) => {
    if (!valor) return '—';

    const texto = valor instanceof Date
        ? valor.toISOString().slice(0, 10)
        : String(valor).slice(0, 10);
    const partes = texto.split('-');

    if (partes.length !== 3) return escaparHTML(valor);
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// Construye el documento HTML del ticket en este mismo servicio.
const construirHTMLTicket = (ticket) => {
    const itemsHTML = (ticket.items || []).map(item => `
        <article class="item">
            <div class="descripcion">${escaparHTML(item.descripcion || 'Detalle de servicio')}</div>
            <div class="item-resumen">
                <span>${Number(item.cantidad || 0)} × ${formatearMonto(item.precio_unitario)}</span>
                <strong>${formatearMonto(item.subtotal)}</strong>
            </div>
        </article>
    `).join('');

    const nombreVehiculo = [ticket.marca, ticket.modelo]
        .filter(Boolean)
        .map(escaparHTML)
        .join(' ');

    return `<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escaparHTML(ticket.codigo_ticket || 'Ticket de servicio')}</title>
    <style>
        * { box-sizing: border-box; }
        html, body {
            width: ${ANCHO_TICKET_MM - (MARGEN_TICKET_MM * 2)}mm;
            margin: 0;
            padding: 0;
            color: #17202b;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body { overflow-wrap: anywhere; }
        .ticket { width: 100%; padding: 0; }
        .centrado { text-align: center; }
        .taller-nombre {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
            line-height: 1.2;
            text-transform: uppercase;
        }
        .datos-taller { margin-top: 4px; color: #4c5968; font-size: 9px; }
        .titulo-ticket {
            margin: 12px 0 3px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
        }
        .codigo-ticket { font-size: 11px; font-weight: 700; }
        .separador { border: 0; border-top: 1px dashed #788391; margin: 9px 0; }
        .bloque { margin: 0 0 8px; }
        .bloque-titulo {
            margin: 0 0 4px;
            color: #42536a;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.07em;
        }
        .dato { margin: 2px 0; }
        .etiqueta { color: #5e6a78; }
        .items { margin-top: 2px; }
        .item { padding: 5px 0; border-bottom: 1px dotted #c7cdd4; }
        .descripcion { font-weight: 600; }
        .item-resumen {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 2px;
            color: #4c5968;
            font-size: 9px;
        }
        .item-resumen strong { color: #17202b; white-space: nowrap; }
        .total {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-top: 7px;
            font-size: 13px;
            font-weight: 700;
        }
        .agradecimiento { margin: 12px 0 0; color: #4c5968; font-size: 9px; }
    </style>
</head>
<body>
    <main class="ticket">
        <header class="centrado">
            <h1 class="taller-nombre">${escaparHTML(ticket.sucursal_nombre || 'Taller')}</h1>
            <div class="datos-taller">
                ${ticket.sucursal_direccion ? `<div>${escaparHTML(ticket.sucursal_direccion)}</div>` : ''}
                ${ticket.sucursal_telefono ? `<div>Teléfono: ${escaparHTML(ticket.sucursal_telefono)}</div>` : ''}
                ${ticket.sucursal_ruc ? `<div>RUC: ${escaparHTML(ticket.sucursal_ruc)}</div>` : ''}
            </div>
            <div class="titulo-ticket">${escaparHTML(ticket.etiqueta_ticket || 'TICKET GENERAL')}</div>
            <div class="codigo-ticket">${escaparHTML(ticket.codigo_ticket || '')}</div>
        </header>

        <hr class="separador">

        <section class="bloque">
            <div class="dato"><span class="etiqueta">Orden:</span> OT-${String(ticket.id_orden_trabajo || '').padStart(6, '0')}</div>
            <div class="dato"><span class="etiqueta">Fecha:</span> ${formatearFecha(ticket.fecha_emision)}</div>
        </section>

        <hr class="separador">

        <section class="bloque">
            <h2 class="bloque-titulo">CLIENTE</h2>
            <div class="dato">${escaparHTML(ticket.cliente_nombre || '—')}</div>
            <div class="dato"><span class="etiqueta">${escaparHTML(ticket.tipo_documento || 'Documento')}:</span> ${escaparHTML(ticket.documento || '—')}</div>
        </section>

        <section class="bloque">
            <h2 class="bloque-titulo">VEHÍCULO</h2>
            <div class="dato"><span class="etiqueta">Placa:</span> ${escaparHTML(ticket.placa || '—')}</div>
            ${nombreVehiculo ? `<div class="dato"><span class="etiqueta">Vehículo:</span> ${nombreVehiculo}</div>` : ''}
        </section>

        <hr class="separador">

        <section class="bloque">
            <h2 class="bloque-titulo">DETALLE</h2>
            <div class="items">${itemsHTML}</div>
            <div class="total"><span>TOTAL</span><span>${formatearMonto(ticket.total)}</span></div>
        </section>

        <hr class="separador">
        <p class="agradecimiento centrado">Gracias por confiar en nosotros.</p>
    </main>
</body>
</html>`;
};

// Genera el PDF de 80 mm y devuelve sus datos para enviarlos desde el controlador.
const generarPDFTicketOT = async (idComprobante, tipo = 'general') => {
    const ticket = await modelTicketOT.buscarTicketCompleto(idComprobante);
    if (!ticket) {
        const error = new Error('Ticket de orden de trabajo no encontrado');
        error.code = 'TICKET_NO_ENCONTRADO';
        throw error;
    }

    const tiposPermitidos = {
        general: { etiqueta: 'TICKET GENERAL', sufijo: 'general' },
        servicios: { etiqueta: 'TICKET POR SERVICIOS', sufijo: 'servicios' },
        productos: { etiqueta: 'TICKET POR PRODUCTOS', sufijo: 'productos' }
    };
    const configuracion = tiposPermitidos[tipo];
    if (!configuracion) {
        const error = new Error('El tipo de ticket solicitado no es válido');
        error.code = 'TIPO_TICKET_INVALIDO';
        throw error;
    }

    if (tipo !== 'general') {
        const prefijo = tipo === 'servicios' ? 'Servicio:' : 'Producto:';
        ticket.items = (ticket.items || []).filter(item =>
            String(item.descripcion || '').startsWith(prefijo)
        );
        if (ticket.items.length === 0) {
            const error = new Error(`La orden no tiene ${tipo} para incluir en el ticket`);
            error.code = 'TICKET_SIN_ITEMS_TIPO';
            throw error;
        }
        ticket.total = ticket.items.reduce((suma, item) => suma + Number(item.subtotal || 0), 0);
    }
    ticket.etiqueta_ticket = configuracion.etiqueta;

    const html = construirHTMLTicket(ticket);
    let navegador;

    try {
        navegador = await puppeteer.launch({ headless: true });
        const pagina = await navegador.newPage();
        await pagina.setViewport({
            width: Math.round(ANCHO_TICKET_MM * 96 / 25.4),
            height: 1
        });
        await pagina.setContent(html, { waitUntil: 'load' });

        const altoContenidoPx = await pagina.evaluate(() => Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        ));
        const altoTicketMm = Math.max(
            90,
            Math.ceil((altoContenidoPx * 25.4 / 96) + (MARGEN_TICKET_MM * 2))
        );

        const bytesPDF = await pagina.pdf({
            width: `${ANCHO_TICKET_MM}mm`,
            height: `${altoTicketMm}mm`,
            margin: {
                top: `${MARGEN_TICKET_MM}mm`,
                right: `${MARGEN_TICKET_MM}mm`,
                bottom: `${MARGEN_TICKET_MM}mm`,
                left: `${MARGEN_TICKET_MM}mm`
            },
            printBackground: true
        });

        return {
            ticket,
            nombreArchivo: `${ticket.codigo_ticket || `ticket-ot-${ticket.id_orden_trabajo}`}-${configuracion.sufijo}.pdf`,
            contenidoPDF: Buffer.from(bytesPDF)
        };
    } finally {
        if (navegador) await navegador.close();
    }
};

module.exports = { generarPDFTicketOT };