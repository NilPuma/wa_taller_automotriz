const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const modelTicketOT = require('../models/modelTicketOT');

const ANCHO_TICKET_MM = 80;
const MARGEN_TICKET_MM = 4;

const FORMATOS_TICKET = {
    '80mm': { pagina: null, margen: 4, sufijo: '80mm' },
    a4: { pagina: 'A4', margen: 12, sufijo: 'a4' },
    a5: { pagina: 'A5', margen: 9, sufijo: 'a5' }
};

const RUTA_PUBLICA = path.resolve(__dirname, '../../public');
const MIME_LOGO_POR_EXTENSION = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
};

// Lee el logo local de la sucursal y lo convierte en una imagen embebida para el PDF.
const cargarLogoSucursal = async (urlLogo) => {
    const rutaRelativa = String(urlLogo || '').trim().replace(/^[/\\]+/, '');
    if (!rutaRelativa) return '';

    const rutaArchivo = path.resolve(RUTA_PUBLICA, rutaRelativa);
    if (!rutaArchivo.startsWith(RUTA_PUBLICA + path.sep)) return '';

    const tipoMime = MIME_LOGO_POR_EXTENSION[path.extname(rutaArchivo).toLowerCase()];
    if (!tipoMime) return '';

    try {
        const contenido = await fs.readFile(rutaArchivo);
        return 'data:' + tipoMime + ';base64,' + contenido.toString('base64');
    } catch (error) {
        return '';
    }
};

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
const construirHTMLTicket = (ticket, formato = '80mm') => {
    const esTermico = formato === '80mm';
    const configuracionFormato = FORMATOS_TICKET[formato];
    const items = ticket.items || [];
    const itemsHTML = items.map(item =>
        '<tr>' +
            '<td class="numero">' + Number(item.cantidad || 0) + '</td>' +
            '<td><span class="descripcion-texto">' + escaparHTML(item.descripcion || 'Detalle de servicio') + '</span></td>' +
            '<td class="numero">' + formatearMonto(item.precio_unitario) + '</td>' +
            '<td class="numero">' + formatearMonto(item.subtotal) + '</td>' +
        '</tr>'
    ).join('');

    const nombreVehiculo = [ticket.marca, ticket.modelo]
        .filter(Boolean)
        .map(escaparHTML)
        .join(' ');

    const logoHTML = ticket.sucursal_logo_data_uri
        ? '<img class="logo-taller" src="' + escaparHTML(ticket.sucursal_logo_data_uri) + '" alt="Logo de la sucursal">'
        : '';

    const direccionHTML = ticket.sucursal_direccion
        ? '<div>' + escaparHTML(ticket.sucursal_direccion) + '</div>'
        : '';

    const telefonoHTML = ticket.sucursal_telefono
        ? '<div>Teléfono: ' + escaparHTML(ticket.sucursal_telefono) + '</div>'
        : '';

    const rucHTML = ticket.sucursal_ruc
        ? '<div class="ruc"><span class="etiqueta">RUC:</span> ' + escaparHTML(ticket.sucursal_ruc) + '</div>'
        : '';

    const identificadorHTML = [
        escaparHTML(ticket.tipo_documento || 'Documento'),
        escaparHTML(ticket.documento || '—')
    ].join(' ');

    const vehiculoHTML = nombreVehiculo
        ? nombreVehiculo
        : '—';

    const igvHTML = Number(ticket.igv || 0) > 0
        ? formatearMonto(ticket.igv)
        : 'No desglosado';

    const estilos = [
        '* { box-sizing: border-box; }',
        esTermico ? '' : '@page { size: ' + configuracionFormato.pagina + ' portrait; margin: ' + configuracionFormato.margen + 'mm; }',
        'html, body { width: ' + (esTermico ? (ANCHO_TICKET_MM - (MARGEN_TICKET_MM * 2)) + 'mm' : 'auto') + '; margin: 0; padding: 0; color: #17202b; font-family: Arial, Helvetica, sans-serif; font-size: ' + (esTermico ? '10px' : (formato === 'a4' ? '11pt' : '9.5pt')) + '; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
        'body { overflow-wrap: anywhere; }',
        '.ticket { width: 100%; max-width: 100%; padding: ' + (esTermico ? '0' : '2mm') + '; }',
        '.encabezado { display: flex; align-items: center; justify-content: space-between; gap: 5mm; padding-bottom: 3mm; border-bottom: 1px solid #788391; }',
        '.logo-contenedor { width: 22%; flex: 0 0 22%; }',
        '.logo-taller { display: block; width: 100%; height: 22mm; object-fit: contain; }',
        '.datos-taller { flex: 1; min-width: 0; text-align: center; color: #4c5968; font-size: 9pt; }',
        '.taller-nombre { margin: 0 0 1mm; color: #17202b; font-size: 18pt; font-weight: 700; line-height: 1.15; text-transform: uppercase; }',
        '.folio { width: 28%; flex: 0 0 28%; padding: 2mm; border: 1px solid #8994a1; border-radius: 4px; text-align: center; }',
        '.ruc { margin-bottom: 1mm; color: #4c5968; }',
        '.titulo-ticket { margin: 1mm 0; font-size: 12pt; font-weight: 700; }',
        '.codigo-ticket { font-size: 13pt; font-weight: 400; color: #4c5968; }',
        '.etiqueta, .bloque-titulo { font-weight: 700; }',
        '.etiqueta { color: #17202b; font-weight: 700; }',
        '.dato { color: #4c5968; font-weight: 400; }',
        '.separador { border: 0; border-top: 1px solid #d7dee8; margin: 3mm 0; }',
        '.bloque--datos { margin: 3mm 0; padding: 3mm; border: 1px solid #aeb8c5; border-radius: 4px; }',
        '.datos-orden { display: flex; justify-content: space-between; gap: 5mm; padding-bottom: 2mm; border-bottom: 1px solid #d7dee8; }',
        '.datos-principales { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; padding-top: 2mm; }',
        '.bloque-titulo { margin: 0 0 1mm; font-size: 9pt; }',
        '.dato { margin: 1mm 0; }',
        '.bloque--detalle { margin-top: 3mm; }',
        '.tabla-consumo { width: 100%; border-collapse: collapse; table-layout: fixed; }',
        '.tabla-consumo th { padding: 2mm; border: 0; border-right: 1px solid #fff; background: #2f4053; color: #fff; text-align: left; font-weight: 700; }',
        '.tabla-consumo th:last-child { border-right: 0; }',
        '.tabla-consumo td { padding: 1.5mm 2mm; border-right: 1px solid #fff; border-bottom: 1px solid #d7dee8; background: #eef2f6; color: #4c5968; text-align: left; vertical-align: middle; font-weight: 400; }',
        '.tabla-consumo td:last-child { border-right: 0; }',

        '.tabla-consumo th:first-child, .tabla-consumo td:first-child { width: 10%; }',
        '.tabla-consumo th:nth-child(2), .tabla-consumo td:nth-child(2) { width: 48%; }',
        '.tabla-consumo th:nth-child(3), .tabla-consumo td:nth-child(3) { width: 21%; }',
        '.tabla-consumo th:nth-child(4), .tabla-consumo td:nth-child(4) { width: 21%; }',
        '.tabla-consumo .numero { text-align: right; white-space: nowrap; }',
        '.tabla-consumo .descripcion-texto { display: block; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }',
        '.impuesto { margin-top: 1mm; padding-bottom: 2mm; border-bottom: 1px solid #aeb8c5; color: #4c5968; }',
        '.totales { width: 47%; margin: 2mm 0 0 auto; }',
        '.total { display: flex; justify-content: space-between; gap: 5mm; padding: 1mm 0; }',
        '.total--principal { border-top: 1px solid #aeb8c5; font-size: 13pt; }',
        '.total--principal span:first-child { color: #17202b; font-weight: 700; }',
        '.total--principal span:last-child { color: #4c5968; font-weight: 400; }',
        '.mecanico { margin-top: 3mm; padding-top: 2mm; border-top: 1px solid #d7dee8; color: #4c5968; font-weight: 400; }',
        '.agradecimiento { margin: 4mm 0 0; text-align: center; font-weight: 700; }',
        '.ticket--termico .encabezado { display: block; padding-bottom: 2mm; text-align: center; }',
        '.ticket--termico .logo-contenedor { width: 30mm; margin: 0 auto 2mm; }',
        '.ticket--termico .logo-taller { height: 18mm; }',
        '.ticket--termico .datos-taller { font-size: 8px; }',
        '.ticket--termico .taller-nombre { font-size: 13px; }',
        '.ticket--termico .folio { width: 100%; margin-top: 2mm; padding: 1mm; border: 0; border-top: 1px solid #17202b; border-bottom: 1px solid #17202b; border-radius: 0; }',
        '.ticket--termico .ruc { margin: 0; }',
        '.ticket--termico .titulo-ticket { display: inline-block; margin: 1mm 2mm 0 0; font-size: 10px; }',
        '.ticket--termico .codigo-ticket { display: inline-block; font-size: 10px; }',
        '.ticket--termico .separador { margin: 2mm 0; border-top-style: dashed; border-color: #788391; }',
        '.ticket--termico .bloque--datos { padding: 2mm; border-radius: 3px; }',
        '.ticket--termico .datos-orden { gap: 2mm; padding-bottom: 1mm; font-size: 8px; }',
        '.ticket--termico .datos-principales { display: block; padding-top: 1mm; }',
        '.ticket--termico .bloque-cliente, .ticket--termico .bloque-vehiculo { padding: 1.5mm 0; }',
        '.ticket--termico .bloque-vehiculo { border-top: 1px solid #d7dee8; }',
        '.ticket--termico .bloque-titulo { margin-bottom: 1mm; font-size: 8px; }',
        '.ticket--termico .dato { margin: 1mm 0; font-size: 8px; }',
        '.ticket--termico .tabla-consumo { font-size: 7.5px; }',
        '.ticket--termico .tabla-consumo th { padding: 1mm 0.5mm; border-right: 1px solid #fff; background: #2f4053; color: #fff; }',
        '.ticket--termico .tabla-consumo td { padding: 1mm 0.5mm; }',
        '.ticket--termico .tabla-consumo th:first-child, .ticket--termico .tabla-consumo td:first-child { width: 10%; }',
        '.ticket--termico .tabla-consumo th:nth-child(2), .ticket--termico .tabla-consumo td:nth-child(2) { width: 42%; }',
        '.ticket--termico .tabla-consumo th:nth-child(3), .ticket--termico .tabla-consumo td:nth-child(3) { width: 24%; }',
        '.ticket--termico .tabla-consumo th:nth-child(4), .ticket--termico .tabla-consumo td:nth-child(4) { width: 24%; }',
        '.ticket--termico .totales { width: 72%; margin-top: 2mm; }',
        '.ticket--termico .total { padding: 0.5mm 0; font-size: 9px; }',
        '.ticket--termico .total--principal { font-size: 11px; }',
        '.ticket--termico .mecanico { margin-top: 2mm; padding-top: 1mm; font-size: 8px; }',
        '.ticket--termico .agradecimiento { margin-top: 3mm; font-size: 9px; }',
        '.ticket--hoja .logo-taller { height: 24mm; }',
        '.ticket--a5 .taller-nombre { font-size: 15pt; }',
        '.ticket--a5 .bloque--datos { padding: 2.5mm; }',
        '.ticket--a5 .tabla-consumo th, .ticket--a5 .tabla-consumo td { padding: 1mm; }',
        '.ticket--a5 .totales { width: 55%; }',
        '@media print { .tabla-consumo tr { break-inside: avoid; } }'
    ].join('\n');

    const encabezadoHTML =
        '<header class="encabezado">' +
            '<div class="logo-contenedor">' + logoHTML + '</div>' +
            '<div class="datos-taller">' +
                '<h1 class="taller-nombre">' + escaparHTML(ticket.sucursal_nombre || 'Taller') + '</h1>' +
                direccionHTML +
                telefonoHTML +
            '</div>' +
            '<div class="folio">' +
                rucHTML +
                '<div class="titulo-ticket">ORDEN DE TRABAJO</div>' +
                '<div class="codigo-ticket">' + escaparHTML(ticket.codigo_ticket || '') + '</div>' +
            '</div>' +
        '</header>';

    const datosHTML =
        '<section class="bloque bloque--datos">' +
            '<div class="datos-orden">' +
                '<div class="dato"><span class="etiqueta">Orden:</span> OT-' + String(ticket.id_orden_trabajo || '').padStart(6, '0') + '</div>' +
                '<div class="dato"><span class="etiqueta">Fecha de emisión:</span> ' + formatearFecha(ticket.fecha_emision) + '</div>' +
            '</div>' +
            '<div class="datos-principales">' +
                '<section class="bloque-cliente">' +
                    '<h2 class="bloque-titulo">DATOS DEL CLIENTE</h2>' +
                    '<div class="dato"><span class="etiqueta">Cliente:</span> ' + escaparHTML(ticket.cliente_nombre || '—') + '</div>' +
                    '<div class="dato"><span class="etiqueta">Documento:</span> ' + identificadorHTML + '</div>' +
                '</section>' +
                '<section class="bloque-vehiculo">' +
                    '<h2 class="bloque-titulo">DATOS DEL VEHÍCULO</h2>' +
                    '<div class="dato"><span class="etiqueta">Placa:</span> ' + escaparHTML(ticket.placa || '—') + '</div>' +
                    '<div class="dato"><span class="etiqueta">Vehículo:</span> ' + vehiculoHTML + '</div>' +
                '</section>' +
            '</div>' +
        '</section>';

    const detalleHTML =
        '<section class="bloque--detalle">' +
            '<table class="tabla-consumo" aria-label="Consumo de la orden de trabajo">' +
                '<thead><tr><th class="numero">Cant.</th><th>Descripción</th><th class="numero">P. Unit.</th><th class="numero">Total</th></tr></thead>' +
                '<tbody>' + itemsHTML + '</tbody>' +
            '</table>' +
            '<div class="impuesto"><span class="etiqueta">IGV:</span> ' + igvHTML + '</div>' +
            '<div class="totales">' +
                '<div class="total total--principal"><span>TOTAL A PAGAR:</span><span>' + formatearMonto(ticket.total) + '</span></div>' +
            '</div>' +
            '<div class="mecanico"><span class="etiqueta">Usuario:</span> ' + escaparHTML(ticket.mecanico_emisor_nombre || 'No registrado') + '</div>' +
        '</section>';

    return '<!doctype html>' +
        '<html lang="es">' +
        '<head>' +
            '<meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
            '<title>Orden de trabajo ' + escaparHTML(ticket.codigo_ticket || '') + '</title>' +
            '<style>' + estilos + '</style>' +
        '</head>' +
        '<body class="' + (esTermico ? 'ticket ticket--termico' : 'ticket ticket--hoja ticket--' + formato) + '">' +
            '<main class="ticket-contenido">' +
                encabezadoHTML +
                '<hr class="separador">' +
                datosHTML +
                '<hr class="separador">' +
                detalleHTML +
                '<p class="agradecimiento">*** GRACIAS POR SU PREFERENCIA ***</p>' +
            '</main>' +
        '</body>' +
        '</html>';
};

// Genera el PDF en el formato solicitado.
const generarPDFTicketOT = async (idComprobante, tipo = 'general', formato = '80mm') => {
    const configuracionFormato = FORMATOS_TICKET[formato];
    if (!configuracionFormato) {
        const error = new Error('El formato de ticket solicitado no es válido');
        error.code = 'FORMATO_TICKET_INVALIDO';
        throw error;
    }

    const ticket = await modelTicketOT.buscarTicketCompleto(idComprobante);
    if (!ticket) {
        const error = new Error('Ticket de orden de trabajo no encontrado');
        error.code = 'TICKET_NO_ENCONTRADO';
        throw error;
    }

    const tiposPermitidos = ['general', 'servicios', 'productos'];
    if (!tiposPermitidos.includes(tipo)) {
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
const logoDataUri = await cargarLogoSucursal(ticket.sucursal_logo_url);
    const html = construirHTMLTicket({
        ...ticket,
        sucursal_logo_data_uri: logoDataUri
    }, formato);
    let navegador;

    try {
        navegador = await puppeteer.launch({ headless: true });
        const pagina = await navegador.newPage();
        const anchoViewportMm = formato === '80mm' ? ANCHO_TICKET_MM : (formato === 'a4' ? 210 : 148);
        await pagina.setViewport({
            width: Math.round(anchoViewportMm * 96 / 25.4),
            height: formato === '80mm' ? 1 : Math.round((formato === 'a4' ? 297 : 210) * 96 / 25.4)
        });
        await pagina.setContent(html, { waitUntil: 'load' });

        let opcionesPDF;
        if (formato === '80mm') {
            const altoContenidoPx = await pagina.evaluate(() => Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            ));
            const altoTicketMm = Math.max(
                90,
                Math.ceil((altoContenidoPx * 25.4 / 96) + (MARGEN_TICKET_MM * 2))
            );
            opcionesPDF = {
                width: `${ANCHO_TICKET_MM}mm`,
                height: `${altoTicketMm}mm`,
                margin: {
                    top: `${MARGEN_TICKET_MM}mm`,
                    right: `${MARGEN_TICKET_MM}mm`,
                    bottom: `${MARGEN_TICKET_MM}mm`,
                    left: `${MARGEN_TICKET_MM}mm`
                },
                printBackground: true
            };
        } else {
            const margen = `${configuracionFormato.margen}mm`;
            opcionesPDF = {
                format: configuracionFormato.pagina,
                margin: { top: margen, right: margen, bottom: margen, left: margen },
                printBackground: true,
                preferCSSPageSize: true
            };
        }

        const bytesPDF = await pagina.pdf(opcionesPDF);

        return {
            ticket,
            nombreArchivo: 'Orden-de-trabajo-' + (ticket.codigo_ticket || ticket.id_orden_trabajo) + '-' + configuracionFormato.sufijo + '.pdf',
            contenidoPDF: Buffer.from(bytesPDF)
        };
    } finally {
        if (navegador) await navegador.close();
    }
};

// Carga el ticket, genera el PDF y lo deja disponible para el controlador de descarga.
const prepararTicketPDF = async (req, res, next) => {
    const idTicketTexto = String(req.params.idTicket || '');
    const idTicket = Number(idTicketTexto);

    if (!/^\d+$/.test(idTicketTexto) || !Number.isSafeInteger(idTicket) || idTicket < 1) {
        return res.status(400).json({
            ok: false,
            mensaje: 'El identificador del ticket no es válido'
        });
    }

    const tipo = String(req.query.tipo || 'general').toLowerCase();
    const formato = String(req.query.formato || '80mm').toLowerCase();

    try {
        res.locals.archivoTicketPDF = await generarPDFTicketOT(idTicket, tipo, formato);
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = { prepararTicketPDF };