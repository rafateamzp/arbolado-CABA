// ============================================================================
// 1. CONFIGURACIÓN DE SUPABASE
// ============================================================================
const SUPABASE_URL = 'https://kmbdzghjyktbavokbkmy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttYmR6Z2hqeWt0YmF2b2tia215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NzQ2NDYsImV4cCI6MjA5NDE1MDY0Nn0.Mq-Z-m9kvAiiFHMBp-rqRgBblUm7T7TBzbS3CSwvIc0';

let supabaseClient = null;

if (typeof window.supabase === 'undefined') {
  console.error('❌ ERROR: Librería de Supabase no cargada.');
} else {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase conectado.');
}

// ============================================================================
// 1bis. TOGGLE DE TEMA CLARO / OSCURO
// ============================================================================
const THEME_KEY = 'arbolado_theme';

function aplicarTemaDesdePreferencia() {
  const saved = localStorage.getItem(THEME_KEY);
  const btn = document.getElementById('btn-theme-toggle');

  if (saved === 'dark') {
    document.body.classList.add('theme-dark');
    if (btn) btn.textContent = '☀️ Modo claro';
  } else {
    document.body.classList.remove('theme-dark');
    if (btn) btn.textContent = '🌙 Modo oscuro';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  aplicarTemaDesdePreferencia();

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('theme-dark');
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      btn.textContent = isDark ? '☀️ Modo claro' : '🌙 Modo oscuro';

      // Opcional: sincronizar base del mapa (si definimos baseLight/baseDark)
      if (typeof sincronizarBaseConTema === 'function') {
        sincronizarBaseConTema(isDark);
      }
    });
  }
});

// ============================================================================
// 2. INICIALIZACIÓN DEL MAPA
// ============================================================================
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loading-overlay';
loadingOverlay.innerHTML = '⏳ Cargando visor .....';
loadingOverlay.style.cssText = `
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95); padding: 25px 40px; border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 9999; font-family: Arial, sans-serif;
  font-size: 18px; font-weight: bold; color: #333; text-align: center;
  border: 2px solid #3498db;
`;
document.body.appendChild(loadingOverlay);

const VISTA_INICIAL_CENTRO = [-34.60, -58.40];
const VISTA_INICIAL_ZOOM = 11.5;

var mapa = L.map('contenedor_de_mapa', { zoomControl: false }).setView(
VISTA_INICIAL_CENTRO,
  VISTA_INICIAL_ZOOM
);
L.control.zoom({ position: 'topright' }).addTo(mapa);

// Capas base: clara y oscura
const baseLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
});

const baseDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
});

// Capa inicial (clara)
baseLight.addTo(mapa);
let currentBase = 'light';

// ============================================================================
// 3. LÍMITES DE CABA (GeoJSON)
// ============================================================================
fetch('./data/CABA.geojson')
  .then(response => {
    if (!response.ok) throw new Error('No se pudo cargar el contorno de CABA');
    return response.json();
  })
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#e74c3c',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0
      }
    }).addTo(mapa);
    console.log('✅ Capa de límites de CABA cargada.');
  })
  .catch(error => {
    console.warn('⚠️ No se pudo cargar el contorno de CABA:', error);
  });

// ============================================================================
// 4. CAPAS (Clusters y Búsqueda)
// ============================================================================
let clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 120,
  disableClusteringAtZoom: 16,
  removeOutsideVisibleBounds: true,
  animate: false,
  spiderfyOnMaxZoom: false,
  chunkedLoading: true,
  chunkInterval: 200,
  chunkDelay: 50
});

let marcadoresBusqueda = L.layerGroup();
mapa.addLayer(clusterGroup);

// ============================================================================
// 5. COLORES Y GENERADOR DINÁMICO
// ============================================================================
const coloresPorEspecieBase = {
  'Tipuana tipu': '#FF6B6B',
  'Peltophorum dubium': '#FFA500',
  'Fraxinus pennsylvanica': '#4ECDC4',
  'Jacaranda mimosifolia': '#9B59B6',
  'Tilia x moltkei': '#3498DB',
  'Liquidambar styraciflua': '#E74C3C',
  'Phoenix loureiri': '#F1C40F',
  'Phoenix roebelenii': '#F39C12',
  'Ficus benjamina': '#27AE60',
  'Washingtonia filifera': '#C0392B',
  'No identificado': '#95A5A6'
};

function generarColorPorEspecie(nombre) {
  if (!nombre) return '#95A5A6';
  if (coloresPorEspecieBase[nombre]) return coloresPorEspecieBase[nombre];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

function obtenerColorPorEspecie(nombre) {
  return generarColorPorEspecie(nombre);
}

// ============================================================================
// 6. GENERADOR DE ICONOS DE ÁRBOL (SVG)
// ============================================================================
function crearIconoArbol(color) {
  return L.divIcon({
    className: 'arbol-icono',
    html: `
      <svg viewBox="0 0 24 24" width="20" height="24" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="16" width="4" height="6" fill="#8B4513" rx="1"/>
        <path d="M12 2 L4 14 L20 14 Z" fill="${color}" stroke="white" stroke-width="1"/>
        <path d="M12 6 L6 16 L18 16 Z" fill="${color}" stroke="white" stroke-width="1"/>
        <path d="M12 10 L8 18 L16 18 Z" fill="${color}" stroke="white" stroke-width="1"/>
      </svg>
    `,
    iconSize: [20, 24],
    iconAnchor: [10, 24],
    popupAnchor: [0, -20]
  });
}

// ============================================================================
// 7. CARGA DE CLUSTERS (PAGINADA)
// ============================================================================
async function cargarClusters() {
  console.log('🌳 Cargando clusters...');

  if (!supabaseClient) {
    console.error('❌ Supabase no está disponible. No se pueden cargar clusters.');
    return;
  }

  const LIMITE_TOTAL = 20000;
  const TAMANO_LOTE = 2000;
  let totalCargados = 0;
  let offset = 0;
  let erroresCoordenadas = 0;

  while (totalCargados < LIMITE_TOTAL) {
    console.log(`🔄 Lote ${Math.floor(offset / TAMANO_LOTE) + 1} (Offset: ${offset})...`);

    const { data, error } = await supabaseClient
      .from('arbolado')
      .select('id, nombre_cie, nombre_comun, direccion_, altura_arb, diametro_a, lat, long, comuna_id')
      .not('lat', 'is', null)
      .not('long', 'is', null)
      .range(offset, offset + TAMANO_LOTE - 1);

    if (error) {
      console.error('❌ Error en lote:', error);
      break;
    }

    if (!data || data.length === 0) {
      console.log('✅ Fin de los datos.');
      break;
    }

    console.log(`📊 Lote cargado: ${data.length} árboles.`);

    data.forEach(feature => {
      const lat = parseFloat(feature.lat);
      const lon = parseFloat(feature.long);

      if (isNaN(lat) || isNaN(lon)) {
        erroresCoordenadas++;
        return;
      }

      const nombreCientifico = feature.nombre_cie || 'No identificado';
      const nombreComun = feature.nombre_comun || 'Sin nombre común';
      const color = obtenerColorPorEspecie(nombreCientifico);

      const marker = L.marker([lat, lon], {
        icon: crearIconoArbol(color)
      });

      const popupContent = `
        <div style="min-width: 180px;">
          <h3 style="margin: 0 0 6px 0; color: #2c3e50; font-size: 15px;">
            ${
              nombreComun !== 'Sin nombre común'
                ? `${nombreComun} <span style="font-size: 11px; color: #888;">(${nombreCientifico})</span>`
                : nombreCientifico
            }
          </h3>
          <div style="font-size: 13px; color: #555; line-height: 1.4;">
            <strong>📍 Ubicación:</strong> ${feature.direccion_ || 'N/A'}<br>
            <strong>🏛 Comuna:</strong> ${feature.comuna_id || 'N/A'}<br>
            <strong>📏 Altura:</strong> ${feature.altura_arb ? `${feature.altura_arb} m` : 'N/A'}<br>
            <strong>📐 Diámetro:</strong> ${feature.diametro_a ? `${feature.diametro_a} cm` : 'N/A'}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      clusterGroup.addLayer(marker);
    });

    totalCargados += data.length;
    offset += TAMANO_LOTE;
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`✅ Carga finalizada. Total: ${totalCargados} árboles.`);
  if (erroresCoordenadas > 0) {
    console.warn(`⚠️ Saltados ${erroresCoordenadas} árboles por coordenadas inválidas.`);
  }

  if (typeof inicializarHeatmap === 'function') {
    inicializarHeatmap();
  }
}

// Helper genérico de retry
async function fetchWithRetry(fn, maxRetries = 2, delayMs = 800) {
  let attempt = 0;
  while (true) {
    const { data, error } = await fn();

    if (!error) return { data, error: null };

    console.warn(`⚠️ Supabase error (intento ${attempt + 1}):`, error);

    if (attempt >= maxRetries) {
      return { data: null, error };
    }

    attempt++;
    await new Promise(r => setTimeout(r, delayMs));
  }
}

// ============================================================================
// 8. MAPA DE CALOR (HEATMAP)
// ============================================================================
let heatLayer = null;
let heatmapActive = false;
let datosHeatmapCache = null;

function inicializarHeatmap() {
  const btnHeatmap = document.getElementById('btn-heatmap');

  if (!btnHeatmap) {
    console.error('❌ ERROR: Botón de Heatmap no encontrado.');
    return;
  }

  if (typeof L === 'undefined' || typeof L.heatLayer !== 'function') {
    console.error('❌ ERROR: Librería Leaflet.heat no cargada.');
    btnHeatmap.disabled = true;
    btnHeatmap.style.backgroundColor = '#95a5a6';
    btnHeatmap.title = 'Error: Librería no cargada';
    return;
  }

  console.log('✅ Botón de Heatmap inicializado (Modo Global).');

  btnHeatmap.addEventListener('click', async () => {
    console.log('🔥 Clic en Heatmap. Estado:', heatmapActive);

    if (heatmapActive) {
      if (heatLayer) {
        mapa.removeLayer(heatLayer);
        heatLayer = null;
      }
      btnHeatmap.textContent = ' Ver Mapa de calor 🔥';
      btnHeatmap.style.backgroundColor = '#e74c3c';
      btnHeatmap.classList.remove('active');
      heatmapActive = false;
      console.log('🗑️ Heatmap desactivado.');
    } else {
      console.log('📡 Solicitando muestra global de árboles...');

      if (!datosHeatmapCache) {
        // feedback visual mientras carga
        const textoOriginal = btnHeatmap.textContent;
        btnHeatmap.textContent = 'Cargando mapa de calor...';
        btnHeatmap.disabled = true;

        try {
          const { data, error } = await fetchWithRetry(
            () => supabaseClient.rpc('get_muestra_heatmap', { limite: 5000 }),
            2,
            800
          );

          if (error) {
            console.error('❌ Error de Supabase (heatmap):', error);
            alert(
              'No se pudo cargar el mapa de calor.\n' +
              'Puede ser un problema momentáneo de la base de datos.\n' +
              'Probá nuevamente en unos segundos.'
            );
            btnHeatmap.textContent = textoOriginal;
            btnHeatmap.disabled = false;
            return;
          }

          datosHeatmapCache = (data || []).map(row => [row.lat, row.lon, 0.8]);
          console.log(`✅ Datos cargados: ${datosHeatmapCache.length} puntos.`);
        } catch (err) {
          console.error('❌ Error al obtener datos del heatmap:', err);
          alert(
            'Error al cargar el mapa de calor.\n' +
            'Revisá la consola o intentá nuevamente en unos segundos.'
          );
          btnHeatmap.textContent = textoOriginal;
          btnHeatmap.disabled = false;
          return;
        } finally {
          btnHeatmap.disabled = false;
        }
      }

      if (!datosHeatmapCache || datosHeatmapCache.length === 0) {
        alert('No se encontraron datos para el mapa de calor.');
        return;
      }

      try {
        heatLayer = L.heatLayer(datosHeatmapCache, {
          radius: 30,
          blur: 20,
          maxZoom: 17,
          max: 1.0,
          gradient: {
            0.2: 'lime',
            0.4: 'yellow',
            0.7: 'red',
            0.9: 'darkred'
          }
        }).addTo(mapa);

        btnHeatmap.textContent = '❌ Ocultar mapa de calor';
        btnHeatmap.style.backgroundColor = '#27ae60';
        btnHeatmap.classList.add('active');
        heatmapActive = true;
        console.log(`✅ Heatmap global generado con ${datosHeatmapCache.length} puntos.`);
      } catch (err) {
        console.error('❌ Error al crear el heatmap:', err);
        alert('Error al generar el mapa de calor. Revisá la consola.');
      }
    }
  });
}

// ============================================================================
// 9. INTERFAZ DE BÚSQUEDA
// ============================================================================
const inputBusquedaEspecie = document.getElementById('input-busqueda-especie');
const inputBusquedaDireccion = document.getElementById('input-busqueda-direccion');
const btnBuscarEspecie = document.getElementById('btn-buscar-especie');
const btnBuscarDireccion = document.getElementById('btn-buscar-direccion');
const filtroEspecie = document.getElementById('filtro-especie');
const btnLimpiar = document.getElementById('btn-limpiar');
const listaResultados = document.getElementById('resultados-busqueda');

async function cargarEspeciesParaFiltro() {
  if (!filtroEspecie || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from('arbolado')
    .select('nombre_cie, nombre_comun')
    .not('nombre_cie, nombre_comun', 'is', null)
    .limit(5000);

  if (error) {
    console.error('❌ Error al cargar especies:', error);
    return;
  }

  const especiesUnicas = [...new Set(data.map(item => item.nombre_cie))].sort();

  especiesUnicas.forEach(nombre => {
    if (nombre && nombre.trim() !== '') {
      const option = document.createElement('option');
      option.value = nombre;
      option.textContent = nombre;
      filtroEspecie.appendChild(option);
    }
  });
}

async function buscarPorEspecie() {
  const termino = inputBusquedaEspecie ? inputBusquedaEspecie.value.trim() : '';
  const especieFiltro = filtroEspecie ? filtroEspecie.value : '';

  if (!termino && !especieFiltro) {
    limpiarBusqueda();
    return;
  }

  mapa.removeLayer(clusterGroup);

  if (listaResultados) {
    listaResultados.innerHTML =
      '<div class="resultado-item">Buscando especies...</div>';
    listaResultados.classList.add('activa');
  }

  let query = supabaseClient
    .from('arbolado')
    .select('id, nombre_cie, nombre_comun, direccion_, altura_arb, diametro_a, lat, long, comuna_id')
    .limit(100);

  if (termino) {
    query = query.or(
      `nombre_comun.ilike.%${termino}%,nombre_cie.ilike.%${termino}%`
    );
  }

  if (especieFiltro) {
    query = query.eq('nombre_cie', especieFiltro);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error en búsqueda por especie:', error);
    if (listaResultados) {
      listaResultados.innerHTML =
        '<div class="resultado-item">Error al buscar.</div>';
    }
    return;
  }

  mostrarResultadosBusqueda(data || []);
}

async function buscarPorDireccion() {
  const termino = inputBusquedaDireccion ? inputBusquedaDireccion.value.trim() : '';

  if (!termino) {
    limpiarBusqueda();
    return;
  }

  mapa.removeLayer(clusterGroup);

  if (listaResultados) {
    listaResultados.innerHTML =
      '<div class="resultado-item">Buscando direcciones...</div>';
    listaResultados.classList.add('activa');
  }

  let query = supabaseClient
    .from('arbolado')
    .select('id, nombre_cie, nombre_comun, direccion_, altura_arb, diametro_a, lat, long, comuna_id')
    .ilike('direccion_', `%${termino}%`)
    .limit(100);

  const { data, error } = await query;

  if (error) {
    console.error('Error en búsqueda por dirección:', error);
    if (listaResultados) {
      listaResultados.innerHTML =
        '<div class="resultado-item">Error al buscar.</div>';
    }
    return;
  }

  mostrarResultadosBusqueda(data || []);
}

function mostrarResultadosBusqueda(resultados) {
  if (!listaResultados) return;
  listaResultados.innerHTML = '';

  if (resultados.length === 0) {
    listaResultados.innerHTML =
      '<div class="resultado-item">No se encontraron resultados.</div>';
    listaResultados.classList.add('activa');
    return;
  }

  marcadoresBusqueda.clearLayers();

  resultados.forEach((item, index) => {
    let latFinal = parseFloat(item.lat);
    let lonFinal = parseFloat(item.long);

    if ((isNaN(latFinal) || isNaN(lonFinal)) && item.geom) {
      if (item.geom.type === 'Point' && Array.isArray(item.geom.coordinates)) {
        lonFinal = item.geom.coordinates[0];
        latFinal = item.geom.coordinates[1];
      }
    }

    if (isNaN(latFinal) || isNaN(lonFinal)) return;

    const nombreCientifico = item.nombre_cie || 'No identificado';
    const nombreComun = item.nombre_comun || 'Sin nombre común';
    const color = obtenerColorPorEspecie(nombreCientifico);

    const marker = L.marker([latFinal, lonFinal], {
      icon: crearIconoArbol(color)
    }).addTo(marcadoresBusqueda);

    const popupContent = `
      <div style="min-width: 180px;">
        <h3 style="margin: 0 0 6px 0; color: #2c3e50; font-size: 15px;">
          ${
            nombreComun !== 'Sin nombre común'
              ? `${nombreComun} <span style="font-size: 11px; color: #888;">(${nombreCientifico})</span>`
              : nombreCientifico
          }
        </h3>
        <div style="font-size: 13px; color: #555; line-height: 1.4;">
          <strong>📍 Ubicación:</strong> ${item.direccion_ || 'N/A'}<br>
          <strong>🏛 Comuna:</strong> ${item.comuna_id || 'N/A'}<br>
          <strong>📏 Altura:</strong> ${item.altura_arb ? `${item.altura_arb} m` : 'N/A'}<br>
          <strong>📐 Diámetro:</strong> ${item.diametro_a ? `${item.diametro_a} cm` : 'N/A'}
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);

    const itemDiv = document.createElement('div');
    itemDiv.className = 'resultado-item';
    itemDiv.innerHTML = `
      <strong>
        ${
          nombreComun !== 'Sin nombre común'
            ? nombreComun
            : nombreCientifico || 'Sin nombre'
        }
        <span class="especie-tag" style="background-color: ${color}">${index + 1}</span>
      </strong>
      <span style="display:block; font-size: 11px; color:#666;">
        ${nombreComun !== 'Sin nombre común' ? nombreCientifico : ''}
      </span>
      <span>${item.direccion_ || 'Sin dirección'}</span>
    `;

    itemDiv.addEventListener('click', () => {
      mapa.flyTo([latFinal, lonFinal], 18, { duration: 1.5 });
      marker.openPopup();
      listaResultados.classList.remove('activa');
      if (inputBusquedaEspecie) inputBusquedaEspecie.blur();
      if (inputBusquedaDireccion) inputBusquedaDireccion.blur();
    });

    listaResultados.appendChild(itemDiv);
  });

  listaResultados.classList.add('activa');
  mapa.addLayer(marcadoresBusqueda);
}

function limpiarBusqueda() {
  marcadoresBusqueda.clearLayers();
  mapa.removeLayer(marcadoresBusqueda);
  mapa.addLayer(clusterGroup);

  if (listaResultados) {
    listaResultados.classList.remove('activa');
    listaResultados.innerHTML = '';
  }

  if (inputBusquedaEspecie) inputBusquedaEspecie.value = '';
  if (inputBusquedaDireccion) inputBusquedaDireccion.value = '';
  if (filtroEspecie) filtroEspecie.value = '';
}

// ============================================================================
// 10. EVENT LISTENERS
// ============================================================================
if (btnBuscarEspecie && inputBusquedaEspecie) {
  btnBuscarEspecie.addEventListener('click', buscarPorEspecie);
  inputBusquedaEspecie.addEventListener('keyup', e => {
    if (e.key === 'Enter') buscarPorEspecie();
  });
}

if (btnBuscarDireccion && inputBusquedaDireccion) {
  btnBuscarDireccion.addEventListener('click', buscarPorDireccion);
  inputBusquedaDireccion.addEventListener('keyup', e => {
    if (e.key === 'Enter') buscarPorDireccion();
  });
}

if (filtroEspecie) {
  filtroEspecie.addEventListener('change', buscarPorEspecie);
}

if (btnLimpiar) {
  btnLimpiar.addEventListener('click', () => {
    limpiarBusqueda();
    if (inputBusquedaEspecie) inputBusquedaEspecie.focus();
  });
}

document.addEventListener('click', e => {
  if (listaResultados && !e.target.closest('.buscador-container')) {
    listaResultados.classList.remove('activa');
  }
});

const btnResetMapa = document.getElementById('btn-reset-mapa');

if (btnResetMapa) {
  btnResetMapa.addEventListener('click', () => {
    // Limpia búsquedas y vuelve a clusters
    limpiarBusqueda();
    // Vuelve a la vista inicial del mapa
    mapa.setView(VISTA_INICIAL_CENTRO, VISTA_INICIAL_ZOOM);
  });
}

// ============================================================================
// 11. CONTROL DEL MODAL DE BIENVENIDA EINSTRUCCIONES
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-instrucciones');
  const btnCerrar = document.getElementById('btn-cerrar-modal');
  const btnEmpezar = document.getElementById('btn-empezar');

  if (!modal) {
    // incluso si no hay modal, inicializamos el toggle de base
    inicializarToggleBase();
    return;
  }

  function cerrarModal() {
    modal.classList.add('oculto');
    setTimeout(() => {
      if (mapa) mapa.invalidateSize();
    }, 100);
  }

  if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
  if (btnEmpezar) btnEmpezar.addEventListener('click', cerrarModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) cerrarModal();
  });
  // Inicializar toggle de base cuando el DOM está listo
  inicializarToggleBase();
});


// ============================================================================
// 11bis. TOGGLE DE BASE DEL MAPA
// ============================================================================
function inicializarToggleBase() {
  const btnBase = document.getElementById('btn-base-toggle');
  if (!btnBase) return;

  // Texto inicial según base actual
  btnBase.textContent = currentBase === 'light' ? '🗺️ Vista oscura' : '🗺️ Vista clara';

  btnBase.addEventListener('click', () => {
    if (currentBase === 'light') {
      mapa.removeLayer(baseLight);
      baseDark.addTo(mapa);
      currentBase = 'dark';
      btnBase.textContent = '🗺️ Vista clara';
    } else {
      mapa.removeLayer(baseDark);
      baseLight.addTo(mapa);
      currentBase = 'light';
      btnBase.textContent = '🗺️ Vista oscura';
    }
  });
}

// Sincronización de la base con tema oscuro (llamado desde el botón de tema)
function sincronizarBaseConTema(isDark) {
  const btnBase = document.getElementById('btn-base-toggle');
  if (isDark && currentBase === 'light') {
    mapa.removeLayer(baseLight);
    baseDark.addTo(mapa);
    currentBase = 'dark';
    if (btnBase) btnBase.textContent = '🗺️ Vista clara';
  } else if (!isDark && currentBase === 'dark') {
    mapa.removeLayer(baseDark);
    baseLight.addTo(mapa);
    currentBase = 'light';
    if (btnBase) btnBase.textContent = '🗺️ Vista oscura';
  }
}

// ============================================================================
// 12. INICIALIZACIÓN FINAL
// ============================================================================
cargarEspeciesParaFiltro();
cargarClusters();

setTimeout(() => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay && overlay.parentNode) overlay.remove();
  document.body.style.cursor = 'default';
}, 2000);

console.log('✅ Visor inicializado. Listo para explorar.');