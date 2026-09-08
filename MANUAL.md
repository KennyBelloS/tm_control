# Torremolinos Control — Manual de instalación, uso y despliegue

Módulo Rendimientos — versión web (Vite + React + Supabase)

Este manual no asume que sabes programar. Sigue los pasos en orden.

---

## 0. Historial de arreglos recientes

**Última entrega (descuento de almuerzo, correcciones de Gerencia):**
- **Descuento de tiempo de almuerzo — nuevo, desactivado por defecto**: en Configuración → "Descuentos de tiempo (almuerzo)" puedes activar hasta 3 descuentos, cada uno con su "hora de corte" y minutos a restar. Ejemplo: hora de corte 12:00 y 30 minutos → un bloque de 06:00 a 13:00 (7 horas) queda en **6.5 horas** trabajadas. Solo se descuenta si el bloque realmente cruza esa hora — si el bloque termina antes, no se resta nada. Aplica tanto al Turno Actual como al tiempo calculado automáticamente en el Histórico.
- **Gerencia: vista previa corregida** — quité el `calc(100vh...)` que dependía del zoom/tamaño de pantalla y dejé una altura fija estable (680px), y quité el efecto de "zoom" al pasar el mouse que hacía ver borroso el contenido. También agregué un botón de recargar y un aviso si la otra app se queda pegada en su pantalla de carga (por bloqueo de almacenamiento de terceros en algunos navegadores).

**Entregas anteriores (meta en Configuración, Gerencia más vistosa, segunda gráfica):**
- **La meta de tallos de hoy ahora se define en Configuración, no en el Dashboard**: el Dashboard pasó a ser solo de visualización (como pediste), sin controles para editar nada. El campo "Meta de tallos de HOY" vive en Configuración, arriba de los parámetros generales.
- **Segunda gráfica en el Dashboard**: además de la tendencia de 14 días, ahora hay una dona con la distribución del Turno Actual por estado (Excelente/Cumple/A punto/Bajo), lado a lado con la de tendencia.
- **Vista previa de Gerencia más vistosa**: borde con degradado animado (verde/dorado/rojo de la marca), insignia "EN VIVO" con punto pulsante, y un leve efecto al pasar el mouse — se siente más como una integración nativa que una simple ventana embebida.

**Entregas anteriores (gráficas, error de metas_diarias, Gerencia nativo):**
- **Arreglado el error "Could not find the table 'public.metas_diarias'"**: si todavía no corriste la migración, el Dashboard ya no se rompe — usa el valor de Configuración mientras tanto y te avisa con un mensaje claro qué falta hacer. Recuerda correr `supabase/migracion_metas_diarias.sql` cuando puedas para que la meta por día quede guardada de verdad.
- **Gráficas reales agregadas** (misma librería que tu proyecto de referencia, ApexCharts): tendencia de tallos por día en el Dashboard, distribución por estado (dona) en Ranking, y producción por bloque de hora en Rendimientos. Se cargan solo cuando entras a esas pantallas, para no hacer más lenta la app en general.
- **Gerencia con pantalla completa de verdad**: al presionar "Pantalla completa", la Calculadora de Costo por Tallo ahora se sobrepone a TODA la pestaña (incluyendo el menú lateral), como una app nativa — se sale con el botón "Salir" o la tecla Esc.

**Entregas anteriores (Ranking sin duplicados, meta diaria, móvil):**
- **Corregido el bug de Ranking**: el Top 3 aparecía dos veces (una vez arriba como tarjetas grandes, y otra vez repetido dentro del bloque verde). Ya solo aparece una vez.
- **Nuevas tarjetas en Ranking**: "Tallos Totales" y "Rendimiento Promedio" del período, junto a las que ya tenías (Mejor rendimiento, Operarios trabajando, Promedio general, Meta cumplida).
- **La meta de tallos ahora es por día, no un valor fijo para siempre**: en el Dashboard puedes cambiar la meta de HOY con un clic, y no afecta ningún otro día. El valor de Configuración pasó a ser solo una sugerencia inicial (se explica en la sección 8.1).
- **Ajustes de móvil**: tarjetas, panel de progreso y ranking se ven mejor en pantallas angostas (una columna, mejor espaciado, notificaciones ajustadas al ancho de pantalla).

**Entregas anteriores (roles, notificaciones, Gerencia):**
- **Sistema de roles**: 4 roles (Administrador, Ingeniero, Supervisor, Formador), cada uno ve solo los módulos que le corresponden en el menú lateral — y si alguien intenta entrar a una URL que no le corresponde, se le redirige al Dashboard. **Importante:** solo me diste las reglas de Administrador e Ingeniero; para Supervisor y Formador puse un criterio razonable por defecto — revísalo en la sección 8.2 y dime si quieres cambiarlo.
- **Pantalla de inicio de sesión** (temporal, sin backend de autenticación todavía): eliges tu nombre y tu rol, y el sistema lo recuerda en el navegador. Es la base para conectar después el login real desde el módulo Usuarios.
- **Notificaciones estilo campanita**, igual a la referencia que enviaste: ícono con contador rojo en la barra superior, panel desplegable con borde de color, "Marcar todas leídas", "Leído al abrir" y botón de eliminar. Ahí es donde ahora aparece la alerta de "rendimiento bajo sostenido" (antes vivía en un panel aparte dentro de Ranking).
- **Barra superior con tu identidad**: fecha, "Tu nombre · Tu rol" y botón "Cerrar sesión", en todas las pantallas.
- **Gerencia con la Calculadora de Costo por Tallo embebida**: tu otra app (`calculadora-costo-tallo.vercel.app`) se ve dentro de un marco tipo navegador, con botón de pantalla completa y de abrir en pestaña nueva. Si el sitio bloquea que lo muestren embebido, se avisa automáticamente con una alternativa.
- **Dos módulos nuevos, vacíos por ahora**: "Usuarios" y "Auditoría" (solo visibles para Administrador) — listos para construir su contenido cuando lo pidas.

**Entregas anteriores:**
- Turno Actual con su propio filtro de fecha y KPIs propios (Personas Activas, Total Tallos, Rendimiento Promedio).
- Ranking por mes o por fecha elegida, con "Mejor rendimiento del mes".
- Excel corregido (error de compatibilidad `exceljs` + Vite, solucionado con `vite-plugin-node-polyfills`).
- PDF corregido: ranking real, sin duplicados, ordenado de mayor a menor, con podio del Top 3.
- Rediseño visual con colores del logo real, tarjetas KPI con acento por indicador, panel "hero" de cumplimiento, tablas estilo editorial.
- "Ampliar" del Ranking con vista agrupada por nivel de desempeño (Cumple / A punto / Bajo).
- Dashboard corregido para usar el Turno Actual en vivo (antes solo miraba el Histórico de hoy, casi siempre vacío).
- Cumplimiento arreglado: llegar a la meta (470) dice "Cumple" en verde; 90-99% dice "A punto de cumplir" en amarillo con texto alusivo.
- "Mesa" renombrado a "Código" (son códigos de trabajo, no mesas físicas) — el "Id" es el Colaborador Id.
- Histórico por defecto muestra el día anterior. Botón "Ir a Turno Actual" con scroll directo.

---

## 1. Qué se entregó (y qué cambió respecto a la versión anterior)

- **Rediseño visual**, tomando como base el look & feel de tu otro proyecto (`calculadora-costo-tallo`): logo real de Falcon Farms · Finca Torremolinos en el menú, sidebar verde sólido, tarjetas planas, tipografía del sistema (más limpia y liviana), **pantalla de carga (splash) al abrir la app** con el logo, degradado verde y spinner, y **menú deslizante funcional en celular** (con botón ☰ y fondo oscuro al abrir), igual que en tu app de referencia. Los módulos (Dashboard, Personas, Rendimientos, Reportes, Ranking, Líneas, Indirectos, Gerencia, Configuración) siguen exactamente igual, solo cambió la piel visual.
- **Fórmula de rendimiento corregida**, portada exactamente de tu archivo maestro (la validé fila por fila contra `B_D_RENDIMIENT_-TM-POS-02.xlsb`, hoja "Rendimiento"):

  ```
  Tiempo Real Laborado (horas) = (Tiempo Trabajado − Tiempo No Productivo) / 60
  Rendimiento                  = Total Tallos / Tiempo Real Laborado (horas)
  ```

  Cuando editas una persona, ahora escribes las **horas trabajadas** (por ejemplo "8"), la app las convierte a minutos, resta el tiempo no productivo si lo indicas, y te muestra en vivo el tiempo real y el rendimiento resultante — antes de guardar.

- **El Histórico cambió de estructura**: ya no es una fila por bloque de hora, sino **un solo total por persona por día** (se suman automáticamente todos los bloques del Excel que subas), igual que la columna "Total Unidades" de tu archivo maestro. Así el rendimiento se calcula sobre el tiempo real trabajado en el día completo, no sobre un bloque suelto.
- **Ranking con filtro Histórico (día) / Turno Actual (hora a hora)**: en la pestaña Ranking eliges cuál de las dos fuentes quieres ver, con su propio filtro de fecha.
- **Un solo formato de Excel**: tu **Reporte Consolidado Boncheo**, en `.xls`, `.xlsx` o `.xlsb`.
- **Base de datos real (Supabase)**, proyecto **tm-control**. El Excel nunca se guarda — solo los datos ya calculados.
- **Turno Actual (hora a hora)**: cada carga reemplaza automáticamente la anterior — solo existe la última.
- **Botón "Eliminar toda la tabla"** para cada una de las dos tablas, y edición/eliminación por registro individual.
- **Ranking visual**: medallas, barra de progreso, % de eficiencia y estado (Excelente ≥110%, Cumple 90-109%, Bajo <90%), con opción de expandir y ver a todo el personal.

> Si ya habías creado tu base de datos en Supabase con una versión anterior de este manual, **no vuelvas a correr `schema.sql`** — usa `supabase/migracion_v3.sql` (ver sección 3.1). Si aún no tienes datos importantes guardados, lo más simple es borrar las tablas viejas y correr `schema.sql` desde cero.

---

## 2. Requisitos previos

Solo necesitas instalar **Node.js** (incluye `npm`).

1. Entra a <https://nodejs.org>
2. Descarga la versión **LTS** para tu sistema operativo.
3. Instala normalmente, dejando todas las opciones por defecto.
4. Confirma la instalación abriendo una terminal (`cmd`/`PowerShell` en Windows, `Terminal` en Mac) y escribiendo:

   ```bash
   node -v
   npm -v
   ```

   Si ambos responden con un número de versión, quedó listo.

---

## 3. Crear tu proyecto de Supabase ("tm-control")

Supabase es la base de datos donde queda toda la información. Es gratis para este tamaño de proyecto.

1. Entra a <https://supabase.com> y crea una cuenta (puedes usar tu cuenta de Google/GitHub).
2. Clic en **"New Project"**.
3. Ponle de nombre exactamente **`tm-control`** (o el que prefieras, no afecta el funcionamiento).
4. Elige una contraseña de base de datos segura (guárdala, no la volverás a ver) y la región más cercana (por ejemplo, alguna en EE.UU. o Sudamérica).
5. Espera 1-2 minutos mientras Supabase crea el proyecto.
6. En el menú lateral, entra a **SQL Editor** → **New query**.
7. Abre el archivo `supabase/schema.sql` que viene dentro del proyecto que te entregué, copia **todo** su contenido, pégalo en el editor de Supabase, y presiona **Run**.
   - Esto crea las 4 tablas necesarias (`personas`, `configuracion`, `rendimiento_historico`, `rendimiento_actual`) ya optimizadas y con seguridad básica activada.
8. Ve a **Project Settings** (ícono de engranaje) → **API**.
9. Copia dos valores:
   - **Project URL** (algo como `https://xxxxxxxx.supabase.co`)
   - **anon public key** (una clave larga)

Guarda esos dos datos, los necesitas en el siguiente paso.

### 3.1 Ya tenías la base de datos creada (actualizar de v2 a v3)

Si ya habías corrido una versión anterior de `schema.sql` y **quieres conservar los datos que ya subiste**:

1. Ve a **SQL Editor** → **New query**.
2. Abre `supabase/migracion_v3.sql`, copia todo su contenido y pégalo ahí.
3. Presiona **Run**.

Esto convierte el Histórico de "una fila por bloque de hora" a "un total por persona por día" (sumando lo que ya tenías), sin perder tus registros.

Si todavía no tienes datos importantes guardados (estás en pruebas), es más simple borrar las tablas antiguas desde **Table Editor** y correr `schema.sql` de una vez, desde cero.

---

## 4. Instalar y conectar el proyecto

1. Descomprime `torremolinos-control.zip` en cualquier carpeta.
2. Abre la terminal en esa carpeta:

   ```bash
   cd torremolinos-control
   npm install
   ```

   (El proyecto ya trae un archivo `.npmrc` que resuelve automáticamente un conflicto de versiones de la librería de gráficas — no necesitas hacer nada especial, `npm install` normal funciona.)

3. Dentro de la carpeta del proyecto, busca el archivo **`.env.example`**, haz una copia y renómbrala a **`.env`** (sin ".example").
4. Abre `.env` con cualquier editor de texto y reemplaza con tus datos reales de Supabase:

   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-public-key-aqui
   ```

5. Guarda el archivo.

---

## 5. Ejecutar el sistema

```bash
npm run dev
```

Abre en tu navegador la dirección que te muestra la terminal (normalmente `http://localhost:5173`). Ya deberías ver el Dashboard conectado a tu base de datos (con 0 registros, hasta que subas tu primer Excel).

Si ves un aviso amarillo de "Supabase no está configurado", revisa que el archivo `.env` tenga los valores correctos y reinicia `npm run dev`.

---

## 6. Cómo funciona el módulo de Rendimientos

> **Esta versión no requiere tocar la base de datos** — solo se corrigió la lógica de cálculo. Actualiza el código y listo.

### 6.1 El Excel que siempre se usa

Tu **Reporte Consolidado Boncheo**, tal como me lo compartiste. La app busca automáticamente estas columnas dentro del archivo (sin importar si su posición exacta cambia, porque es una exportación de tabla dinámica):

| Columna del Excel | Qué guarda el sistema |
|---|---|
| Mesa | Número de mesa (solo en Turno Actual) |
| Colaborador Id | Código del colaborador |
| Colaborador | Nombre completo |
| Hora Acumulada | Bloque horario (ej. "06:00 - 10:00") |
| Total Tallos | Tallos producidos; en Histórico se suman todos los bloques del día |
| Total Ramos | Ramos producidos; igual, se suman en Histórico |
| Semana Bonchado | Se detecta automáticamente (ej. 202636 = año 2026, semana 36) |

Soporta `.xls`, `.xlsx` y `.xlsb` sin ninguna configuración adicional.

### 6.2 Subir a Histórico vs. subir a Turno Actual

En la pantalla de Rendimientos eliges, antes de subir el archivo:

- **Turno actual (reemplaza lo anterior)**: para las cargas de hora a hora durante el día. Cada carga borra la anterior — solo existe la última. El rendimiento de cada bloque se calcula solo: **Tallos ÷ horas del bloque** (ej. bloque 06:00–10:00 = 4 horas, 2.300 tallos → 2.300 / 4 = 575 tallos/h). Si el bloque de horas está mal, lo editas con el lápiz y el rendimiento se recalcula automáticamente.
- **Histórico (suma el total del día)**: suma todos los bloques de hora del archivo por persona → un total de tallos por día, **y también suma automáticamente los minutos trabajados** de esos mismos bloques — ya no hace falta escribirlos a mano. Si vuelves a subir un Excel para ese mismo día, el total y el tiempo se recalculan con lo nuevo.

### 6.3 Corregir el tiempo trabajado si hace falta (Histórico)

Aunque el tiempo ya se calcula solo al subir el Excel, puedes corregirlo: clic en el lápiz (✏️) de la fila y verás:

- El campo de **horas trabajadas** (ya viene lleno con lo calculado; lo puedes cambiar).
- Un campo opcional de **tiempo no productivo, en minutos** (paradas, daños, etc.).
- En vivo, el sistema te muestra el cálculo antes de guardar: *"Tiempo real: 480 min (8 h) → Rendimiento: 255 tallos/h"*.

La fórmula (verificada fila por fila contra tu archivo maestro):

```
Tiempo Real (horas) = (Horas trabajadas × 60 − Tiempo No Productivo) / 60
Rendimiento          = Total Tallos / Tiempo Real (horas)      ← redondeado, sin decimales
```

### 6.4 Filtros

El filtro de fecha aplica a ambas tablas (Histórico y Turno Actual) al mismo tiempo. También puedes buscar por nombre o código de colaborador.

### 6.5 Eliminar una tabla completa o un registro puntual

Cada tabla tiene su botón **"Eliminar toda la tabla"**. Además, cada fila tiene su propio ícono de papelera para borrar solo ese registro, sin afectar el resto.

### 6.6 Promedio general

Tanto la tabla **Histórico** como **Turno Actual** muestran ahora su propio indicador de **"Promedio general"** (tallos/hora) en la parte superior de cada tabla, junto al botón de eliminar.

### 6.7 Ranking — solo en la pestaña Ranking

El panel de ranking visual (medallas, barra de progreso, % de eficiencia) ya **no aparece dentro de Rendimientos** — vive únicamente en la pestaña **Ranking**, donde eliges entre **Histórico (día)** o **Turno Actual (hora a hora)**, cada uno con su propio filtro de fecha. Los números de rendimiento se muestran **sin decimales** (ej. 451.76 se ve como 452); el % de eficiencia sí conserva 2 decimales, igual que en tu referencia.

> Nota: el Reporte Consolidado Boncheo que probé no trae columna de "Formador", así que esa columna no aparece todavía. Si tu Excel sí la incluye, cuéntame y la agrego.

---

## 7. Cómo se optimizó el espacio en la base de datos

Como pediste que no se guarde nada innecesario, el diseño de la base de datos (`supabase/schema.sql`) sigue estas reglas:

1. **El archivo Excel nunca se guarda** — ni como archivo, ni como texto plano, ni en ningún campo. Solo se guardan los 8-9 valores ya extraídos de cada fila.
2. **Los nombres no se repiten en cada registro.** Existe una tabla `personas` (código → nombre) y el resto de tablas solo guardan el código numérico, no el nombre completo repetido miles de veces.
3. **Tipos de datos pequeños.** Campos como tallos, ramos y rendimientos usan `smallint` (2 bytes) en vez del `integer` por defecto (4 bytes), porque sus valores nunca superan unos pocos miles.
4. **Sin columnas de auditoría innecesarias.** No se guardan fechas de creación/modificación ni otros metadatos que no pediste.
5. **Histórico agregado por día, no por bloque.** En vez de guardar una fila por cada bloque de hora del Excel (que se repite muchas veces al día por persona), el Histórico suma todo y guarda **una sola fila por persona por día** — mucho menos espacio, y es exactamente el nivel de detalle que necesitas para calcular el rendimiento real.
6. **Los cálculos no se guardan, se recalculan al leer.** El tiempo real y el rendimiento no se almacenan como columnas — se calculan al momento a partir de los tallos y el tiempo trabajado, así nunca quedan desactualizados si editas algo.

---

## 8. Configuración

En la pestaña Configuración puedes ajustar (se guardan en la base de datos, aplican para todos):

- Meta de tallos por hora por persona.
- Meta de tallos **por defecto** (sugerida) — ver 8.1 para la meta real de cada día.
- Horario por defecto de la jornada.
- Ver cuántos registros hay en cada tabla y vaciarlas si es necesario.
- **Mi sesión**: tu nombre y tu rol actual (selector temporal, ver 8.2).

---

## 8.1 Meta de tallos por día

Como pediste, la meta de tallos **ya no es un número fijo para siempre** — se define día por día:

- En **Configuración**, arriba de todo, hay un campo **"Meta de tallos de HOY"** — lo escribes, guardas, y listo: esa meta aplica **solo para el día de hoy**.
- El **Dashboard** solo muestra esa meta (tarjeta "Cumplimiento" y el panel de progreso) — es de pura visualización, no tiene ningún control para editarla ahí.
- Si nunca defines una meta puntual para un día, el sistema usa automáticamente el valor de "Meta de tallos por defecto" que configures en la pestaña Configuración — así nunca te quedas sin meta, pero puedes ajustarla cualquier día sin que eso cambie los demás días.
- Cada día queda guardado por separado en la base de datos (tabla `metas_diarias`), así que el historial de metas de cada fecha no se pierde.

> Si ya tenías el proyecto de Supabase creado antes de esta entrega, corre `supabase/migracion_metas_diarias.sql` en el SQL Editor (no borra nada existente). Si es una instalación nueva, ya viene incluido en `schema.sql`.

---

## 8.2 Roles y permisos

Al abrir la app por primera vez en un navegador, te pide tu **nombre** y tu **rol** (se recuerda ahí mismo; para cambiarlo, usa "Cerrar sesión" en la barra superior o en Configuración → "Mi sesión"). Esto es un selector temporal: cuando quieras, construimos el login real conectado a Supabase Auth + el módulo Usuarios, y cada persona entrará con su propia cuenta en vez de elegir el rol manualmente.

Estos son los módulos que ve cada rol hoy:

| Módulo | Administrador | Ingeniero | Supervisor | Formador |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Personas | ✅ | ✅ | ✅ | — |
| Rendimientos | ✅ | ✅ | ✅ | ✅ |
| Reportes | ✅ | ✅ | ✅ | — |
| Ranking | ✅ | ✅ | ✅ | ✅ |
| Líneas | ✅ | ✅ | ✅ | — |
| Indirectos | ✅ | ✅ | — | — |
| Gerencia | ✅ | ✅ | — | — |
| Configuración | ✅ | — | — | — |
| Usuarios | ✅ | — | — | — |
| Auditoría | ✅ | — | — | — |

**Lo que tú definiste exactamente:** Administrador ve todo; Ingeniero ve todo menos los módulos técnicos (Configuración, Usuarios, Auditoría).

**Lo que yo asumí (avísame si quieres ajustarlo):** Supervisor ve la operación diaria pero no Indirectos, Gerencia ni lo técnico; Formador solo ve lo esencial para su turno (Dashboard, Rendimientos, Ranking). Para cambiar estas reglas, dime exactamente qué debe ver cada uno y lo ajusto en un archivo (`src/lib/roles.js`) — no requiere tocar nada más del sistema.

---

## 8.3 Gerencia — Calculadora de Costo por Tallo embebida

El módulo Gerencia ahora muestra tu otra aplicación (`calculadora-costo-tallo.vercel.app`) integrada dentro de un marco tipo navegador, con:

- Botón **"Pantalla completa"** para verla más grande sin salir de Torremolinos Control.
- Botón **"Abrir en pestaña nueva"** por si prefieres usarla aparte.
- Un aviso automático si el sitio no permite mostrarse embebido (algunos sitios lo bloquean por seguridad) — en ese caso, usa el botón de abrir en pestaña nueva.

Es la app real funcionando en vivo — cualquier cálculo que hagas ahí se guarda en esa app, no dentro de Torremolinos Control.

---

## 8.4 Módulos nuevos: Usuarios y Auditoría

Quedaron creados como espacio reservado (sin funcionalidad todavía), visibles solo para el rol Administrador:

- **Usuarios**: aquí se administrarán las cuentas reales (crear usuario, asignar rol, activar/desactivar), conectado a Supabase Auth.
- **Auditoría**: aquí quedará el historial de quién subió cada Excel, quién editó o eliminó un registro, y cuándo.

Cuando quieras que construya cualquiera de los dos, dime qué necesitas ver exactamente ahí y seguimos.

---

## 9. Publicar el sistema en internet (opcional)

Cuando quieras que el sistema tenga una dirección web accesible para tu equipo:

1. Genera la versión de producción:

   ```bash
   npm run build
   ```

   Esto crea la carpeta `dist` con todo listo y optimizado.

2. Sube esa carpeta a un servicio como [Vercel](https://vercel.com) o [Netlify](https://netlify.com) (ambos gratuitos para este tamaño de proyecto). En su panel puedes conectar tu proyecto de GitHub para que se publique solo cada vez que subas cambios, o arrastrar directamente la carpeta `dist`.
3. **Importante:** en el panel de Vercel/Netlify tienes que configurar las mismas variables de entorno del paso 4 (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`), porque el archivo `.env` no se sube a internet por seguridad.
4. En minutos obtienes una dirección pública para compartir con tu equipo — y como los datos ya viven en Supabase, todos verán la misma información en tiempo real.

---

## 10. Seguridad — algo que debes saber

Para que la app funcionara de inmediato sin necesidad de que cada persona inicie sesión, el archivo `schema.sql` deja las tablas abiertas a cualquiera que tenga la dirección de tu Supabase y la clave "anon" (la que va en `.env`). Esto es razonable para un sistema interno de un solo equipo, pero:

- **No compartas tu archivo `.env`** ni la clave "anon" fuera de tu equipo de trabajo.
- Si en el futuro necesitas que cada persona inicie sesión con su propio usuario y permisos distintos (por ejemplo, que un supervisor solo pueda ver su línea), Supabase lo permite mediante **Authentication** + políticas de seguridad (RLS) más estrictas. Puedo ayudarte con eso cuando lo necesites.

---

## 11. Próximos pasos sugeridos

- **Personas**: administración de colaboradores (alta/edición), aprovechando la tabla `personas` ya creada.
- **Reportes**: informes por rango de fechas, exportables en PDF.
- **Líneas**: consolidado de producción por línea/mesa.
- **Indirectos**: seguimiento del personal que no produce tallos directamente.
- **Gerencia**: vista ejecutiva consolidada de toda la operación.
- Autenticación de usuarios (login) si más de una persona/rol va a usar el sistema.

Cualquier duda sobre un paso específico, dime en qué parte te quedaste y seguimos desde ahí.
