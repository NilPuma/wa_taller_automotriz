function toISODate(valor) {
    // Vacíos → null
    if (valor === null || valor === undefined || valor === '') return null;

    // Ya viene en formato correcto
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return valor;
    }

    // Parsear cualquier otro formato
    const d = new Date(valor);
    if (isNaN(d.getTime())) return null;

    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

// ======================================================
// EXPORTS
// ======================================================
module.exports = { toISODate };