import { useEfectos, abrirPanelEfectos } from '../../lib/efectos';

/** La etiqueta festiva de la barra superior ("🎃 ¡Feliz Halloween!"): al tocarla se abre el panel de efectos. */
export default function FiestaChip() {
  const { fiesta } = useEfectos();
  if (!fiesta) return null;
  return <button className="fiesta-chip" onClick={abrirPanelEfectos} title="Efectos y festividades"><span>{fiesta.emoji}</span><b>{fiesta.saludo}</b></button>;
}
