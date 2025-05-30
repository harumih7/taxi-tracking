// Variables globales
let viajes = JSON.parse(localStorage.getItem('viajesTaxi')) || [];
let watchID = null;
let rutaCoords = [];
let inicioViajeTime = null;
let distanciaReal = 0; // Nueva variable para distancia calculada por API

// Referencias DOM
const homeDiv = document.getElementById('home');
const manualDiv = document.getElementById('manual');
const autoDiv = document.getElementById('automatico');
const historialDiv = document.getElementById('historial');

const btnManual = document.getElementById('btnManual');
const btnAuto = document.getElementById('btnAuto');
const btnHistorial = document.getElementById('btnHistorial');

const volverHome1 = document.getElementById('volverHome1');
const volverHome2 = document.getElementById('volverHome2');
const volverHome3 = document.getElementById('volverHome3');

const btnInicioViaje = document.getElementById('btnInicioViaje');
const btnFinViaje = document.getElementById('btnFinViaje');
const autoForm = document.getElementById('autoForm');
const mapDiv = document.getElementById('map');

// Función para mostrar solo una sección
function mostrar(seccion) {
  [homeDiv, manualDiv, autoDiv, historialDiv].forEach(div => {
    div.classList.add('hidden');
  });
  seccion.classList.remove('hidden');
}

// Mostrar home al inicio
mostrar(homeDiv);

// Botones de navegación
btnManual.onclick = () => mostrar(manualDiv);
btnAuto.onclick = () => mostrar(autoDiv);
btnHistorial.onclick = () => {
  mostrar(historialDiv);
  mostrarHistorial();
};

volverHome1.onclick = () => mostrar(homeDiv);
volverHome2.onclick = () => {
  mostrar(homeDiv);
  resetAuto();
};
volverHome3.onclick = () => mostrar(homeDiv);

// Guardar viaje manual
document.getElementById('guardarManual').onclick = () => {
  const km = parseFloat(document.getElementById('mKilometraje').value);
  const pers = parseInt(document.getElementById('mPersonas').value);
  const local = document.getElementById('mLocalInicio').value.trim();
  const hi = document.getElementById('mHoraInicio').value;
  const hf = document.getElementById('mHoraFin').value;
  const espera = parseInt(document.getElementById('mTiempoEspera').value);

  if (isNaN(km) || km < 0 || isNaN(pers) || pers < 1 || !local || !hi || !hf || isNaN(espera) || espera < 0) {
    alert('Por favor, completa todos los campos correctamente');
    return;
  }

  const viaje = {
    tipo: 'manual',
    kilometraje: km,
    personas: pers,
    localInicio: local,
    horaInicio: hi,
    horaFin: hf,
    tiempoEspera: espera,
    fechaRegistro: new Date().toISOString()
  };

  viajes.push(viaje);
  localStorage.setItem('viajesTaxi', JSON.stringify(viajes));
  alert('Viaje manual guardado');
  mostrar(homeDiv);
  limpiarManual();
};

function limpiarManual() {
  document.getElementById('mKilometraje').value = '';
  document.getElementById('mPersonas').value = '';
  document.getElementById('mLocalInicio').value = '';
  document.getElementById('mHoraInicio').value = '';
  document.getElementById('mHoraFin').value = '';
  document.getElementById('mTiempoEspera').value = '';
}

// Registro Automático

btnInicioViaje.onclick = () => {
  if (!navigator.geolocation) {
    alert('Geolocalización no soportada por tu navegador');
    return;
  }

  rutaCoords = [];
  inicioViajeTime = new Date();
  distanciaReal = 0; // reset distancia al inicio

  mostrar(autoDiv);

  btnInicioViaje.disabled = true;
  btnFinViaje.disabled = false;
  autoForm.classList.add('hidden');
  mapDiv.classList.remove('hidden');

  // Inicializa mapa con Leaflet
  initMap();

  // Empieza a registrar coordenadas
  watchID = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    rutaCoords.push([latitude, longitude]);
    actualizarRutaEnMapa();
  }, err => {
    console.error('Error geolocalización:', err);
    alert('Error obteniendo ubicación');
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
};

btnFinViaje.onclick = async () => {
  if (watchID !== null) {
    navigator.geolocation.clearWatch(watchID);
    watchID = null;
  }

  btnInicioViaje.disabled = false;
  btnFinViaje.disabled = true;

  if (rutaCoords.length < 2) {
    alert('No se pudo registrar la ruta correctamente');
    resetAuto();
    return;
  }

  try {
    distanciaReal = await obtenerDistanciaORS(rutaCoords);
    alert(`Distancia calculada: ${distanciaReal.toFixed(2)} km`);
  } catch(e) {
    console.error('Error al obtener distancia ORS:', e);
    alert('Error calculando distancia real. Intenta de nuevo.');
    resetAuto();
    return;
  }

  // Mostrar formulario para completar datos y guardar
  autoForm.classList.remove('hidden');
  mapDiv.classList.add('hidden');
};

// Botón para guardar viaje automático
document.getElementById('guardarAuto').onclick = () => {
  const espera = parseInt(document.getElementById('aTiempoEspera').value);
  const pers = parseInt(document.getElementById('aPersonas').value);
  const local = document.getElementById('aLocalInicio').value.trim();

  if (isNaN(espera) || espera < 0 || isNaN(pers) || pers < 1 || !local) {
    alert('Por favor, completa todos los campos correctamente');
    return;
  }

  if(distanciaReal === 0){
    alert('No se ha calculado la distancia real. Por favor, reinicia el viaje automático.');
    return;
  }

  // Hora inicio y fin (fechas)
  const horaInicio = inicioViajeTime.toTimeString().slice(0,5);
  const horaFin = new Date().toTimeString().slice(0,5);

  const viaje = {
    tipo: 'automatico',
    kilometraje: distanciaReal.toFixed(2),
    personas: pers,
    localInicio: local,
    horaInicio: horaInicio,
    horaFin: horaFin,
    tiempoEspera: espera,
    fechaRegistro: new Date().toISOString()
  };

  viajes.push(viaje);
  localStorage.setItem('viajesTaxi', JSON.stringify(viajes));
  alert('Viaje automático guardado');
  mostrar(homeDiv);
  resetAuto();
  limpiarAutoForm();
};

function resetAuto() {
  rutaCoords = [];
  inicioViajeTime = null;
  distanciaReal = 0;
  autoForm.classList.add('hidden');
  mapDiv.classList.add('hidden');
  btnInicioViaje.disabled = false;
  btnFinViaje.disabled = true;
}

function limpiarAutoForm() {
  document.getElementById('aTiempoEspera').value = '';
  document.getElementById('aPersonas').value = '';
  document.getElementById('aLocalInicio').value = '';
}

// Mapa con Leaflet
let map = null;
let polyline = null;

function initMap() {
  if (map) {
    map.remove();
  }
  map = L.map('map').setView([0,0], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  polyline = L.polyline([], {color: 'blue'}).addTo(map);
}

function actualizarRutaEnMapa() {
  polyline.setLatLngs(rutaCoords);
  if (rutaCoords.length > 0) {
    map.setView(rutaCoords[rutaCoords.length-1], 16);
  }
}

// Función para obtener distancia real con OpenRouteService
async function obtenerDistanciaORS(coords) {
  if(coords.length < 2) return 0;

  // Transformar coords a formato [lon, lat]
  const coordinates = coords.map(c => [c[1], c[0]]);

  const body = {
    coordinates: coordinates,
    units: "km",
    // Perfil puede ser "driving-car", "cycling-regular", "foot-walking", etc.
    profile: "driving-car",
  };

  // Cambia esto por tu API key gratuita de OpenRouteService
  const apiKey = '5b3ce3597851110001cf62483786c332b1f2414da7c9826f75d5042c';

  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if(!response.ok){
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // La distancia está en metros, convertimos a km
  const distanciaMetros = data.features[0].properties.summary.distance;
  const distanciaKm = distanciaMetros / 1000;

  return distanciaKm;
}





















function mostrarHistorial(filtros = {}) {
  const listaDiv = document.getElementById('listaViajes');
  listaDiv.innerHTML = '';

  let viajesFiltrados = viajes;

  // Filtrar por fecha desde
  if (filtros.fechaDesde) {
    const desde = new Date(filtros.fechaDesde); // fechaDesde viene como ISO string de datetime-local
    viajesFiltrados = viajesFiltrados.filter(v => new Date(v.fechaRegistro) >= desde);
  }

  // Filtrar por fecha hasta
  if (filtros.fechaHasta) {
    const hasta = new Date(filtros.fechaHasta);
    hasta.setHours(23, 59, 59, 999); // para incluir el día completo en el filtro hasta
    viajesFiltrados = viajesFiltrados.filter(v => new Date(v.fechaRegistro) <= hasta);
  }

  // Filtrar por local de inicio
  if (filtros.localInicio && filtros.localInicio.trim() !== '') {
    const filtroLocal = filtros.localInicio.trim().toLowerCase();
    viajesFiltrados = viajesFiltrados.filter(v => v.localInicio.toLowerCase().includes(filtroLocal));
  }

  if (viajesFiltrados.length === 0) {
    listaDiv.textContent = 'No hay viajes registrados con esos filtros.';
    return;
  }

  viajesFiltrados.forEach((viaje, index) => {
    const div = document.createElement('div');
    div.className = 'viaje-item';

    div.innerHTML = `
      <p><strong>Tipo:</strong> ${viaje.tipo}</p>
      <p><strong>Kilometraje:</strong> ${viaje.kilometraje}</p>
      <p><strong>Personas:</strong> ${viaje.personas}</p>
      <p><strong>Local Inicio:</strong> ${viaje.localInicio}</p>
      <p><strong>Hora Inicio:</strong> ${viaje.horaInicio}</p>
      <p><strong>Hora Fin:</strong> ${viaje.horaFin}</p>
      <p><strong>Tiempo Espera:</strong> ${viaje.tiempoEspera}</p>
      <button onclick="eliminarViaje(${index})">Eliminar</button>
      <hr>
    `;

    listaDiv.appendChild(div);
  });

  // Asignar evento a todos los botones eliminar
  document.querySelectorAll('.btnEliminar').forEach(btn => {
    btn.onclick = function() {
      const idx = this.getAttribute('data-index');
      eliminarViaje(idx);
    }
  });
}

function eliminarViaje(index) {
  viajes.splice(index, 1); // eliminar viaje del arreglo
  localStorage.setItem('viajesTaxi', JSON.stringify(viajes)); // actualizar localStorage
  mostrarHistorial(); // refrescar listado

}

// Evento para aplicar filtro
document.getElementById('btnAplicarFiltro').addEventListener('click', () => {
  const fechaDesde = document.getElementById('filtroFechaDesde').value; // datetime-local string
  const fechaHasta = document.getElementById('filtroFechaHasta').value; // datetime-local string
  const localInicio = document.getElementById('filtroLocalInicio').value;

  mostrarHistorial({ fechaDesde, fechaHasta, localInicio });
});
















// Exportar CSV con filtros aplicados
document.getElementById('btnExportarCSV').addEventListener('click', () => {
  const fechaDesde = document.getElementById('filtroFechaDesde').value;
  const fechaHasta = document.getElementById('filtroFechaHasta').value;
  const localInicio = document.getElementById('filtroLocalInicio').value;

  exportarCSV({ fechaDesde, fechaHasta, localInicio });
});

// Exportar datos filtrados como CSV
function exportarCSV(filtros = {}) {
  let viajesFiltrados = viajes;

  if (filtros.fechaDesde) {
    const desde = new Date(filtros.fechaDesde);
    viajesFiltrados = viajesFiltrados.filter(v => new Date(v.fechaRegistro) >= desde);
  }

  if (filtros.fechaHasta) {
    const hasta = new Date(filtros.fechaHasta);
    hasta.setHours(23, 59, 59, 999);
    viajesFiltrados = viajesFiltrados.filter(v => new Date(v.fechaRegistro) <= hasta);
  }

  if (filtros.localInicio && filtros.localInicio.trim() !== '') {
    const filtroLocal = filtros.localInicio.trim().toLowerCase();
    viajesFiltrados = viajesFiltrados.filter(v => v.localInicio.toLowerCase().includes(filtroLocal));
  }

  if (viajesFiltrados.length === 0) {
    alert('No hay viajes para exportar con esos filtros.');
    return;
  }

  const cabeceras = ['Tipo', 'Kilometraje', 'Personas', 'Local de inicio', 'Hora inicio', 'Hora fin', 'Tiempo espera', 'Fecha registro'];
  const filas = viajesFiltrados.map(v => [
    v.tipo,
    v.kilometraje,
    v.personas,
    `"${v.localInicio.replace(/"/g, '""')}"`,
    v.horaInicio,
    v.horaFin,
    v.tiempoEspera,
    new Date(v.fechaRegistro).toLocaleString()
  ].join(','));

  const csvContent = [cabeceras.join(','), ...filas].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `viajes_filtrados_${Date.now()}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatearFechaHora(fechaISO) {
  if (!fechaISO) return null;
  const dt = new Date(fechaISO);
  const dia = dt.getDate();
  const mes = dt.getMonth() + 1; // enero = 0
  const anio = dt.getFullYear();
  const hora = dt.getHours();
  const min = dt.getMinutes();
  const seg = dt.getSeconds();

  return `${dia}/${mes}/${anio}, ${hora}:${min.toString().padStart(2,'0')}:${seg.toString().padStart(2,'0')}`;
}
