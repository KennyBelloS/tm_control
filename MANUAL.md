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
| **Personas** | Catálogo de colaboradores: Emp.Cod, mesa (código) y nombre. Carga desde el Excel o el PDF de Activos | Todos ven · editan solo Administrador, Ingeniero y Digitador |
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
| **Seguridad** | Índice de seguridad, cuentas con su último acceso, mapa de permisos y actividad reciente | Solo Administrador |
| **Resúmenes** | Resumen ejecutivo de todo (finca y equipos), con forma de correo, para descargar en imagen o PDF | Solo Administrador |
| **Cómo se usa** | Recorrido animado, manual interactivo con lecciones y simuladores, y las novedades de cada versión | Todos |

## Primeros pasos

0. **Cada vez que inicias sesión** aparece una pantalla de bienvenida que te lleva primero al recorrido. **Si es tu primera vez**, abre **Cómo se usa**: el *Recorrido* te enseña la app con dibujos que se mueven y el *Manual* te deja practicar cada módulo con simuladores.
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
4. Arriba, la tarjeta **Novedades** muestra lo nuevo de la versión: siempre está a la vista (se puede plegar a una barra, pero no desaparece) y lleva a *Cómo se usa → Novedades*.

### Modo Presentar

Pensado para mostrar en una pantalla o televisor: diapositivas a pantalla completa con el **Top 3 de hoy**, el **Rendimiento hora a hora de todo el equipo**, la **Clasificación por línea** y el **Resumen por formadora**; las devoluciones aparecen cuando ya están cargadas para ese día. En temporada, trae decoración festiva. Controles: `←` y `→` cambian de diapositiva, la **barra espaciadora** pausa o reanuda, `+` y `-` cambian el tamaño, `F` apaga o enciende la decoración festiva y el botón **Salir** (arriba a la derecha) cierra la presentación.

### Personas

El catálogo que une todo: el **Emp.Cod** une a la persona con el boncheo y la **mesa** es su código corto.

1. Para cargar muchas personas, usa **Cargar Activos (Excel o PDF)**. Con el **PDF** del reporte (columnas Mesa, Nombre, Emp.Cod, Rol) solo se guarda la **mesa** de quien ya existe y quien falta se crea; las filas incompletas se ignoran sin avisar. Con el Excel se actualiza todo.
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

Las imágenes se pueden ver antes con **Vista previa** y bajar con **Descargar imagen**. La foto del *Top 5* trae el gráfico de barras y la tabla, como en la app. En el *Top 5* y en el *Top 3 por causa* eliges **Imagen con**: solo código (para mostrar en grupo), solo nombre (para verificar) o código y nombre. Los *mínimos de días trabajados* del Top 5 los fija el Administrador.

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

**Permiso por persona:** en la columna **Permiso** el Administrador decide, cuenta por cuenta, si la persona **solo ve**, **puede editar** o vale **según su rol**. El Administrador siempre edita. Cada cambio avisa qué quedó («Ana ahora solo puede VER»). Nadie puede cambiarse el permiso a sí mismo.

### Auditoría (solo Administrador)

El cuidado de la base de datos:

1. **Almacenamiento:** cuánto espacio usa la base.
2. **¿Cuándo se llena la base de datos?:** una estimación con el ritmo real de los últimos 60 días, qué tablas la llenan y consejos para no quedarse sin espacio.
3. **Copia de seguridad (`.tmbackup`):** **exporta** una copia de toda la información o **importa** una (combinando con lo actual, o reemplazando). Cada copia lleva una huella por tabla: si alguien la altera, se rechaza.
4. **Copias automáticas:** una vez al mes se guarda sola una copia con el nombre *Backup TMControl* y las fechas del primer y último registro (ej. `Backup TMControl 12-10-26_6-2-27`). Se conservan las últimas 12.
5. **Depuración semestral:** cuando hay datos de más de 6 meses, descarga **dos respaldos** (Excel y `.tmbackup`) y, escribiendo una frase de seguridad, elimina lo anterior al corte.
6. **Vaciar datos operativos:** borra lo que se acumula día a día (conserva usuarios, personas, líneas y configuración). Exige una frase y haber descargado antes el respaldo.

### Seguridad (solo Administrador)

El tablero de seguridad dice **qué tan protegido está el sistema**, con cosas concretas para hacer:

1. **El escudo:** un índice de 0 a 100 y su nivel (*Muy sólida*, *Sólida*, *Mejorable* o *En riesgo*). Sale de doce revisiones: seguridad por filas en la base, administradores, quién puede editar, permisos especiales, cuentas sin usar, editores sin entrar, cuentas que nunca entraron, copia de seguridad, espacio, errores que ven las personas, protección de la conexión y servicio de cuentas. Si un dato no se pudo leer, la revisión dice **«sin datos»** (cuenta la mitad): nunca se inventa.
2. **Qué conviene hacer:** los pendientes, del más urgente al menos, cada uno con su explicación y, cuando hay que configurar algo, **los pasos**.
3. **Quién usa la app:** quién **más** y quién **menos** entra (7, 30 o 90 días). Una «entrada» es abrir la app (una cada 20 minutos por persona); el conteo empieza desde que se activó el registro.
4. **Cuentas y comportamiento:** cada cuenta con su rol, si edita o solo ve, y cuándo entró por última vez (verde reciente, ámbar hace tiempo, rojo sin usar, morado nunca, gris «sin datos»). Toca una cuenta para ver cuántas veces entra, en cuántos días, desde qué aparato y qué errores ha visto.
5. **Errores recientes:** los errores que han visto las personas, con su referencia («ref.»), pantalla, aparato y quién. Sirve para ayudar a esa persona o para ver si algo falla en general.
6. **Mapa de permisos**, **actividad reciente** (copias, importaciones y borrados) y **Este equipo**: conexión cifrada, vencimiento de tu sesión y los datos guardados para ver sin internet, que puedes borrar.

Si el servicio de cuentas no está configurado, Seguridad te lo dice y te da los pasos (están también en «Instalación y mantenimiento»). Las revisiones de último acceso, errores y entradas se activan al completar la configuración de la base de datos.

### Resúmenes (solo Administrador)

El **resumen ejecutivo** de todo, con forma de correo: sale solo al abrir la pantalla, sin tocar nada. Trae:

1. **Encabezado y titular:** el logo, «Sistema Integrado de Gestión» y una banda verde con el período y cómo fue (*Se cumplió la meta*, *Muy cerca de la meta*, *Por debajo de la meta*…).
2. **Indicadores y panorama:** seis indicadores con su tendencia contra el período anterior y un texto redactado con los números reales (producción, meta, equipos, calidad, clasificación y destacados).
3. **Producción por día** (toca una barra para ver el detalle), **desempeño de cada equipo** (toca uno para desplegarlo), causas de devolución, clasificación por línea y los destacados.
4. **Conclusiones y recomendaciones**, y el **estado del sistema y pendientes** (lo mismo que avisa la campana).
5. Una nota, «Cordialmente,» y tu **firma**.

Arriba eliges **semana anterior**, **mes anterior**, **últimos 7 días** o fechas a elección. Puedes **Descargar imagen**, **Descargar PDF** (un documento continuo) o **Copiar texto**. En *Firma del resumen* editas tu nombre, cargo, ubicación y, si quieres, correo y teléfono; se guarda en tu equipo.

### Cómo se usa (este manual)

Para todos los roles. Tiene tres pestañas:

1. **Recorrido** (la primera): un paso por pantalla, con dibujos animados de las pantallas reales y cuatro puntos que explican lo importante. Avanza solo; puedes **Pausar**, ir atrás o adelante con los botones, con `←` `→` (la barra espaciadora pausa), tocando un tramo de la barra de arriba o deslizando en el celular. Cada paso trae **Ir a…** (te lleva a esa pantalla) y **Practícalo** (abre su lección).
2. **Manual**: un centro de práctica. Cada módulo es una **lección** con tres etapas: **Mira** (el dibujo y los puntos), **Pruébalo** (un simulador que usa las mismas reglas de la app: mueves el deslizador y ves el estado, marcas días del calendario y ves el presentismo, cambias la base de datos y ves cuándo se llena, simulas la campana…) y **Demuéstralo** (un reto de una pregunta). Al acertar, la lección queda **dominada**, sube tu nivel (de Principiante a Experto TMControl) y se guarda en tu equipo. Dentro de cada lección puedes abrir *Leer la guía completa de este módulo*, y arriba, *Ver todo el texto (referencia)* con buscador.
3. **Novedades**: qué cambió en cada versión. Cuando sale una versión nueva, la campana te avisa **una sola vez**.

### Mi perfil: tu nombre y tu rosa

Toca tu avatar (arriba a la derecha) y elige **Mi perfil**:

1. **Tu nombre:** escríbelo como quieras que te vean los demás (de 2 a 60 letras). Lo puede cambiar cada quien, nadie más; tu rol no cambia.
2. **Tu rosa:** elige entre 12 rosas de distintos tipos (roja, blanca, rosada, amarilla, coral, lavanda, burdeos, durazno, fucsia, bicolor, silvestre y capullo). Aparece en la barra, en tu menú y en los avisos. Con **Usar mis iniciales** vuelves a tus iniciales.
3. Pulsa **Guardar mi perfil**. Para cambiar el nombre hay que haber completado la configuración de la base de datos; la rosa no lo necesita.

### El festejo

Cuando guardas, subes o editas algo florece una **rosa**, caen pétalos y debajo **dice qué pasó** («Reporte subido: 120 registros»). Si algo falla, la rosa se marchita y **dice el error** en palabras claras. No sale con avisos de «copiado», ni dos veces seguidas. Si no te gusta, apágalo en *Efectos y festividades* (tu menú): con **Apagado** no florece nada (queda solo el aviso normal) y con **Suave** salen menos pétalos. Si tu aparato pide «reducir movimiento», tampoco sale.

### Evolución por hora (Turno Actual)

En **Rendimientos**, **al final del Turno Actual** (separada del resto y plegable con su flecha), está **Evolución por hora**: a cada persona se le evalúa **cómo ha mejorado o empeorado hora por hora**.

- Cada hora se compara con la anterior: **Mejoró** o **Empeoró** si cambió 5 % o más, y **Igual** si no. La primera hora no se compara.
- Al abrir a una persona ves su rendimiento de cada hora con su % de la meta, su **mejor y su peor hora**, y una frase con la **tendencia del día** (va mejorando, va bajando o está estable; necesita 3 horas o más).
- Primero salen quienes **van bajando**, para mirarlos pronto; los filtros te dejan ver solo estables, solo quienes mejoran o quienes tienen pocas horas. **Desplegar todo** y **Plegar todo** (arriba y abajo de la lista) abren o cierran a todas las personas de una vez.
- **Las horas quedan guardadas** aunque un reporte nuevo reemplace al anterior (SQL **sección 34**), así la evolución del día no se pierde.

**A las 6:00 a. m. el Turno Actual se reinicia solo:** se borra todo lo del día anterior —los registros del Turno Actual y sus horas guardadas—, **pero nada del Histórico**. Lo hace la base de datos (a hora de Colombia), una tarea programada a las 6:00 a. m. y la app misma al abrirse. Un día de turno va de 6:00 a. m. a 5:59 a. m. del día siguiente: a medianoche **no** se reinicia. Ojo: si alguien sube un Turno Actual con fecha de un día anterior después de las 6:00 a. m., se borrará.

## Notificaciones (la campana)

Arriba a la derecha. **Solo lo crítico interrumpe** (un aviso flotante, una vez al día); lo demás espera en la campana, **ordenado por importancia**: *Requieren atención*, *Importantes* e *Informativas*. Cada aviso trae un botón para ir a resolverlo.

- **Tocar un aviso** lo abre completo, con el detalle de qué pasó y qué hacer, y lo deja **leído**: no vuelve a aparecer mientras la situación siga igual (si empeora, sí). La pestaña **Leídas** los guarda para consultarlos.
- **Mañana:** te lo recuerda al día siguiente. **✕:** lo descarta.
- **No molestar** (la lunita): silencia los avisos flotantes durante 1 hora o hasta mañana.
- Cada rol ve solo lo suyo. Ejemplos: rendimiento bajo sostenido (3 o más días seguidos bajo el 90 % de la meta), devoluciones o Histórico sin cargar (sin contar domingos ni festivos), clasificadores sin asignar, base de datos casi llena, copia mensual pendiente, depuración semestral, el festivo del día y las **novedades de cada versión**.

## Fotos: vista previa, pantalla completa y descarga

Todo lo que se puede descargar como imagen se puede **ver antes**, igual a como saldrá: ranking de Reportes, Top 5 y Top 3 por causa, Clasificación, tablero de formadoras y Resúmenes. Pulsa **Pantalla completa** para verla más grande y `Esc` para cerrar. Lo que ves y lo que se descarga salen del mismo dibujo, así que no pueden diferir. La vista previa se ajusta al ancho de tu pantalla (se ve entera, sin mover nada) y se **agranda o achica** con los botones **− / Ajustada / +**, pellizcando con dos dedos o con `Ctrl` + rueda. Las fotos de rendimientos dicen arriba el **horario** que cubren (ej. *6:00 a. m. – 11:00 p. m.*).

## Roles y permisos

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo, incluida Auditoría, Seguridad, Resúmenes, Configuración y Usuarios |
| **Ingeniero** | Ver todo y cargar/editar datos; ve Gerencia con su clave |
| **Profesional** | Solo visualización: ve todo, no edita nada |
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

## Sin conexión a internet

La app sigue abriendo sin internet y te muestra **lo último que viste**; para guardar cambios necesita conexión.

- Abajo aparece un aviso **«Sin conexión»**. Solo sale cuando de verdad no hay internet (se confirma dos veces); un servidor lento o con un error **no** cuenta como "sin conexión".
- Sin internet **ver** funciona (con los datos guardados) y **guardar** te avisa con claridad en lugar de quedarse colgado.
- Al volver el internet el aviso cambia a **«Conexión restablecida»** y la pantalla vuelve a pedir los datos sola.
- Por seguridad, esos datos guardados se borran al iniciar o cerrar sesión.

**En el celular:** como a veces hay señal pero no hay datos, ninguna consulta espera más de 10 segundos; pasado ese tiempo se muestra lo último guardado y aparece «Sin conexión». Tu sesión **no se cierra** por una señal mala: solo se cierra si tú sales o si el Administrador desactiva tu cuenta.

## Celulares (iPhone y Android)

- La barra de arriba es de **una sola fila** y queda fija: el menú de **tres líneas** (☰) siempre está a la mano, junto al **logo de la app**, el título, la campana y tu avatar. Los botones de cada pantalla van debajo, sin tapar nada.
- Los menús respetan la muesca y la barra del iPhone, y las vistas previas ocupan la pantalla completa con zoom.

## Preguntas frecuentes

**¿Por qué el presentismo de alguien es bajo?** Revisa si es clasificador: solo cuentan los días con asignación. Y recuerda que domingos y festivos no cuentan si no fue citado.

**¿Por qué un día no aparece en Devoluciones?** Todavía no se ha cargado; la campana avisa cuando faltan 2 o más días de trabajo.

**¿Puedo recuperar datos borrados?** Sí, si hay una copia: *Auditoría → Copia de seguridad → Importar*.

**¿Se manda algo por WhatsApp?** No. Los resúmenes y las imágenes se ven, se descargan o se copian desde la app.

**¿La app funciona sin internet?** Sí, para **ver** lo último guardado (mira *Sin conexión a internet*); para subir reportes o guardar cambios necesita conexión.

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
| `npm run verificar-secretos` | Revisa que no haya llaves ni contraseñas escritas en el proyecto y que `.gitignore` proteja los `.env` |
| `npm run verificar-arranque` | Comprueba que el arranque de la app no cargue librerías pesadas (Excel, PDF, gráficos) |
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

### Llaves y variables (importante: nunca se suben a GitHub)

- **Públicas** (van dentro de la app): `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- **Secretas** (solo en el servidor): `SUPABASE_SERVICE_ROLE_KEY` (crear y administrar usuarios) y `CRON_SECRET` (copia mensual y reinicio de las 6 a. m.). **Nunca** llevan `VITE_` delante.
- En tu computador van en el archivo **`.env`** (copia `.env.example`). Ese archivo está en `.gitignore`: no se sube. En internet van en **Vercel → Settings → Environment Variables** (marca Production y Preview) y luego **Redeploy**.
- **Si sale «este servicio todavía no está configurado»:** Supabase → Project Settings → API → copia la llave `service_role` → pégala en Vercel como `SUPABASE_SERVICE_ROLE_KEY` → crea `CRON_SECRET` con un texto largo al azar → Redeploy. En tu computador pon las mismas dos en `.env` y reinicia `npm run dev`.
- `npm run verificar-secretos` revisa que no haya llaves escritas en el proyecto y que `.gitignore` proteja los `.env`.

## Historial de cambios

### Versión 1.8.0 — 28/10/2026 · Funciona mejor sin internet, seguridad más completa y rosas (≈ 2,5 días)

- **Mejora: sin internet en el celular:** ninguna consulta se queda colgada (esperan 10 segundos como máximo), sin internet se muestra al instante lo último guardado —sin mezclar «una fila» con «una lista», que era lo que daba datos equivocados— y, si la señal falla, **no se cierra tu sesión sola**.
- **Mejora: el Dashboard se arma por partes y el carrusel por ventanas:** primero la primera pantalla y, en ratos libres y uno tras otro, el carrusel, la clasificación, las formadoras y las gráficas. El carrusel sigue recorriendo a **todas** las personas, pero dibuja 40 por vuelta («41–80 de 190 personas»).
- **Nuevo en Seguridad: avisos de lentitud reales.** Si en un celular un toque tarda más de 1,5 segundos en mostrar su respuesta, queda en **Errores recientes** como «Lento: un toque tardó N s…», con el aparato y la pantalla. Así sabes cómo va en los celulares de verdad.
- **Mejora: celulares más ligeros:** en celulares y equipos modestos la app ya **no precarga pantallas en segundo plano** (competía con tu toque en los primeros segundos), y en el computador solo lo hace cuando está libre y se detiene mientras usas la app. Si hay «señal» pero los datos no llegan, a los ~8 segundos deja de esperar y muestra lo último guardado; ya detectado, cambiar de pantalla es instantáneo.
- **Arreglo: sin internet, al guardar ya no sale un código interno** (`tm_sin_red`), sino «No hay conexión con el servidor. Revisa tu internet…».
- **Mejora: el resumen muestra de dónde sale el porcentaje:** el cumplimiento sale de los **tallos reales entre las horas realmente trabajadas** frente a la meta por hora, y el documento lo dice («478.536 tallos en 982 horas reales ÷ meta 470 t/h»).
- **Mejora: los errores ya no salen con tecnicismos:** cada error se explica en palabras claras, con una referencia corta («ref. A3F9») para que el Administrador lo encuentre en Seguridad.
- **Nuevo: Seguridad con mucho más:** quién más y quién menos entra a la app, cómo usa la app cada persona, los errores que ven por persona, si el servicio de cuentas está bien configurado (con los pasos para arreglarlo), la protección de la conexión y los permisos especiales. El radar ya no dice «nunca entró» cuando no se sabe.
- **Nuevo: permiso por persona:** en Usuarios el Administrador decide si cada persona solo ve, puede editar o vale el de su rol.
- **Nuevo: avatares de rosas:** 12 rosas de distintos tipos; el festejo ahora es de rosas, **dice la acción que se hizo** y, si algo falla, **muestra el error** con la rosa marchita.
- **Mejora: Novedades se puede quitar:** con la ✕ de la tarjeta del inicio; se vuelve a mostrar desde Cómo se usa → Novedades.
- **Mejora: Evolución por hora al final:** separada del resto, se puede plegar toda la sección y desplegar o plegar todas las personas con un botón, arriba y abajo.
- **Mejora: llaves seguras:** `.gitignore` protege todos los archivos `.env`, hay un `.env.example` solo con marcadores y `npm run verificar-secretos` revisa que no haya llaves escritas en el proyecto.

### Versión 1.7.0 — 26/10/2026 · Tablero de seguridad, evolución por hora y perfil con flores (≈ 2,5 días)

- **Tablero de seguridad (solo Administrador):** un índice de 0 a 100 con lo que protege el sistema —cuentas, accesos, protecciones de la base, copias y espacio—, el mapa de permisos por rol, las cuentas con su último acceso y la actividad reciente.
- **Evolución por hora del Turno Actual:** cada hora queda guardada y a cada persona se le evalúa cómo mejoró o empeoró hora por hora, con su mejor y su peor hora y la tendencia del día.
- **El Turno Actual se reinicia solo a las 6 a. m.:** lo del día anterior se borra automáticamente; solo el Turno Actual, nada del Histórico.
- **Perfil con avatar de flores:** cada quien puede cambiar su nombre y elegir entre 12 flores ilustradas; aparecen en el menú, la barra y los avisos.
- **Festejo visual:** al guardar, subir o editar algo, florece una flor con pétalos que se esparcen.
- **Historial desde septiembre:** el proyecto empezó el 3 de septiembre de 2026; ahora se ven todas las versiones desde la 0.1.0.
- **Corregido:** el texto del carrusel de novedades salía oscuro y en mayúsculas; y en el celular solo queda el logo de la barra, junto al ☰.

### Versión 1.6.0 — 22/10/2026 · Resumen por proceso y persona, solo lectura y bienvenida nueva (≈ 2 días)

- **Resumen ejecutivo de lo que quieras:** de toda la finca, de **un proceso** (boncheo, clasificación o calidad) o de **una persona**, con la firma «Equipo Torremolinos» por defecto y «TMControl» en el encabezado.
- **Cifras más reales:** el cumplimiento es el *general* (rendimiento ÷ meta por hora, no tallos totales), la calidad es el % de tallos sin devolución sobre lo clasificado, y los destacados solo cuentan cifras confiables (3+ días, 12+ horas y sin valores atípicos). El resumen avisa qué datos faltan.
- **Solo editan Administrador, Ingeniero y Digitador:** Profesional, Supervisor y Formador solo visualizan, también en la base de datos (SQL sección 33).
- **Bienvenida renovada:** una tarjeta integrada con la app, que dice qué puede hacer tu rol y te lleva al recorrido.
- **«Nuevo» en cada función nueva:** aparece donde está la novedad y se quita solo a los 2 días; las novedades del inicio son una tarjeta animada que también se retira sola.
- **Cómo se usa más claro:** al terminar una lección pasa sola a la siguiente, cada una explica paso a paso cómo usarla y cómo leerla, y las tarjetas tienen íconos propios.
- **Fotos:** en el Top 5 los que más devuelven salen con código y los que menos con nombre; el horario dice cuánto dura y el histórico de miércoles y sábado va de 6 a 12; la vista previa ya no deja huecos ni tapa filas.
- **Colaborador en vez de operario** en todas las pantallas, y crear usuarios funciona también en tu computador (`npm run dev`).

### Versión 1.5.0 — 20/10/2026 · Resumen ejecutivo tipo correo y logo en el celular (≈ 1,5 días)

- **Resumen ejecutivo tipo correo:** Resúmenes genera solo un documento ejecutivo con titular, indicadores con tendencia, panorama redactado, gráficos animados, equipos, conclusiones, pendientes del sistema y firma. Se descarga en imagen o PDF.
- **Logo en la barra del celular:** el logo de la app aparece junto al menú de tres líneas, en iPhone y en Android.
- **Novedades siempre a la vista:** una tarjeta en el inicio con las novedades de la versión.
- **Descargas grandes arregladas:** las imágenes largas ya no fallan en silencio y el PDF pesa unas 30 veces menos.
- **Avisos:** con exactamente tres personas con rendimiento bajo ya no dice «y 0 más».

### Versión 1.4.0 — 17/10/2026 · Bienvenida, sin internet, celulares y más rápida (≈ 2 días)

- **Bienvenida al iniciar sesión:** una pantalla con tu saludo, tu rol y lo que trae tu recorrido, que te lleva primero a *Cómo se usa*.
- **Funciona sin internet:** muestra lo último guardado, avisa «Sin conexión» solo cuando de verdad no hay internet y se actualiza sola al volver.
- **Celulares:** barra superior de una fila con el menú de tres líneas siempre visible, menús dentro de la pantalla y vistas previas enteras con zoom (botones y pellizco).
- **Más rápida:** cada módulo se descarga solo cuando se necesita (el arranque pasó de 1,4 MB a 0,6 MB) y se evita repetir consultas iguales.
- **Personas por PDF:** se puede cargar el PDF de Activos; en quien ya existe solo se guarda la mesa.
- **Avisos:** tocar uno lo abre completo y lo deja leído (no vuelve a aparecer).
- **Fotos:** el Top 5 de devoluciones usa el gráfico de barras de la app, con selector «Imagen con»; las de rendimientos dicen el horario.
- **Resúmenes con otra cara:** la imagen trae un titular con color según cómo fue el período, un anillo de cumplimiento, el podio de destacados y la barra de turnos que cumplieron la meta.
- **Novedades en línea de tiempo:** la versión más reciente destacada y las anteriores plegables, cada novedad con su ícono y etiqueta.

### Versión 1.3.0 — 15/10/2026 · Manual interactivo con simuladores (≈ 1,5 días)

- **El manual ya no es solo texto:** cada módulo es una lección con tres etapas, *Mira*, *Pruébalo* y *Demuéstralo*, con progreso, niveles (de Principiante a Experto TMControl) y confeti al dominarla.
- **Simuladores con las reglas reales de la app:** estados de rendimiento, subir un reporte, presentismo con domingos y festivos de Colombia, la imagen real del Top 3 por causa, cuándo se llena la base de datos y la campana de notificaciones.
- **Recorrido más descriptivo:** cuatro puntos por paso y cada dibujo dentro de una ventana de la app; cada paso tiene el botón *Practícalo*.
- El texto completo sigue disponible como *referencia*, con buscador.
- Cada módulo nuevo debe traer su lección: `npm run verificar-manual` lo exige.

### Versión 1.2.0 — 13/10/2026 · Recorrido animado para aprender la app (≈ 1 días)

- **Cómo se usa ahora es un recorrido animado:** un paso por pantalla, con pocas palabras y un dibujo que se mueve para cada módulo. Avanza solo, se puede pausar, ir atrás o adelante, saltar a un paso y, en cada uno, ir directo a la pantalla.
- Cada rol ve solo los pasos de lo que puede usar.
- El manual completo y las novedades siguen en las pestañas *Manual* y *Novedades*.
- Cada módulo nuevo debe traer su paso: `npm run verificar-manual` lo exige.

### Versión 1.1.0 — 10/10/2026 · Manual dentro de la app (≈ 0,5 días)

- **Cómo se usa:** el manual ahora está dentro de la app, con buscador y novedades; la campana avisa de cada versión nueva.
- **Base de datos:** nuevas secciones 28 a 31 del SQL (vaciar, clasificadores, copias y depuración, espacio).

### Versión 1.0.9 — 09/10/2026 · Vista previa de todas las fotos (≈ 1 días)

- **Vista previa de las fotos:** ranking de Reportes, Top 5, Top 3 por causa, Clasificación, tablero de formadoras y Resúmenes se ven antes de descargar, iguales a la foto, y con **Pantalla completa**.
- Los cuatro estados (Excelente, Cumple, A punto de cumplir, Por mejorar) se ven con su conteo y su regla.

### Versión 1.0.8 — 08/10/2026 · Resúmenes (≈ 1 días)

- **Resúmenes:** resumen de la finca o de cada equipo, con imagen (con el **logo real**) y texto para copiar.
- Se quitaron los envíos por WhatsApp.

### Versión 1.0.7 — 07/10/2026 · Notificaciones rediseñadas (≈ 1 días)

- **Campana agrupada por importancia,** con botón de acción, *Mañana* y *No molestar*; el aviso flotante solo interrumpe lo crítico.
- El aviso de Histórico desactualizado pasó a la campana.

### Versión 1.0.6 — 06/10/2026 · Depuración semestral y espacio de la base (≈ 1 días)

- **Depuración semestral** con doble respaldo (Excel y copia completa).
- **Auditoría:** estimación de cuándo se llena la base de datos, con consejos.

### Versión 1.0.5 — 05/10/2026 · Copias de seguridad (≈ 2 días)

- Copia `.tmbackup` (exportar e importar) y **copia mensual automática** desde el servidor, con el nombre *Backup TMControl* y las fechas.

### Versión 1.0.4 — 02/10/2026 · Top 3 por causa en imagen (≈ 0,5 días)

- **Top 3 por causa:** la imagen se puede hacer por código, por nombre o por ambos.

### Versión 1.0.3 — 01/10/2026 · Clasificadores asignados a bonchadores (≈ 1 días)

- **Clasificadores:** asignar un clasificador a un bonchador por día; en el TIC toma su asistencia, rendimiento y devoluciones.

### Versión 1.0.2 — 30/09/2026 · Formador solo lectura (≈ 0,5 días)

- **Roles:** el Formador tiene los mismos permisos de solo lectura que el Supervisor.

### Versión 1.0.1 — 29/09/2026 · Festivos de Colombia en el presentismo (≈ 1 días)

- **Festivos de Colombia:** domingos y festivos entran al presentismo solo para quien fue citado; el calendario del mes los marca.

### Versión 1.0.0 — 28/09/2026 · Lanzamiento (≈ 1 días)

- Pulido final de todos los módulos y primeras pruebas con el equipo de la finca.

### Versión 0.9.0 — 26/09/2026 · App instalable, tema oscuro y modo Presentar (≈ 1,5 días)

- App instalable (PWA) con actualización automática.
- Tema claro y oscuro, atajos de teclado y modo **Presentar** para pantallas grandes.

### Versión 0.6.0 — 24/09/2026 · Cuentas, roles y auditoría (≈ 2 días)

- Usuarios con roles (Administrador, Ingeniero, Profesional, Digitador, Supervisor y Formador) y acceso por rol.
- Configuración (metas y jornada) y Auditoría.

### Versión 0.5.0 — 22/09/2026 · Personas, Indirectos, Gerencia y Tableros (≈ 1,5 días)

- Catálogo de **Personas** (Emp.Cod, mesa y nombre), **Indirectos**, **Gerencia** protegida con clave y **Tableros**.

### Versión 0.4.0 — 19/09/2026 · Devoluciones y TIC (≈ 2 días)

- **Devoluciones:** resumen, causas, tendencia, Top 5, por colaborador y por formadora.
- **TIC:** el Tablero Integrado del Colaborador con productividad, calidad y presentismo.

### Versión 0.3.0 — 17/09/2026 · Líneas y Clasificación (≈ 2,5 días)

- **Líneas:** formadoras, asignación diaria de personal y tablero de formadoras.
- **Clasificación:** tallos por hora y por línea contra el día anterior.

### Versión 0.2.0 — 14/09/2026 · Dashboard, Reportes y Ranking (≈ 3 días)

- **Dashboard** con el avance del turno contra la meta.
- **Reportes** (PNG, JPG, PDF y Excel) y **Ranking** por persona y por formadora.

### Versión 0.1.0 — 10/09/2026 · Primeros rendimientos (≈ 5,5 días)

- **Rendimientos:** carga del Reporte Consolidado Boncheo (Excel), Turno Actual hora a hora e Histórico.
- Proyecto iniciado el **3 de septiembre de 2026**.

<!-- NOVEDADES:FIN -->
