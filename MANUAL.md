# Torremolinos Control (TMControl) — Manual de uso y de instalación

Aplicación web de **producción floral** de Falcon Farms / Finca Torremolinos: sube el reporte de boncheo, calcula el rendimiento de cada persona, sigue la clasificación hora a hora, la calidad (devoluciones) y el presentismo, y deja todo listo para revisar, mostrar y descargar. Funciona en computador y en celular, con login real (Supabase) y se publica gratis en Vercel.

Este manual tiene tres partes: **cómo se usa** (lo que ves dentro de la app, en la pantalla *Cómo se usa*), **instalación y mantenimiento** (para quien administra) y **novedades** (qué cambió en cada versión). **Se actualiza con cada función nueva** — ver la última sección técnica.

<!-- USO:INICIO -->

## Qué es y para quién

TMControl junta en un solo lugar lo que antes estaba repartido en Excel y papel:

- **Producción:** cuántos tallos hace cada persona por hora real, contra la meta.
- **Clasificación:** tallos movidos hora a hora por línea, comparados con el día anterior.
- **Calidad:** devoluciones por persona, causa, día, semana y mes.
- **Personas:** el Tablero Integrado del Colaborador (TIC) junta productividad, calidad y presentismo de cada uno.
- **Para mostrar y compartir:** modo *Presentar* para pantallas grandes, fotos listas (PNG/JPG), PDF, Excel y resúmenes.

Cada persona entra con su cuenta y ve solo lo que su **rol** permite (más abajo).

## Módulos incluidos

| Módulo | Qué hace | Quién lo ve |
|---|---|---|
| **Dashboard** | Resumen del Turno Actual en vivo, avance contra la meta, último Histórico, clasificación y formadoras, tendencia. Botón *Presentar* | Todos |
| **Personas** | Catálogo de colaboradores: Emp.Cod, mesa (código) y nombre. Carga desde el Excel de Activos | Todos ven · editan Administrador, Ingeniero, Profesional y Digitador |
| **Rendimientos** | Sube el *Reporte Consolidado Boncheo* y consulta el Turno Actual (hora a hora) y el Histórico | Todos ven · suben los que editan |
| **Reportes** | Filtra, mira la vista previa de la foto y descarga en PNG, JPG, PDF o Excel | Todos |
| **Ranking** | Quién rinde más, por persona y por formadora, con la distribución por estado | Todos |
| **Líneas** | Líneas de producción, formadoras, asignación diaria de personal, tablero de formadoras y clasificador↔bonchador | Todos ven · editan los que editan |
| **Clasificación** | Tallos por hora y por línea contra el día anterior | Todos |
| **Devoluciones** | Calidad: resumen, Top 5, causas, tendencia, por colaborador y por formadora | Todos |
| **TIC** | Tablero Integrado del Colaborador: productividad, calidad y presentismo de una persona | Todos |
| **Tableros** | Tableros externos integrados dentro de la app (con nota de la clave) | Todos |
| **Indirectos** | Personal indirecto: supervisión, calidad, logística, mantenimiento | Administrador, Ingeniero, Profesional, Digitador |
| **Gerencia** | Vista ejecutiva con herramientas conectadas (ej. Costo por Tallo), protegida con clave | Administrador, Ingeniero, Profesional, Digitador |
| **Configuración** | Metas, jornada, fin de semana del Ranking y descuentos de tiempo | Administrador y Digitador |
| **Usuarios** | Crea cuentas y asigna roles | Administrador y Digitador |
| **Auditoría** | Espacio de la base de datos, copias de seguridad, vaciar y depuración semestral | Solo Administrador |
| **Resúmenes** | Resumen de la finca o de cada equipo, con imagen y texto | Solo Administrador |
| **Cómo se usa** | Recorrido animado, manual interactivo con lecciones y simuladores, y las novedades de cada versión | Todos |

## Primeros pasos

0. **Si es tu primera vez**, abre **Cómo se usa**: el *Recorrido* te enseña la app con dibujos que se mueven y el *Manual* te deja practicar cada módulo con simuladores.
1. **Entra** con tu cuenta. El Administrador entra con correo; el resto con *usuario* y contraseña (los crea el Administrador en *Usuarios*).
2. **El menú** de la izquierda (en el celular, el ícono de menú) lleva a cada módulo. Solo aparecen los que tu rol puede ver.
3. **Buscador rápido:** pulsa `Ctrl + K` (o `⌘ + K` en Mac) y escribe el nombre de un módulo o una acción para saltar a ella.
4. **Atajos de teclado:** pulsa `?` para ver la lista. Por ejemplo, `g` y luego una letra te lleva a una pantalla.
5. **Tema oscuro, densidad y ambiente festivo:** en el menú de tu avatar (arriba a la derecha). La densidad *compacta* muestra más información en menos espacio; el ambiente festivo se puede apagar cuando quieras.
6. **Instalar como app:** en Chrome o Edge, con el ícono de instalar de la barra de direcciones; en iPhone, Compartir → *Añadir a pantalla de inicio*. Una vez instalada, se actualiza sola cuando hay una versión nueva.

## Cómo se usa cada módulo

### Dashboard

Es la pantalla de inicio: el saludo del día y, debajo, **Turno Actual (en vivo)** con las mesas activas, el total de tallos y el avance contra la meta del día. Más abajo están el **Último Histórico registrado**, la **Clasificación y formadoras**, las visualizaciones y la **Tendencia de Producción**.

1. Quienes pueden cargar datos ven **Subir Reporte Boncheo** arriba a la derecha: lleva a *Rendimientos*.
2. Pulsa **Presentar** para mostrar la producción en una pantalla grande (ver *Modo Presentar*).
3. Si el último Histórico está desactualizado, la campana te lo avisa (ver *Notificaciones*).

### Modo Presentar

Pensado para mostrar en una pantalla o televisor: diapositivas a pantalla completa con el **Top 3 de hoy**, el **Rendimiento hora a hora de todo el equipo**, la **Clasificación por línea** y el **Resumen por formadora**; las devoluciones aparecen cuando ya están cargadas para ese día. En temporada, trae decoración festiva. Controles: `←` y `→` cambian de diapositiva, la **barra espaciadora** pausa o reanuda, `+` y `-` cambian el tamaño, `F` apaga o enciende la decoración festiva y el botón **Salir** (arriba a la derecha) cierra la presentación.

### Personas

El catálogo que une todo: el **Emp.Cod** une a la persona con el boncheo y la **mesa** es su código corto.

1. Para cargar muchas personas, usa **Cargar Excel de Activos**.
2. Para agregar o corregir una, llena **Emp.Cod**, **Mesa (código)** y **Nombre completo** y pulsa **Guardar**.
3. Mantén este catálogo al día: si una persona no está aquí, no aparece bien en los demás módulos.

### Rendimientos

Aquí se sube el reporte y se consulta lo cargado.

1. Elige el **Reporte Consolidado Boncheo** (`.xls`, `.xlsx` o `.xlsb`). El archivo **nunca se guarda**: solo sus datos.
2. En **Guardar en** elige *Turno Actual* (el día en curso, hora a hora) o *Histórico* (días ya cerrados).
3. Indica la **Fecha operación**. Las horas de inicio y fin son opcionales y, si las llenas, **sobrescriben** lo que dice el Excel.
4. Para consultar, usa las tablas **Turno Actual (hora a hora)** e **Histórico**, con sus fechas y **Aplicar consulta**.
5. **Eliminar toda la tabla** borra lo cargado en esa tabla: úsalo solo si de verdad hay que empezar de cero.

### Reportes

1. En **¿Qué quieres descargar?** elige la fuente: *Turno Actual* o *Histórico* (con sus fechas).
2. Mira la **vista previa**: es la foto tal cual se descargará, con su encabezado, el rendimiento promedio, el total de tallos, los **cuatro estados** con su conteo y la tabla de personas.
3. Descarga en **PNG**, **JPG**, **PDF** o **Excel**. Con **Pantalla completa** ves la foto grande.
4. Abajo hay el resumen por línea, por formadora y la **Clasificación hora a hora** (con su propia vista previa).

Los cuatro estados se calculan contra la meta por hora:

| Estado | Regla |
|---|---|
| **Excelente** | 130 % o más de la meta |
| **Cumple** | 100 % a 129 % |
| **A punto de cumplir** | 90 % a 99 % |
| **Por mejorar** | menos de 90 % |

El Administrador ve además una tabla de **Tiempo Productivo** para detectar a quien trabajó muy poco tiempo; esa tabla **nunca** sale en los archivos que se descargan.

### Ranking

Ordena a las personas por rendimiento y muestra la **Distribución por Estado** (los cuatro estados de arriba). También hay un ranking por formadora. La semana del ranking termina el día que fijes en *Configuración*.

### Líneas

Tiene tres usos:

1. **Líneas y formadoras:** qué formadora tiene cada línea.
2. **Asignación diaria de personal:** quién trabajó con qué formadora y en qué línea ese día. De aquí salen el tablero de formadoras y los resúmenes por equipo.
3. **Tablero de formadoras:** pulsa **Vista previa** para ver la imagen, y luego **Imagen** o **PDF** para descargarla.

**Asignar un clasificador a un bonchador (por día):** busca por nombre al bonchador (entre los asignados ese día) y al clasificador (entre las personas del catálogo). Ese día el clasificador toma, en el TIC, la **asistencia, el rendimiento y las devoluciones** de su bonchador. Un clasificador tiene un solo bonchador por día; si lo cambias el mismo día, se reemplaza.

### Clasificación

Muestra los tallos movidos **hora a hora por línea**, comparados con el día anterior (o con otro día guardado que elijas).

1. Alterna entre **Por hora** y **Acumulado**.
2. Descarga en **Imagen** o **PDF**, o mira antes la **Vista previa**.
3. El detalle por hora se conserva **4 días**; después queda el total diario en el histórico.

### Devoluciones

La calidad de lo que se devuelve. Se alimenta con el Excel de devoluciones; al cargarlo, solo se escribe lo **nuevo o lo que cambió**. Tiene pestañas:

- **Resumen:** totales por período y el **Top 3 de personas por causa**.
- **Top 5:** quién tiene más y quién tiene menos devoluciones (la imagen lleva dos gráficos: devoluciones por día o mes y causas que más pesan).
- **Causas**, **Tendencia**, **Colaborador** (el seguimiento de una persona) y **Formadoras**.

Las imágenes se pueden ver antes con **Vista previa** y bajar con **Descargar imagen**. En el *Top 3 por causa* eliges **Imagen con**: solo código (para mostrar en grupo), solo nombre (para verificar) o código y nombre. Los *mínimos de días trabajados* del Top 5 los fija el Administrador.

### TIC — Tablero Integrado del Colaborador

La ficha completa de una persona: **productividad, calidad y presentismo** juntas.

1. Busca por **código corto** o por **nombre**.
2. Verás sus indicadores, el calendario del mes y el detalle de cada día.
3. En el **presentismo**, los domingos y los **festivos de Colombia** solo cuentan si la persona fue citada ese día; un día sin ningún registro en la finca no se considera trabajado.
4. Si fue clasificador, el día muestra "Como clasificador de…" y toma los datos de su bonchador.

### Tableros e Indirectos

- **Tableros:** tableros conectados de toda la operación dentro de la app. Quienes tienen la **nota de la clave** la ven enmascarada (`••••`) y pueden mostrarla u ocultarla.
- **Indirectos:** el personal indirecto (supervisión, calidad, logística, mantenimiento).

### Gerencia

Vista ejecutiva con herramientas conectadas, como **Costo por Tallo**. Está protegida con una clave; si la herramienta no abre, usa **Reintentar**.

### Configuración

Solo Administrador y Digitador. Aquí están:

- **Meta de tallos de HOY** y la **meta por hora / persona**.
- **Jornada** (hora de inicio y fin por defecto) y el día en que **termina la semana del Ranking**.
- **Descuentos de tiempo** (Histórico y Turno Actual): por hora de corte y minutos a descontar, o para corregir una fecha.

### Usuarios

Solo Administrador y Digitador. En **Crear nueva cuenta** pones nombre completo, usuario (o correo para el Administrador), contraseña y **rol**. En **Cuentas existentes** cambias el rol, activas o desactivas la cuenta, o la eliminas.

### Auditoría (solo Administrador)

El cuidado de la base de datos:

1. **Almacenamiento:** cuánto espacio usa la base.
2. **¿Cuándo se llena la base de datos?:** una estimación con el ritmo real de los últimos 60 días, qué tablas la llenan y consejos para no quedarse sin espacio.
3. **Copia de seguridad (`.tmbackup`):** **exporta** una copia de toda la información o **importa** una (combinando con lo actual, o reemplazando). Cada copia lleva una huella por tabla: si alguien la altera, se rechaza.
4. **Copias automáticas:** una vez al mes se guarda sola una copia con el nombre *Backup TMControl* y las fechas del primer y último registro (ej. `Backup TMControl 12-10-26_6-2-27`). Se conservan las últimas 12.
5. **Depuración semestral:** cuando hay datos de más de 6 meses, descarga **dos respaldos** (Excel y `.tmbackup`) y, escribiendo una frase de seguridad, elimina lo anterior al corte.
6. **Vaciar datos operativos:** borra lo que se acumula día a día (conserva usuarios, personas, líneas y configuración). Exige una frase y haber descargado antes el respaldo.

### Resúmenes (solo Administrador)

El resumen de la **finca** o de **un equipo** (una formadora), por **semana anterior**, **mes anterior**, **últimos 7 días** o fechas a elección. Trae una imagen con tallos, rendimiento, cumplimiento, devoluciones, calidad y clasificación, comparados con el período anterior, y un texto con lo más importante. Puedes **Descargar imagen**, **Copiar texto** o verla en **Pantalla completa**. La *Firma* ("De parte de…") es opcional y se guarda en tu equipo.

### Cómo se usa (este manual)

Para todos los roles. Tiene tres pestañas:

1. **Recorrido** (la primera): un paso por pantalla, con dibujos animados de las pantallas reales y cuatro puntos que explican lo importante. Avanza solo; puedes **Pausar**, ir atrás o adelante con los botones, con `←` `→` (la barra espaciadora pausa), tocando un tramo de la barra de arriba o deslizando en el celular. Cada paso trae **Ir a…** (te lleva a esa pantalla) y **Practícalo** (abre su lección).
2. **Manual**: un centro de práctica. Cada módulo es una **lección** con tres etapas: **Mira** (el dibujo y los puntos), **Pruébalo** (un simulador que usa las mismas reglas de la app: mueves el deslizador y ves el estado, marcas días del calendario y ves el presentismo, cambias la base de datos y ves cuándo se llena, simulas la campana…) y **Demuéstralo** (un reto de una pregunta). Al acertar, la lección queda **dominada**, sube tu nivel (de Principiante a Experto TMControl) y se guarda en tu equipo. Dentro de cada lección puedes abrir *Leer la guía completa de este módulo*, y arriba, *Ver todo el texto (referencia)* con buscador.
3. **Novedades**: qué cambió en cada versión. Cuando sale una versión nueva, la campana te avisa **una sola vez**.

## Notificaciones (la campana)

Arriba a la derecha. **Solo lo crítico interrumpe** (un aviso flotante, una vez al día); lo demás espera en la campana, **ordenado por importancia**: *Requieren atención*, *Importantes* e *Informativas*. Cada aviso trae un botón para ir a resolverlo.

- **Mañana:** te lo recuerda al día siguiente. **✕:** lo descarta.
- **No molestar** (la lunita): silencia los avisos flotantes durante 1 hora o hasta mañana.
- Cada rol ve solo lo suyo. Ejemplos: rendimiento bajo sostenido (3 o más días seguidos bajo el 90 % de la meta), devoluciones o Histórico sin cargar (sin contar domingos ni festivos), clasificadores sin asignar, base de datos casi llena, copia mensual pendiente, depuración semestral, el festivo del día y las **novedades de cada versión**.

## Fotos: vista previa, pantalla completa y descarga

Todo lo que se puede descargar como imagen se puede **ver antes**, igual a como saldrá: ranking de Reportes, Top 5 y Top 3 por causa, Clasificación, tablero de formadoras y Resúmenes. Pulsa **Pantalla completa** para verla más grande y `Esc` para cerrar. Lo que ves y lo que se descarga salen del mismo dibujo, así que no pueden diferir.

## Roles y permisos

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo, incluida Auditoría, Resúmenes, Configuración y Usuarios |
| **Ingeniero** | Ver todo y cargar/editar datos; ve Gerencia con su clave |
| **Profesional** | Ver todo y cargar/editar datos |
| **Digitador** | Cargar/editar datos; además Configuración y Usuarios |
| **Supervisor** | Solo **ver** (sin botones de subir, editar ni borrar) |
| **Formador** | Solo **ver**, igual que el Supervisor |

## Flujo recomendado del día

1. Al empezar el turno, sube el **Reporte Consolidado Boncheo** a *Turno Actual* (*Rendimientos*).
2. Revisa el **Dashboard** durante el día; usa **Presentar** en la pantalla del equipo.
3. Carga la **clasificación** y la **asignación diaria** (y los clasificadores, si hay).
4. Al cerrar el día, guarda lo del día en **Histórico** y carga las **Devoluciones**.
5. Cada semana, mira el **Ranking**, los **Resúmenes** y el **TIC** de quien necesites.
6. Cada mes, el Administrador confirma que se hizo la **copia automática** (*Auditoría*).

## Preguntas frecuentes

**¿Por qué el presentismo de alguien es bajo?** Revisa si es clasificador: solo cuentan los días con asignación. Y recuerda que domingos y festivos no cuentan si no fue citado.

**¿Por qué un día no aparece en Devoluciones?** Todavía no se ha cargado; la campana avisa cuando faltan 2 o más días de trabajo.

**¿Puedo recuperar datos borrados?** Sí, si hay una copia: *Auditoría → Copia de seguridad → Importar*.

**¿Se manda algo por WhatsApp?** No. Los resúmenes y las imágenes se ven, se descargan o se copian desde la app.

**¿La app funciona sin internet?** Abre sin conexión (es una PWA), pero para ver datos nuevos y subir reportes necesita conexión.

## Limitaciones honestas

- La **copia mensual automática** depende de que la tarea programada de Vercel esté configurada; si no, la campana avisa desde el día 3 que falta.
- El **PDF** y el **Excel** de Reportes no tienen vista previa propia (las imágenes sí).
- **Resúmenes** es solo para el Administrador porque muestra cifras de todo el personal.
- Lo que **no** está probado en dispositivos reales (iPhone/Android) ni en una base de Supabase con Storage real se indica en las notas de cada versión.

<!-- USO:FIN -->

<!-- TECNICO:INICIO -->

## Instalación y mantenimiento

Lo que sigue es para quien administra la aplicación (no aparece en la pantalla *Cómo se usa*).

### Parte 1 — Base de datos en Supabase (una sola vez)

1. Entra a **supabase.com**, crea un proyecto y espera a que termine de aprovisionarse.
2. Abre el **SQL Editor** y pega **todo** el contenido de `supabase/migracion_autenticacion.sql`. Se puede volver a ejecutar para actualizar una base existente; la sección 32 ya no se usa y se puede omitir.
3. En **Authentication → Providers → Email**, desactiva **Confirm email**.
4. En **Authentication → Users** crea el primer administrador y, en la tabla `perfiles`, ponle `rol = 'administrador'` y `es_super_admin = true`.
5. En **Project Settings → API** copia la **Project URL**, la **anon public key** y la **service_role key** (esta última solo para Vercel, nunca en el código).

### Parte 2 — Probarlo en tu computador

Requisitos: **Node.js 18 o superior**.

1. Descomprime el proyecto y abre una terminal dentro de la carpeta.
2. Crea un archivo `.env` con:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-real
   ```
3. Instala y ejecuta:
   ```
   npm install
   npm run dev
   ```
4. Abre **http://localhost:5173**.

### Parte 3 — Publicarlo gratis en Vercel

1. Sube la carpeta a un repositorio de GitHub y créalo en **vercel.com** (*Add New → Project*).
2. Antes de *Deploy*, agrega en **Environment Variables**:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (como en `.env`).
   - `SUPABASE_SERVICE_ROLE_KEY` (solo en Vercel): la usan crear/gestionar usuarios y la copia automática.
   - `CRON_SECRET` (una clave larga inventada por ti): protege la tarea programada.
3. Pulsa **Deploy**. Cada `git push` republica sola.

### Copia mensual automática (tarea programada)

`vercel.json` programa una llamada diaria a `/api/cron-diario` (9:00 a. m. de Colombia). Si todavía no hay copia del mes, el servidor la genera y la guarda en el almacenamiento privado `respaldos` (se crea con la sección 30 del SQL). No depende de que alguien abra la app. Si no tienes `CRON_SECRET` y `SUPABASE_SERVICE_ROLE_KEY`, no se ejecuta.

### Actualizar después de hacer cambios

1. Sustituye los archivos del proyecto y ejecuta `npm install` si cambió `package.json`.
2. Si hay secciones nuevas en el SQL, ejecútalas en Supabase.
3. `git push`. La app instalada se actualiza sola.

### Comandos útiles

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor local |
| `npm run build` | Compilación de producción (con service worker) |
| `npm run build:sin-pwa` | Compilar sin el service worker (diagnóstico) |
| `npm run verificar-arquitectura` | Comprueba las reglas de dependencia y que no queden marcas de conflicto de Git |
| `npm run verificar-manual` | Comprueba que cada módulo y la versión actual estén en este manual |
| `npm run revisar-instalacion` | Busca archivos `package.json` dañados en `node_modules` |
| `npm run diagnosticar-build` | Señala qué archivo falló si la compilación se detiene |

### Si la app no carga o la compilación falla

1. Debe existir `.env` (o las variables en Vercel). Tras agregarlas en Vercel, haz **Redeploy**.
2. Si en Windows la compilación se detiene al generar el service worker, el proyecto ya usa una carpeta temporal propia; ejecuta `npm run revisar-instalacion`.
3. Si Git dejó marcas `<<<<<<<` en algún archivo, `npm run verificar-arquitectura` las encuentra.
4. En la app, usa la consola del navegador (`F12`) para ver el error.

### Estructura del proyecto

```
torremolinos-control/
├── MANUAL.md                ← este manual (lo lee también la pantalla "Cómo se usa")
├── supabase/migracion_autenticacion.sql   ← todo el esquema y las funciones
├── api/                     ← funciones del servidor (usuarios y copia mensual)
├── scripts/                 ← verificadores (arquitectura, manual, instalación)
└── src/
    ├── lib/                 ← lógica: módulos PUROS (cálculos) y de infraestructura (base de datos)
    ├── components/          ← piezas de pantalla
    ├── pages/               ← una página por módulo
    └── styles/              ← estilos
```

La regla de dependencias (la lógica pura no toca la base de datos ni la pantalla) está en `ARQUITECTURA.md` y la vigila `npm run verificar-arquitectura`.

### Cómo se mantiene este manual

**Cada vez que se actualiza la app o se agrega una función, este manual se actualiza en el mismo cambio:**

1. Si hay un **módulo nuevo**, agrégalo a la tabla *Módulos incluidos*, escribe su sección en *Cómo se usa cada módulo* y crea su paso en el recorrido (`src/lib/recorrido.js`, con su dibujo en `src/components/recorrido/Visuales.jsx`) y su lección interactiva (`src/lib/aprende.js`: un simulador o cuatro cartas para descubrir, y un reto de tres opciones). Los textos son cortos: título, una frase y hasta 4 puntos.
2. Si cambia o se agrega una función de uno existente, ajusta su sección.
3. Sube la `version` de `package.json` y agrega arriba, en *Historial de cambios*, una entrada `### Versión X.Y.Z — dd/mm/aaaa · título`.
4. Ejecuta `npm run verificar-manual`: falla si falta un módulo del menú (en la tabla, en su sección, en el recorrido o en las lecciones), si un texto del recorrido o de un reto es demasiado largo o la versión actual no está en el historial.

La campana avisa a cada persona, una sola vez por versión, que hay novedades.

<!-- TECNICO:FIN -->

<!-- NOVEDADES:INICIO -->

## Historial de cambios

### Versión 1.3.0 — 22/10/2026 · Manual interactivo con simuladores

- **El manual ya no es solo texto:** cada módulo es una lección con tres etapas, *Mira*, *Pruébalo* y *Demuéstralo*, con progreso, niveles (de Principiante a Experto TMControl) y confeti al dominarla.
- **Simuladores con las reglas reales de la app:** estados de rendimiento (Excelente, Cumple, A punto de cumplir, Por mejorar), subir un reporte, presentismo con domingos y festivos de Colombia, la imagen real del Top 3 por causa, cuándo se llena la base de datos y la campana de notificaciones.
- **Recorrido más descriptivo:** cuatro puntos por paso y cada dibujo dentro de una ventana de la app; cada paso tiene el botón *Practícalo*.
- El texto completo sigue disponible como *referencia*, con buscador.
- Cada módulo nuevo debe traer su lección: `npm run verificar-manual` lo exige.

### Versión 1.2.0 — 22/10/2026 · Recorrido animado para aprender la app

- **Cómo se usa ahora es un recorrido animado:** un paso por pantalla, con pocas palabras y un dibujo que se mueve para cada módulo. Avanza solo, se puede pausar, ir atrás o adelante, saltar a un paso y, en cada uno, ir directo a la pantalla.
- Cada rol ve solo los pasos de lo que puede usar.
- El manual completo y las novedades siguen en las pestañas *Manual* y *Novedades*.
- Cada módulo nuevo debe traer su paso: `npm run verificar-manual` lo exige.

### Versión 1.1.0 — 22/10/2026 · Manual dentro de la app, vista previa, resúmenes y copias

- **Cómo se usa:** este manual ahora está dentro de la app, con buscador y novedades; la campana avisa de cada versión nueva.
- **Vista previa de las fotos:** ranking de Reportes, Top 5, Top 3 por causa, Clasificación, tablero de formadoras y Resúmenes se ven antes de descargar, iguales a la foto, y con **Pantalla completa**. Los cuatro estados (Excelente, Cumple, A punto de cumplir, Por mejorar) se ven con su conteo y su regla.
- **Resúmenes:** resumen de la finca o de cada equipo, con imagen (con el **logo real**) y texto para copiar. Se quitaron los envíos por WhatsApp.
- **Notificaciones rediseñadas:** campana agrupada por importancia, con botón de acción, *Mañana* y *No molestar*; el aviso flotante solo interrumpe lo crítico. El aviso de Histórico desactualizado pasó a la campana.
- **Copias de seguridad:** copia `.tmbackup` (exportar e importar), copia mensual automática desde el servidor con el nombre *Backup TMControl* y las fechas, y **depuración semestral** con doble respaldo.
- **Auditoría:** estimación de cuándo se llena la base de datos, con consejos.
- **Clasificadores:** asignar un clasificador a un bonchador por día; en el TIC toma su asistencia, rendimiento y devoluciones.
- **Festivos de Colombia:** domingos y festivos entran al presentismo solo para quien fue citado; el calendario del mes los marca.
- **Top 3 por causa:** la imagen se puede hacer por código, por nombre o por ambos.
- **Roles:** el Formador tiene los mismos permisos de solo lectura que el Supervisor.
- **Base de datos:** nuevas secciones 28 a 31 del SQL (vaciar, clasificadores, copias y depuración, espacio).

### Versión 1.0.0 — Versión base

- Dashboard con Turno Actual en vivo y modo Presentar.
- Rendimientos (carga del Reporte Consolidado Boncheo), Reportes (PNG, JPG, PDF y Excel), Ranking, Líneas, Clasificación y Personas.
- Devoluciones, TIC, Tableros, Indirectos y Gerencia.
- Configuración, Usuarios con roles y Auditoría.
- App instalable (PWA) con actualización automática.

<!-- NOVEDADES:FIN -->
