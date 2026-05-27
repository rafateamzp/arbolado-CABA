# Visor de Arbolado Urbano de CABA 🌳

Aplicación web para explorar el arbolado urbano lineal de la Ciudad Autónoma de Buenos Aires (relevamiento 2017–2018), con mapa interactivo, búsquedas, mapa de calor y tablero de estadísticas.

Permite visualizar la distribución de especies, alturas, diámetros y comunas, así como navegar por el arbolado a nivel de árbol individual.

---

## Demo

- URL de la aplicación: https://arboles-caba.netlify.app/
- Repositorio: **este repo**

> Datos de arbolado urbano lineal 2017–2018 publicados por el GCBA (Gobierno de la Ciudad de Buenos Aires).

---

## Características principales

- 🌍 **Mapa interactivo** (Leaflet)  
  - Clusters de árboles para mejorar rendimiento.  
  - Íconos coloreados por especie.  
  - Popups con información básica (nombre común, nombre científico, altura, diámetro, comuna, dirección).

- 🔍 **Búsqueda y filtros**  
  - Búsqueda por nombre común / científico.  
  - Búsqueda por dirección.  
  - Filtro por listado de especies.
  

- 🔥 **Mapa de calor (heatmap)**  
  - Muestra densidad de arbolado a partir de una muestra de puntos obtenida vía Supabase RPC.  
  - Activación / desactivación mediante botón.

- 📊 **Dashboard de estadísticas**  
  - Top 10 de especies más frecuentes.  
  - Distribución por altura.  
  - Distribución por diámetro (DAP).  
  - Cantidad de árboles por comuna.  
  - Gráficos construidos con Chart.js.

- 🎨 **Tema claro / oscuro**  
  - Toggle de tema con persistencia en `localStorage`.  
  - Cambio de capa base del mapa (vista clara / vista oscura).

- ☕ **Donaciones**  
  - Botón de Cafecito integrado para apoyar el proyecto.

---

## Stack tecnológico

- **Frontend**
  - [Leaflet](https://leafletjs.com/) para el mapa.[web:214]
  - [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) para clusters.
  - [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) para mapa de calor.
  - [Chart.js](https://www.chartjs.org/) para los gráficos del dashboard.[web:180][web:193]

- **Backend / Datos**
  - [Supabase](https://supabase.com/) (Postgres + Auth + Storage).[web:215][web:217]
  - Funciones RPC para estadísticas agregadas y muestra de puntos para el heatmap.
  - Row Level Security (RLS) activado con políticas de solo lectura para el rol `anon`.[web:215][web:223]

---

## Instalación y desarrollo local

### Requisitos

- Navegador moderno (Chrome, Firefox, Edge, etc.).  
- Opcional: un servidor HTTP estático (por ejemplo `live-server`, `http-server`, o el servidor de VS Code).

### Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git
cd TU_REPO
```

### Configuración de Supabase

Este proyecto usa un proyecto de Supabase existente con:

- Tabla principal `arbolado` con campos como `lat`, `long`, `nombre_cie`, `nombre_comun`, `altura_arb`, `diametro_a`, `comuna_id`.  
- Funciones RPC:
  - `get_resumen_general`
  - `get_estadisticas_especies`
  - `get_estadisticas_altura`
  - `get_estadisticas_diametro`
  - `get_arboles_por_comuna`
  - `get_muestra_heatmap`

En el código se configura:

```js
const SUPABASE_URL = 'https://...supabase.co';
const SUPABASE_ANON_KEY = '...';
```

> Nota: El `anon key` de Supabase es una clave **pública** pensada para usarse en el frontend.  
> La seguridad se implementa con RLS y políticas de solo lectura.[web:224][web:222]

### Ejecutar localmente

1. Abrí `index.html` con un servidor estático (recomendado) o directamente en el navegador.
2. Asegurate de que:
   - El archivo `index.js` está referenciado en `index.html`.  
   - La carpeta `data/` contiene el archivo `CABA.geojson` con los límites de la ciudad.

---

## Uso

### Mapa principal

- **Navegar**: arrastrar para mover, rueda del mouse o controles de zoom.  
- **Clusters**: hacer clic sobre un cluster para acercar y ver más detalle.  
- **Popups**: clic en un árbol para ver nombre común / científico, altura, diámetro y comuna.

### Búsqueda y filtros

- **Búsqueda por especie**:
  - Escribir nombre común o científico en la caja de búsqueda de especie.
  - Usar el filtro desplegable para seleccionar una especie puntual.
- **Búsqueda por dirección**:
  - Escribir parte de la dirección (por ejemplo “Av. Rivadavia 1000”).
- **Limpiar búsqueda**:
  - Botón “✕ Limpiar” restablece el mapa a clusters generales.

### Funciones avanzadas

- **Mapa de calor**:
  - Botón “🔥 Mapa de calor” para activar/ocultar.
  - Muestra densidad de arbolado a partir de una muestra de registros (para evitar sobrecargar el mapa).

- **Estadísticas**:
  - Botón “📊 Estadísticas” abre `estadisticas.html`, con gráficos de:
    - Top 10 especies.
    - Distribución por altura y DAP.
    - Árboles por comuna.

- **Tema claro / oscuro**:
  - Botón “🌙 Modo oscuro / ☀️ Modo claro” cambia la apariencia general.
  - La elección se guarda en `localStorage`.

- **Vista del mapa**:
  - Botón “🗺️ Vista clara / oscura” alterna entre base light (CartoDB Positron) y base dark (CartoDB Dark Matter).[web:214]

- **Cafecito**:
  - Botón “☕ Cafecito” abre la página de donaciones en `https://cafecito.app/geckogis`.

---

## Esquema de datos (resumen)

Tabla principal `public.arbolado` (campos principales):

- `id` – identificador del árbol.  
- `lat`, `long` – coordenadas geográficas.  
- `nombre_cie` – nombre científico.  
- `nombre_comun` – nombre común.  
- `altura_arb` – altura estimada (m).  
- `diametro_a` – diámetro a la altura del pecho (cm).  
- `direccion_` – dirección aproximada.  
- `comuna_id` – identificador de comuna.

Para más detalle ver [`docs/datos.md`](docs/datos.md).

---

## Seguridad y políticas (Supabase)

- **RLS (Row Level Security)** habilitado en las tablas públicas.[web:215][web:223]  
- Políticas de solo lectura para el rol `anon`:

  - Acción `SELECT`: permitida para `anon`/`authenticated`.  
  - Acciones `INSERT`, `UPDATE`, `DELETE`: no hay políticas → bloqueadas por defecto.

- Las funciones RPC que usa el frontend solo realizan consultas de lectura sobre estas tablas.

Esto asegura que:

- La app web puede leer datos para mostrar el visor y el dashboard.  
- No se pueden modificar datos desde el frontend.

---

## Testing y dispositivos

Pruebas realizadas:

- **Desktop**  
  - Navegador: Chrome (Linux/Windows).  
  - Funciones probadas: clusters, heatmap, búsquedas, estadísticas, tema, cambio de base.

- **Android**  
  - Dispositivo: Motorola (Moto G / Nano 50).  
  - Funciones probadas: navegación táctil, popups, heatmap, tema.

Pendiente (beta):

- Laptop adicional (otro sistema / navegador).
- iPhone (Safari / Chrome).

Se recomienda que quienes prueben la beta reporten problemas en resoluciones pequeñas o navegadores específicos.

---

## Roadmap / ideas futuras

- Filtros adicionales (por altura / diámetro / comuna).  
- Series temporales (si se incorporan nuevas campañas de relevamiento).  
- Modo “historia” con recorridos guiados.  
- Descarga de subconjuntos de datos (CSV / GeoJSON) con filtros aplicados.

---

## Licencia

- Código: **[elige MIT / GPL / otra licencia]**.  
- Datos: según licencia de publicación del GCBA (citá la fuente oficial).

---

## Autoría y contacto

Proyecto desarrollado por **[Rafael Alfonzo Zerpa D. / GeckoGIS]**.  

- Sitio / portfolio: [ENLACE]  
- Contacto: email: rafaelzerpa@proton.me / LinkedIn : ]  
- Cafecito: https://cafecito.app/geckogis