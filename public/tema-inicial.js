/* Se ejecuta ANTES de dibujar la página para que no haya un destello de tema equivocado. */
(function () {
  try {
    var t = localStorage.getItem('tm_tema');
    if (t !== 'claro' && t !== 'oscuro') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
    document.documentElement.dataset.tema = t;
  } catch (e) { document.documentElement.dataset.tema = 'claro'; }
})();
