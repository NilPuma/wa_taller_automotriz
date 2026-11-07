// Redondea importes a dos decimales para mantener los cálculos monetarios consistentes.
const redondearMonto = (monto) => {
    const valor = Number(monto);
    if (!Number.isFinite(valor)) {
        throw new Error('El importe debe ser numérico');
    }
    return Number((Math.round((valor + Number.EPSILON) * 100) / 100).toFixed(2));
};

// Suma conceptos cuyos importes ya incluyen el IGV.
const sumarImportesIncluidos = (items = []) => {
    if (!Array.isArray(items)) {
        throw new Error('Los conceptos deben enviarse como una lista');
    }

    return redondearMonto(items.reduce(
        (acumulado, item) => acumulado + Number(item.subtotal || 0),
        0
    ));
};

// Separa base e impuesto cuando el total recibido ya incluye el IGV.
const calcularDesgloseIgvIncluido = (montoFinal, tasaIgv) => {
    const total = redondearMonto(montoFinal);
    const tasa = Number(tasaIgv);

    if (total < 0) {
        throw new Error('El importe no puede ser negativo');
    }
    if (!Number.isFinite(tasa) || tasa < 0) {
        throw new Error('La tasa de IGV de la sucursal no es válida');
    }

    const subtotal = tasa > 0
        ? redondearMonto(total / (1 + tasa / 100))
        : total;
    const igv = redondearMonto(total - subtotal);

    return {
        subtotal,
        igv,
        tasa_igv: redondearMonto(tasa),
        total
    };
};

// Expone las operaciones de impuesto por medio de la petición.
// Los modelos las ejecutan dentro de sus transacciones para usar datos actuales de la base.
const prepararOperacionesImpuestos = (req, res, next) => {
    req.operacionesImpuestos = {
        redondearMonto,
        sumarImportesIncluidos,
        calcularDesgloseIgvIncluido
    };
    return next();
};

module.exports = {
    redondearMonto,
    sumarImportesIncluidos,
    calcularDesgloseIgvIncluido,
    prepararOperacionesImpuestos
};