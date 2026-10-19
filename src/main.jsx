import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import '@fontsource-variable/inter';                      // tipografía propia (se sirve desde la app)
import '@fortawesome/fontawesome-free/css/all.min.css';   // íconos servidos desde la propia app (sin depender de un sitio externo)
import './index.css';
import './styles/sistema-diseno.css';          // tokens y componentes refinados
import './styles/navegacion-y-uso.css';
import './styles/devoluciones.css';          // módulo de devoluciones
import './styles/colaborador.css';           // tablero integrado del colaborador
import './styles/flor-meta.css';             // la flor de la meta
import './styles/presentacion-festiva.css';  // Presentar festivo, hitos
import './styles/interactividad.css';        // avisos, tooltips de gráficos, filas marcables
import './styles/menu-adaptable.css';          // menú lateral: todos los módulos a la vista con cualquier zoom
import './styles/encabezado.css';            // encabezado en una fila + índice lateral        // navegación, tablas, atajos, indicador en vivo (usa los mismos colores)
import './styles/tema-oscuro.generated.css';   // equivalentes oscuros de los colores fijos (generado)
import './styles/tema-oscuro.css';             // tokens y ajustes del tema oscuro
import './styles/fiestas.generated.css';     // paletas de las festividades (generado)
import './styles/efectos.css';               // capa ambiental, 3D, saludo, panel y adornos festivos
import ErrorBoundary from './components/ErrorBoundary';
import { aplicarAjustesIniciales } from './lib/ajustesUI';
import { aplicarAjustesEfectos } from './lib/efectos';
aplicarAjustesIniciales();   // menú y densidad recordados, antes de dibujar (evita el parpadeo)
aplicarAjustesEfectos();     // efectos y festividad recordados (también antes de dibujar)
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>);
