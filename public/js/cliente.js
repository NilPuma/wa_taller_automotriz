/* Navegación entre las vistas visuales del portal Cliente. */
(function () {
    const vistas = {
        '#dashboardCliente': { tipo: 'dashboard' },
        '#citasCliente': { plantilla: 'templateCitasCliente' },
        '#vehiculosCliente': { plantilla: 'templateVehiculosCliente' },
        '#ordenesCliente': { plantilla: 'templateOrdenesCliente' },
        '#cotizacionesCliente': { plantilla: 'templateCotizacionesCliente' },
        '#historialCliente': { plantilla: 'templateHistorialCliente' },
        '#perfilCliente': { plantilla: 'templatePerfilCliente' }
    };

    function iniciarNavegacionCliente() {
        const contenedor = document.querySelector('#contenedorReactivo');
        const dashboardInicial = document.querySelector('#dashboard');

        if (!contenedor || !dashboardInicial) return;

        // Conserva una copia para volver al dashboard después de cambiar de vista.
        const dashboard = dashboardInicial.cloneNode(true);

        function mostrarVista(hash) {
            const vista = vistas[hash];
            if (!vista) return;

            let contenido;

            if (vista.tipo === 'dashboard') {
                contenido = dashboard.cloneNode(true);
            } else {
                const plantilla = document.getElementById(vista.plantilla);
                if (!plantilla) return;
                contenido = plantilla.content.cloneNode(true);
            }

            contenedor.replaceChildren(contenido);
            actualizarMenuActivo(hash);
        }

        function actualizarMenuActivo(hashActivo) {
            document.querySelectorAll('#menuItems a[href^="#"]').forEach(enlace => {
                const activo = enlace.getAttribute('href') === hashActivo;
                enlace.classList.toggle('active', activo);

                if (activo) {
                    enlace.setAttribute('aria-current', 'page');
                } else {
                    enlace.removeAttribute('aria-current');
                }
            });
        }

        // Atiende los enlaces del menú y los accesos rápidos que apuntan a una vista.
        document.addEventListener('click', event => {
            const enlace = event.target.closest('a[href^="#"]');
            if (!enlace) return;

            const hash = enlace.getAttribute('href');
            if (!vistas[hash]) return;

            event.preventDefault();
            mostrarVista(hash);
        });

        actualizarMenuActivo('#dashboardCliente');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarNavegacionCliente, { once: true });
    } else {
        iniciarNavegacionCliente();
    }
})();