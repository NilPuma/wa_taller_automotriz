const multer = require('multer');
const path = require('path');
const fs = require('fs');

const carpetaCertificados = path.join(__dirname, '../../public/uploads/certificados');

if (!fs.existsSync(carpetaCertificados)) {

    fs.mkdirSync(
        carpetaCertificados,{
            recursive: true
        }
    );

}

//Configuramos multer 
const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null,carpetaCertificados);
    },


    filename: (req, file, cb) => {

        const extension = path.extname(file.originalname);
        const nombre = `certificado_${Date.now()}${extension}`;
        cb(null, nombre);
    }

});
const upload = multer({storage: storage, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);

        } else {

            cb(new Error('Solo se permiten archivos PDF'));
        }
    },

    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

module.exports = {
    upload
}