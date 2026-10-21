# Arquitectura de TMControl (guía corta)

Se aplica lo esencial de *Arquitectura Limpia* (R. C. Martin) **sin reestructurar nada**: una sola regla y un lugar claro para cada cosa.

## La regla de dependencia
> El código de adentro (las reglas del negocio) **no conoce** al de afuera (pantallas, base de datos, navegador, Excel).
> Las flechas apuntan siempre hacia adentro.

```
 Pantallas (pages/, components/)  ──►  Casos de uso y adaptadores (lib/*.js que hablan con Supabase, Excel, PDF)  ──►  Reglas puras (lib/*Calculos.js, …)
        React, rutas, estilos            leer/guardar datos, armar archivos, orquestar                                 cálculos, decisiones, validaciones
```

| Capa | Dónde está | Qué hace | Qué NO puede hacer |
|---|---|---|---|
| **Reglas puras** (dominio) | `lib/calculos.js`, `colaboradorCalculos.js`, `devolucionesCalculos.js`, `devolucionesAnalisis.js`, `devolucionesPresentacion.js`, `respaldoGlobal.js`, `hitos.js`, `fiestas.js`, `buscarColaborador.js`, `personasUtil.js`, `seguridad.js` | Calcula y decide: rendimiento, presentismo, qué vistas salen cada día, qué tablas se respaldan, la frase de seguridad… | Importar React, Supabase, Excel/PDF, pantallas; usar `window`, `document`, `localStorage` |
| **Adaptadores / casos de uso** | `lib/db.js`, `devoluciones.js`, `colaborador.js`, `respaldoGlobalDatos.js`, `exportRespaldoGlobal.js`, `hitosAlmacen.js`, `actualizacionApp.js` … | Lee y guarda datos, arma archivos, junta datos con las reglas puras | Contener reglas de negocio (esas van a las puras) |
| **Pantallas** | `pages/`, `components/` | Dibuja y reacciona a la persona | Hacer cálculos del negocio; consultar la base directamente (deuda conocida, ver abajo) |
| **Base de datos** | `supabase/migracion_autenticacion.sql` | Tablas, permisos (RLS) y funciones atómicas | — |

## Cómo se agrega algo nuevo (receta de 4 pasos)
1. **La regla, pura**: una función en un módulo puro (ej. `devolucionesAnalisis.js`). Recibe datos y devuelve datos.
2. **Su prueba**, con casos calculados a mano.
3. **El adaptador**: un módulo de `lib/` que lee/guarda y llama a la regla.
4. **La pantalla**, que solo llama al adaptador y dibuja.

Si el módulo nuevo es puro, **agrégalo a `PUROS`** en `scripts/verificar-arquitectura.mjs`.

## La comprobación automática
```
npm run verificar-arquitectura
```
Falla si una regla pura toca la base de datos, la pantalla o el navegador, o si `lib/` depende de una pantalla. Córrela antes de publicar.

## Otras prácticas que ya se aplican
- **Permisos en dos lugares**: la pantalla oculta lo que no corresponde, **y la base lo impide** (RLS + `puede_editar()` / `es_administrador()`). Supervisor y Formador son solo lectura en ambos.
- **Operaciones atómicas en la base**: la carga de devoluciones y el vaciado son funciones SQL (o se guarda todo o nada) y solo escriben lo que cambió.
- **Las listas duplicadas se vigilan con pruebas** (ej. las tablas que borra el SQL deben coincidir con `respaldoGlobal.js`).
- **Tareas largas protegidas**: la app instalada no se actualiza sola mientras se carga un Excel (`actualizacionApp.js`).

## Deuda conocida (se paga al tocar cada archivo, sin urgencia)
Pantallas que aún consultan Supabase directamente: `Configuracion.jsx`, `Dashboard.jsx`, `Rendimientos.jsx`, `NotaClave.jsx`.
Mezclas menores: `clasificacionCalculos.js` importa `xlsx` (lectura del archivo + cálculo).
