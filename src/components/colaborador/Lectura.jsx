/** "Lo que dicen los datos": frases automáticas que resumen a la persona. El color indica si es bueno, a vigilar o malo. */
export default function Lectura({ lecturas }) {
  return (
    <section className="colab-lectura">
      <h4><i className="fa-solid fa-wand-magic-sparkles"></i> Lo que dicen los datos</h4>
      <ul>{lecturas.map((l, i) => <li key={i} className={`colab-lec-${l.tono}`} style={{ animationDelay: `${i * 70}ms` }}><i className={`fa-solid ${l.icono}`}></i><span>{l.texto}</span></li>)}</ul>
    </section>
  );
}
