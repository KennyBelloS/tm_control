import logo from '../assets/logo-icon.png';

export default function SplashScreen({ mensaje }) {
  return (
    <div className="splash">
      <div className="splash-logo-wrap">
        <img src={logo} alt="Falcon Farms · Torremolinos" className="splash-logo" />
      </div>
      <h1 className="splash-title">TORREMOLINOS</h1>
      <p className="splash-subtitle">TMCONTROL</p>
      <div className="splash-spinner"></div>
      {mensaje && <p className="splash-message">{mensaje}</p>}
    </div>
  );
}
