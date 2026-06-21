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

const btnDesplegar = document.getElementById('btn-desplegar');
const camposProducto = document.getElementById('campos-producto');

btnDesplegar.addEventListener('click', () => {
    const estaOculto = camposProducto.classList.toggle('oculto');
    
    if (estaOculto) {
        //btnDesplegar.textContent = '➕ Añadir Producto';
        btnDesplegar.classList.remove('activo');
    } else {
       // btnDesplegar.textContent = '❌ Cancelar';
        btnDesplegar.classList.add('activo');
        document.getElementById('nombre').focus(); // Coloca el cursor directamente en el input
    }
	actualizarContadorBoton();
});

function actualizarContadorBoton() {
    const totalProductos = obtenerProductos().length;
    
    // Si el panel está oculto, muestra el texto normal con el contador
    if (camposProducto.classList.contains('oculto')) {
        btnDesplegar.textContent = totalProductos > 0 
            ? `➕ Añadir Producto (${totalProductos} registrados)` 
            : '➕ Añadir Producto';
    } else {
        // Si el panel está abierto, mantiene el texto de cancelar
        btnDesplegar.textContent = '❌ Cancelar';
    }
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
	
	// Limpiar la barra de búsqueda al añadir un producto
    const inputBuscar = document.getElementById('buscar-producto');
    if (inputBuscar) inputBuscar.value = '';
	
    render();
    enviarNotificacionLocal(nombre, fecha);

    // ✨ NUEVO: Esconde los campos automáticamente tras guardar
    camposProducto.classList.add('oculto');
    //btnDesplegar.textContent = '➕ Añadir Producto';
    btnDesplegar.classList.remove('activo');
	actualizarContadorBoton();
});

// Función para enviar notificación usando el Service Worker
function enviarNotificacionLocal(nombre, fecha) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('🎉 Producto Registrado', {
                body: `Se ha guardado "${nombre}" con vencimiento el ${fecha}.`,
                icon: 'icono.svg',
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
    // Leer el filtro actual para mantener la búsqueda activa tras borrar
    const inputBuscar = document.getElementById('buscar-producto');
    const filtroActual = inputBuscar ? inputBuscar.value.toLowerCase() : '';
    
    render(filtroActual); // Renderiza manteniendo el filtro que ya estaba puesto
}

// Escuchar lo que escribe el usuario en tiempo real
document.getElementById('buscar-producto').addEventListener('input', (e) => {
    const textoBusqueda = e.target.value.toLowerCase();
    render(textoBusqueda); // Volvemos a renderizar pasando el filtro
});

// Modifica la cabecera de tu función render para aceptar el filtro
function render(filtro = '') {
    lista.innerHTML = '';
    let productos = obtenerProductos();
    const hoy = new Date();
	hoy.setHours(0,0,0,0);
	
	// Filtrar si hay texto escrito
    if (filtro) {
        productos = productos.filter(p => p.nombre.toLowerCase().includes(filtro));
    }
    
    // Ordenar por fecha más próxima
    productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
	
	const fragmento = document.createDocumentFragment(); // Contenedor temporal en memoria
	
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
	    fragmento.appendChild(li); // Se añade al fragmento en memoria, no al DOM real todavía
    });
	lista.appendChild(fragmento);
	
	actualizarContadorBoton();
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

// Solicitar permisos de notificación al usuario de forma activa
function solicitarPermisoNotificaciones() {
    const btnPermiso = document.getElementById('btn-permiso');
    if (!btnPermiso) return;

    // Si ya está aceptado o denegado permanentemente, ocultamos el botón
    if (Notification.permission !== 'default') {
        btnPermiso.style.display = 'none';
        if (Notification.permission === 'granted') {
            ejecutarVerificacionUnica();
        }
        return;
    }

    // Si está en 'default' (ignorado u omitido), mostramos nuestro botón
    btnPermiso.style.display = 'block';

    btnPermiso.onclick = () => {
        Notification.requestPermission().then(permiso => {
            if (permiso === 'granted') {
                btnPermiso.style.display = 'none';
                ejecutarVerificacionUnica();
            } else if (permiso === 'denied') {
                btnPermiso.style.display = 'none';
                alert('Bloqueaste las notificaciones. Si cambias de opinión, actívalas desde el candado de la URL.');
            }
        });
    };
}

// Variable cerrojo para evitar que llamadas simultáneas dupliquen procesos
let revisionEjecutada = false;

function ejecutarVerificacionUnica() {
    if (revisionEjecutada) return;
    revisionEjecutada = true;
    verificarCaducidadesCriticas();
}

// Función para revisar caducidades pendientes
function verificarCaducidadesCriticas() {
    if (Notification.permission !== 'granted') return;

    const productos = obtenerProductos();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 
    
    productos.forEach(p => {
        const fechaProd = new Date(p.fecha);
        fechaProd.setHours(0, 0, 0, 0); 
        
        const diffTiempo = fechaProd - hoy;
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

        if (diffDias === 0) {
            enviarAlertaVencimiento(`⚠️ ¡Atención!`, `El producto "${p.nombre}" caduca HOY.`, p.id);
        } else if (diffDias > 0 && diffDias <= 3) {
            enviarAlertaVencimiento(`⏳ Próximo a vencer`, `A "${p.nombre}" le quedan solo ${diffDias} días.`, p.id);
        }
    });
}

// Función genérica para lanzar las alertas usando el ID como TAG único anti-duplicados
function enviarAlertaVencimiento(titulo, mensaje, idProducto) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: mensaje,
                icon: 'icono.svg',
                tag: `vencimiento-${idProducto}` 
            });
        }).catch(() => {
            new Notification(titulo, { body: mensaje });
        });
    }
}

// Carga inicial unificada sin hilos duplicados
document.addEventListener('DOMContentLoaded', () => {
    render();
    solicitarPermisoNotificaciones();
	actualizarContadorBoton();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
            ejecutarVerificacionUnica(); 
        });
    } else {
        ejecutarVerificacionUnica();
    }
});
