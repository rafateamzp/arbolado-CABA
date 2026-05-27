# Datos del proyecto

## Fuente de los datos

El visor utiliza datos del **arbolado urbano lineal de la Ciudad Autónoma de Buenos Aires** correspondientes al relevamiento realizado entre 2017 y 2018.  
La información original proviene de datasets abiertos publicados por el Gobierno de la Ciudad de Buenos Aires (GCBA). Se almacena en una base de datos PostgreSQL gestionada a través de la aplicación Supabase.[web:215][web:217]

## Cobertura geográfica y temporal

- **Cobertura espacial**: Ciudad Autónoma de Buenos Aires (CABA).  
- **Cobertura temporal**: relevamiento de arbolado lineal 2017–2018 (no incluye árboles plantados o removidos con posterioridad).

## Sistema de Referencia de Coordenadas (SRC)
- **SRC**: World geodetic system 1984 (WGS84). Datum: World geodetic system 1984 ensemble.

Cada registro representa un árbol georreferenciado ubicado en el espacio público (principalmente veredas).

## Tabla principal: `public.arbolado`

La tabla `public.arbolado` es la fuente principal para el visor y contiene un registro por árbol.  
Desde esta tabla se alimentan:

- los clusters y marcadores del mapa principal,  
- la búsqueda por especie y dirección,  
- el mapa de calor (a través de una función RPC),  
- parte de las estadísticas agregadas del dashboard.

### Diccionario de campos principales

| Campo       | Tipo aproximado | Descripción                                                                                                                                 |
|------------|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `id`       | entero          | Identificador único del registro de árbol.                                                                                                  |
| `lat`      | numérico        | Latitud en coordenadas geográficas (WGS84).                                                                                                 |
| `long`     | numérico        | Longitud en coordenadas geográficas (WGS84).                                                                                                |
| `nombre_cie` | texto         | Nombre científico de la especie (por ejemplo, *Tipuana tipu*).                                                                             |
| `nombre_comun` | texto       | Nombre común de la especie (por ejemplo, Tipa, Jacarandá).                                                                                  |
| `direccion_` | texto         | Dirección aproximada o referencia vial del árbol (avenida, calle y altura (#)).                                                                                           |
| `altura_arb` | numérico      | Altura estimada del árbol en metros.(metros).                                                                                                         |
| `diametro_a` | numérico      | Diámetro a la altura del pecho (DAP), generalmente en centímetros.                                                                          |
| `comuna_id`  | entero/texto  | Código numérico de la comuna a la que pertenece el árbol (por ejemplo, 1, 2, 3…).                                                           |
| Otros campos | varios        | La tabla contiene otros atributos no utilizados en esta primera versión del visor (estado, observaciones, chapa, etc.).                     |

En el mapa principal se utilizan principalmente: `lat`, `long`, `nombre_cie`, `nombre_comun`, `direccion_`, `altura_arb`, `diametro_a` y `comuna_id`.

## Datos agregados y funciones RPC

Las estadísticas mostradas en `estadisticas.html` no se calculan en el navegador, sino mediante **funciones RPC** de Supabase que devuelven datos ya agregados.[web:215][web:164]

Las funciones principales son:

- `get_resumen_general`  
  Devuelve totales generales, por ejemplo:
  - total de árboles,  
  - cantidad con altura registrada,  
  - cantidad con diámetro registrado,  
  - cantidad de árboles sin identificar.

- `get_estadisticas_especies`  
  Devuelve conteos de árboles por especie (`nombre_cie`) para construir el Top 10 de especies más frecuentes (10 especies más numerosas).

- `get_estadisticas_altura`  
  Devuelve distribución de árboles agrupados por rangos de altura (por ejemplo 0–5 m, 5–10 m, etc.).

- `get_estadisticas_diametro`  
  Devuelve distribución de árboles agrupados por rangos de diámetro (DAP).

- `get_arboles_por_comuna`  
  Devuelve la cantidad de árboles por comuna, utilizada en el gráfico de “Cantidad de árboles por comuna”.

- `get_muestra_heatmap(limite integer)`  
  Devuelve una muestra de puntos (`lat`, `long`) para construir el mapa de calor.  
  Esta muestra se limita a un número máximo de registros (por ejemplo 5000) para evitar sobrecargar el navegador.

## Transformaciones y limpieza

Antes de visualizar los datos, se aplican algunas reglas básicas:

- **Coordenadas nulas**  
  - Registros sin `lat` o `long` se omiten para el mapa y el heatmap.  
  - Esto evita errores al crear marcadores en Leaflet.

- **Especies no identificadas**  
  - Árboles sin `nombre_cie` se agrupan bajo la etiqueta “No identificado” en el mapa y en las estadísticas.

- **Valores numéricos faltantes**  
  - Si `altura_arb` o `diametro_a` están vacíos, se muestran como “N/A” en los popups y no se incluyen en determinados agregados.

- **Normalización visual**  
  - Los colores de las especies en el mapa se derivan de una tabla base de colores por especie y un generador de colores para especies no listadas.  
  - En el tablero resumen de estadísticas, se utilizan los mismos colores para mantener coherencia visual entre mapa y gráficos.

## Limitaciones y consideraciones

- **Actualización temporal**  
  - La base refleja un relevamiento histórico; no se actualiza en tiempo real con nuevas plantaciones o remociones.  

- **Exactitud de atributos**  
  - Altura y diámetro pueden tener errores de medición o aproximación.  
  - Algunas especies están registradas como “No identificado” o con variantes de escritura.

- **Cobertura incompleta**  
  - Puede haber áreas o segmentos de calle sin registro de árboles, especialmente si no fueron relevados en la campaña original.

Estas limitaciones deben tenerse en cuenta para análisis detallados o comparaciones temporales.

## Seguridad y acceso a los datos

El proyecto utiliza Supabase con **Row Level Security (RLS)** habilitado en las tablas públicas.[web:215][web:223]

- El rol `anon` (usado por el frontend) dispone de **políticas de solo lectura**:
  - `SELECT`: permitido para `anon` (lectura pública controlada).
  - `INSERT`, `UPDATE`, `DELETE`: bloqueados por ausencia de políticas para estas acciones.

- Las funciones RPC expuestas (`get_resumen_general`, `get_muestra_heatmap`, etc.) realizan únicamente consultas de lectura sobre las tablas.

Esto garantiza que:

- Los usuarios del visor pueden consultar y visualizar datos.  
- No pueden modificar registros de la base de datos desde la aplicación web pública.
