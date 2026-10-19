import { Component } from 'react';

/**
 * Barrera de errores: si una pantalla falla al dibujarse, en vez de dejar TODA la página en blanco se muestra un aviso
 * con opciones para continuar. No muestra detalles técnicos al usuario (solo en desarrollo).
 */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    // El detalle queda en la consola del navegador para quien dé soporte; nunca se muestra en pantalla.
    console.error('Error en la pantalla:', error, info?.componentStack?.split('\n').slice(0, 6).join('\n'));
  }
  componentDidUpdate(anterior) {
    // Al cambiar de pantalla se vuelve a intentar sola.
    if (this.state.error && anterior.claveReinicio !== this.props.claveReinicio) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-pantalla" role="alert">
        <div className="error-pantalla-icono"><i className="fa-solid fa-triangle-exclamation"></i></div>
        <h2>Algo salió mal en esta pantalla</h2>
        <p>Tus datos están a salvo. Puedes intentarlo de nuevo; si sigue pasando, avisa al administrador.</p>
        <div className="error-pantalla-botones">
          <button className="btn-primary" onClick={() => this.setState({ error: null })}><i className="fa-solid fa-rotate-right"></i> Reintentar</button>
          <button className="btn-secondary" onClick={() => window.location.assign('/')}><i className="fa-solid fa-house"></i> Ir al inicio</button>
        </div>
        {import.meta.env.DEV && <details><summary>Detalle (solo en desarrollo)</summary><pre>{String(this.state.error?.stack || this.state.error)}</pre></details>}
      </div>
    );
  }
}
