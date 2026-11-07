import { Component, Fragment } from 'react';
import { esperaReintento } from '../../lib/presentacionVigencia';

/** Si algo falla al dibujar la presentación, NO se cierra: se recupera sola (reintenta una y otra vez) y deja una nota en Seguridad → Errores recientes. */
export default class PresentacionSegura extends Component {
  state = { roto: false, intento: 0 };
  static getDerivedStateFromError() { return { roto: true }; }
  componentDidCatch(error) {
    try { window.dispatchEvent(new CustomEvent('tm-error-datos', { detail: { texto: 'La presentación se recuperó sola tras un fallo al dibujarla.', ref: 'PRES', ruta: '/' } })); } catch { /* nada */ }
    console.error('Presentación: fallo recuperado solo', error);
    this.t = setTimeout(() => this.setState(s => ({ roto: false, intento: s.intento + 1 })), esperaReintento(this.state.intento));
  }
  componentWillUnmount() { clearTimeout(this.t); }
  render() {
    if (this.state.roto) return <div className="pres-recuperando" role="status"><i className="fa-solid fa-spinner fa-spin"></i> Recuperando la presentación…</div>;
    return <Fragment key={this.state.intento}>{this.props.children}</Fragment>;
  }
}
