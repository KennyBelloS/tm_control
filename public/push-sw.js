/* Avisos fuera de la app: este archivo lo carga el service worker de la app instalada (vite.config.js → workbox.importScripts).
   Muestra el aviso aunque la app esté CERRADA y, al tocarlo, abre la pantalla que corresponde. */
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { titulo: 'TMControl', cuerpo: event.data ? event.data.text() : '' }; }
  const titulo = String(d.titulo || 'TMControl').slice(0, 80);
  event.waitUntil(self.registration.showNotification(titulo, {
    body: String(d.cuerpo || '').slice(0, 200),
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-32.png',
    tag: String(d.clave || 'tmcontrol').slice(0, 80),
    data: { ruta: typeof d.ruta === 'string' && d.ruta.startsWith('/') ? d.ruta : '/' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const ruta = (event.notification.data && event.notification.data.ruta) || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ventanas => {
    for (const v of ventanas) { if (v.url.startsWith(self.location.origin) && 'focus' in v) { if ('navigate' in v) v.navigate(ruta).catch(() => {}); return v.focus(); } }
    return self.clients.openWindow(ruta);
  }));
});
