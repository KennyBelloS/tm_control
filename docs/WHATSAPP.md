# Resúmenes automáticos por WhatsApp — guía de puesta en marcha

Qué hace: cada **lunes a las 9:00 a. m.** (y el **día 1 de cada mes**) la app manda por WhatsApp una **imagen** con las cifras y gráficos, más un **texto** que la describe, firmado con *"De parte de … · Enviado automáticamente por TMControl desde …"*. A las **8:00 a. m.** sale una notificación en la campana para **revisarlo o cancelarlo** antes.

Hay dos formas de usarlo, y la segunda no necesita nada de lo de abajo:

| | Automático | Manual |
|---|---|---|
| Cómo | Lo envía el servidor solo (lunes / día 1) | Pantalla **Resúmenes → Vista previa → Enviar por WhatsApp** |
| Qué necesita | Cuenta de WhatsApp Business (API de Meta) + los pasos de esta guía | Nada: en el celular abre la hoja de compartir con la imagen; en el computador descarga la imagen y abre WhatsApp con el texto |

## 1. Base de datos
Ejecuta la **sección 32** de `supabase/migracion_autenticacion.sql` (también la 30 para el almacenamiento de copias y la 31 para la estimación de espacio).

## 2. Cuenta de WhatsApp Business (Meta)
1. Entra a <https://developers.facebook.com> → crea una app tipo **Business** → agrega el producto **WhatsApp**.
2. En *WhatsApp → API Setup* copia el **Phone number ID**.
3. Crea un **token permanente**: Business Settings → Users → **System users** → crea uno (Admin) → *Generate token* con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
4. Agrega y verifica el **número desde el que se enviará** (mientras estés en modo de prueba, solo puedes enviar a números que agregues como destinatarios de prueba).

## 3. La plantilla de mensaje (obligatoria)
WhatsApp solo deja que una empresa **escriba primero** con una **plantilla aprobada**. En *WhatsApp Manager → Message templates → Create*:

- **Nombre:** `resumen_tmcontrol`   · **Categoría:** Utilidad   · **Idioma:** Español
- **Encabezado:** *Imagen* (sube cualquier imagen de ejemplo)
- **Cuerpo:** `Hola. Este es el resumen automático de la operación de la finca: {{1}}`  (con un ejemplo para {{1}})

Meta tarda de minutos a horas en aprobarla. Si usas otro nombre o idioma, ponlo en `WHATSAPP_PLANTILLA` / `WHATSAPP_IDIOMA`.

## 4. Variables en Vercel (Settings → Environment Variables)
| Variable | Valor |
|---|---|
| `WHATSAPP_TOKEN` | el token permanente del paso 2 |
| `WHATSAPP_PHONE_ID` | el *Phone number ID* |
| `CRON_SECRET` | una cadena larga y aleatoria (Vercel la usa para firmar las tareas programadas) |
| `SUPABASE_SERVICE_ROLE_KEY` | ya la tienes (usuarios) |
| `WHATSAPP_PLANTILLA`, `WHATSAPP_IDIOMA` | solo si cambiaste el nombre o el idioma de la plantilla |

Después haz un **Redeploy**.

## 5. Tareas programadas
`vercel.json` ya las declara (hora de Colombia = UTC−5):

- `13:00 UTC` (8:00 a. m.) → `/api/cron-diario?fase=aviso`: programa los envíos de hoy y quedan como *Programado* (cancelables).
- `14:00 UTC` (9:00 a. m.) → `/api/cron-diario?fase=envio`: envía lo programado **y** hace la **copia mensual** de la base de datos si todavía no existe (aunque nadie abra la app).

> En el plan gratuito (Hobby) Vercel ejecuta cada tarea **una vez al día y con precisión de una hora**: el "9:00 a. m." puede salir hasta ~9:59 a. m.

## 6. Primera prueba
Pantalla **Resúmenes** → agrega el destinatario → **Vista previa** (lo que verá) → **Enviar ahora**. Si algo falla, el motivo queda en la lista de *Envíos* y llega a la campana.

## Cosas a tener en cuenta
- Los números de teléfono son datos personales: solo el administrador los ve y **no se incluyen** en las copias de seguridad.
- Meta cobra por conversaciones iniciadas por la empresa; revisa las tarifas vigentes de tu país.
- El texto que va en la plantilla se acorta a ~900 caracteres (se quitan las frases del final, **nunca la firma**); la imagen lleva todo completo.
- El resumen usa el tiempo registrado en el reporte de boncheo (no descuenta los descansos que se editan después en la app), por eso puede diferir un poco del Dashboard.
