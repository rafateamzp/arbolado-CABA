# Arquitectura del proyecto

## Visión general

El proyecto está compuesto por:

- Una aplicación web estática (HTML, CSS, JS) con Leaflet y Chart.js.  
- Un backend gestionado por Supabase (Postgres + funciones RPC + RLS).

```text
Usuario ── navegador ── Leaflet / Chart.js ── Supabase JS ── Postgres
```

## Frontend

- `index.html`  
  - Contiene el visor principal de arbolado:
    - contenedor del mapa,
    - panel de búsqueda y filtros,
    - botones de acción (clusters, heatmap, tema, base, estadísticas, Cafecito).

- `index.js`  
  - Inicializa el mapa Leaflet y los clusters.
  - Carga los límites de CABA desde `data/CABA.geojson`.
  - Consulta la tabla `arbolado` en Supabase para cargar clusters paginados.
  - Implementa:
    - Búsqueda por especie y dirección,
    - Mapa de calor (Leaflet.heat),
    - Toggle de tema claro/oscuro (clase `theme-dark`),
    - Cambio de base (light / dark).

- `estadisticas.html`  
  - Dashboard con gráficos (Chart.js):
    - Top 10 especies,
    - Altura,
    - Diámetro,
    - Árboles por comuna.
  - Consume funciones RPC de Supabase para obtener datos agregados.

## Backend (Supabase)

### Tablas

- `public.arbolado`  
  - Tabla principal con las observaciones de arbolado urbano.  
  - Campos clave: `lat`, `long`, `nombre_cie`, `nombre_comun`, `altura_arb`, `diametro_a`, `comuna_id`, `direccion_`.

### Funciones RPC

Ejemplos de funciones utilizadas desde el frontend:

- `get_resumen_general`  
  - Devuelve totales generales (árboles, con altura, con diámetro, sin identificar).

- `get_estadisticas_especies`  
  - Devuelve conteos por especie.

- `get_estadisticas_altura`  
  - Devuelve distribución de árboles por rangos de altura.

- `get_estadisticas_diametro`  
  - Devuelve distribución de árboles por rangos de DAP.

- `get_arboles_por_comuna`  
  - Devuelve cantidad de árboles por comuna.

- `get_muestra_heatmap(limite integer)`  
  - Devuelve una muestra de coordenadas (lat/long) para construir el mapa de calor.

### Seguridad (RLS)

- RLS habilitado en tablas públicas (`arbolado` y otras que contengan datos usados) 
- Políticas:

  - `SELECT`: permitida para rol `anon` (lectura pública).  
  - `INSERT`, `UPDATE`, `DELETE`: no permitidas (no hay políticas definidas).

- Las funciones RPC ejecutan consultas de solo lectura y están expuestas al `anon key`.

## Despliegue

La aplicación puede desplegarse como sitio estático:

- GitHub Pages, Netlify, Vercel u otro proveedor de hosting estático.  Para su despliegue se usó Netlify.
- Configuración necesaria:
  - Variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` embebidas en el JS.  
  - Acceso HTTPS recomendado para evitar problemas de mixed content.
