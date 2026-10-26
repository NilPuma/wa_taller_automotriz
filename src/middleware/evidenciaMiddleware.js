const multer = require('multer');
const path = require('path');
const fs = require('fs');

const carpetaEvidencias = path.join(__dirname, '../../public/uploads/evidencias');

if (!fs.existsSync(carpetaEvidencias)) {
    fs.mkdirSync(carpetaEvidencias, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, carpetaEvidencias);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const nombre = `evidencia_${Date.now()}_${Math.round(Math.random() * 1E9)}${extension}`;
        cb(null, nombre);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (permitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    }
});

module.exports = { upload };