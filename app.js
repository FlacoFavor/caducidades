// Registro optimizado del Service Worker para evitar bucles de actualización
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then(reg => {
        // Escucha si hay un Service Worker esperando para activarse
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    // Solo alerta si el estado cambia a 'installed' Y ya existía un controlador previo activo
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm('Nueva actualización disponible. ¿Deseas recargar la aplicación?')) {
                            window.location.reload();
                        }
                    }
                });
            }
        });
    })
    .catch(err => console.error('Error al registrar el Service Worker:', err));
}


const form = document.getElementById('form-producto');
const lista = document.getElementById('lista-productos');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value;
    const fecha = document.getElementById('fecha').value;
    
    const producto = { id: Date.now(), nombre, fecha };
    guardarProducto(producto);
    form.reset();
    render();

    // Disparar una notificación de confirmación/alerta inmediata
    enviarNotificacionLocal(nombre, fecha);
});

// Función para enviar notificación usando el Service Worker
function enviarNotificacionLocal(nombre, fecha) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('🎉 Producto Registrado', {
                body: `Se ha guardado "${nombre}" con vencimiento el ${fecha}.`,
                icon: 'https://cdn-icons-png.flaticon.com/512/1570/1570770.png',
                tag: 'nuevo-producto',
                vibrate: [200, 100, 200] // Arreglado: ahora tiene valores correctos
            });
        }).catch(err => {
            console.error("Error en SW, usando alternativa:", err);
            // Alternativa directa si el Service Worker falla en localhost
            new Notification('🎉 Producto Registrado', {
                body: `Se ha guardado "${nombre}" con vencimiento el ${fecha}.`
            });
        });
    } else {
        console.warn("Permiso denegado. Ejecuta Notification.requestPermission() en la consola.");
    }
}

// ... (El resto de las funciones guardarProducto, obtenerProductos, eliminarProducto y render se quedan igual)

function guardarProducto(prod) {
    const productos = obtenerProductos();
    productos.push(prod);
    localStorage.setItem('productos', JSON.stringify(productos));
}

function obtenerProductos() {
    return JSON.parse(localStorage.getItem('productos')) || [];
}

function eliminarProducto(id) {
    const productos = obtenerProductos().filter(p => p.id !== id);
    localStorage.setItem('productos', JSON.stringify(productos));
    render();
}

function render() {
    lista.innerHTML = '';
    const productos = obtenerProductos();
    const hoy = new Date();
	hoy.setHours(0,0,0,0);
    
    // Ordenar por fecha más próxima
    productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

    productos.forEach(p => {
        const li = document.createElement('li');
		
		 // Formatear la fecha a dd/mm/aaaa
        const partesFecha = p.fecha.split('-'); // El input date da 'aaaa-mm-dd'
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
		
        const fechaProd = new Date(p.fecha);
		fechaProd.setHours(0,0,0,0);
        const diffTiempo = fechaProd - hoy;
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
		
		let textoDias = '';

        if (diffDias < 0) {
            li.className = 'vencido';
            const diasPasados = Math.abs(diffDias);
            textoDias = `Caducó hace ${diasPasados} ${diasPasados === 1 ? 'día' : 'días'}`;
        } else if (diffDias === 0) {
            li.className = 'vencido';
            textoDias = `Caduca HOY`;
        } else if (diffDias === 1) {
            li.className = 'alerta';
            textoDias = `Caduca MAÑANA`;
        } else if (diffDias <= 7) {
            li.className = 'alerta';
            textoDias = `Quedan ${diffDias} días`;
        } else if (diffDias <= 30) {
            li.className = 'precaucion';
            textoDias = `Quedan ${diffDias} días`;
        } else {
            // Lógica para vencimientos a largo plazo (> 3 días)
            textoDias = calcularTiempoAmigable(hoy, fechaProd);
        }

        li.innerHTML = `
			<h4>${p.nombre}</h4>
			<p>Vence: ${fechaFormateada} (<small>${textoDias}</small>)</p>
            <button class="btn-del" onclick="eliminarProducto(${p.id})">&times;</button>
        `;
        lista.appendChild(li);
    });
}

// ⏳ Función auxiliar para calcular años, meses y días legibles
function calcularTiempoAmigable(fechaInicio, fechaFin) {
    let anios = fechaFin.getFullYear() - fechaInicio.getFullYear();
    let meses = fechaFin.getMonth() - fechaInicio.getMonth();
    let dias = fechaFin.getDate() - fechaInicio.getDate();

    // Ajustar días si el resultado es negativo
    if (dias < 0) {
        meses--;
        // Obtener los días del mes anterior
        const copiaInicio = new Date(fechaInicio.getTime());
        copiaInicio.setMonth(copiaInicio.getMonth() + 1);
        copiaInicio.setDate(0);
        dias += copiaInicio.getDate();
    }

    // Ajustar meses si el resultado es negativo
    if (meses < 0) {
        anios--;
        meses += 12;
    }

    // Construir la frase según el tiempo restante
    if (anios > 0) {
        let textoAnio = `${anios} ${anios === 1 ? 'año' : 'años'}`;
        let textoMes = meses > 0 ? ` y ${meses} ${meses === 1 ? 'mes' : 'meses'}` : '';
        return `Quedan ${textoAnio}${textoMes}`;
    } else if (meses > 0) {
        let textoMes = `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
        let textoDia = dias > 0 ? ` y ${dias} ${dias === 1 ? 'día' : 'días'}` : '';
        return `Quedan ${textoMes}${textoDia}`;
    } else {
        return `Quedan ${dias} días`;
    }
}

// Carga inicial
// Función para revisar caducidades pendientes
function verificarCaducidadesCriticas() {
    const productos = obtenerProductos();
    const hoy = new Date();
    
    productos.forEach(p => {
        const fechaProd = new Date(p.fecha);
        const diffTiempo = fechaProd - hoy;
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

        // Si el producto vence hoy o ya venció
        if (diffDias === 0) {
            enviarAlertaVencimiento(`⚠️ ¡Atención!`, `El producto "${p.nombre}" caduca HOY.`);
        } else if (diffDias > 0 && diffDias <= 3) {
            enviarAlertaVencimiento(`⏳ Próximo a vencer`, `A "${p.nombre}" le quedan solo ${diffDias} días.`);
        }
    });
}

// Función genérica para lanzar las alertas del sistema
function enviarAlertaVencimiento(titulo, mensaje) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: mensaje,
                icon: 'https://flaticon.com',
                tag: titulo + mensaje // Evita que se duplique la misma notificación
            });
        });
    }
}

// Carga inicial mejorada
document.addEventListener('DOMContentLoaded', () => {
    render();
    // Ejecuta la revisión automática al abrir la PWA
    verificarCaducidadesCriticas(); 
});

