/* Este archivo sirve para configurar el servidor o la aplicación*/
const express = require('express');
const morgan = require('morgan');
const exphbs = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const db = require('./src/config_db/config_mysql');

/* SETTINGS */
app.set('port', process.env.PORT || 3001);// Si es que existe un puerto definido para la app usalo, sino por defecto usa 4000
app.set('views', path.join(__dirname, 'src/views'));// Node sabe la ruta completa de esa carpeta.

//Establecemos y configuramos el motor de plantillas.
app.engine('.hbs', exphbs.create({
    defaultLayout: 'main',
    extname: '.hbs'
}).engine);

app.set('view engine', '.hbs'); //Usa el motor que se cofiguro anteriormente.

/* MIDELWARE */
app.use(morgan('dev')); //Utilizamos el modulo de morgan
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true })); //Acepta los datos de un formulario HTML
/* app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); */
app.use(cookieParser());

/* STATIC FILES */
//Indicamos donde estan archivos públicos.
app.use(express.static(path.join(__dirname, 'public')));

/* ROUTES */
app.use(require('./src/routes/routes'));

                /* Ejemplo de main router */

                /* const mainRouter = require("./src/routes/main.router");
                app.use(mainRouter);

                app.use("/categorias", require("./src/routes/categorias.router")); */

/* Inicializamos el servidor */
const PORT = app.get('port');
app.listen(PORT, () => {
    console.log('Servidor inicializado en puerto', PORT);
});

module.exports = app;
