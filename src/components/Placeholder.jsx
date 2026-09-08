export default function Placeholder({
  icon,
  titulo,
  texto
}) {
  return <div className="placeholder-page">
      <i className={`fa-solid ${icon}`}></i>
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </div>;
}
