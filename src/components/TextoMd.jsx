import { Link } from 'react-router-dom';
import { inline } from '../lib/manualMarkdown';

/** Texto con **negrita**, *cursiva*, `código` y enlaces seguros (a pantallas de la app o https). */
export default function Texto({ t }) {
  return inline(t).map((x, i) => {
    if (x.t === 'b') return <strong key={i}><Texto t={x.v} /></strong>;
    if (x.t === 'i') return <em key={i}><Texto t={x.v} /></em>;
    if (x.t === 'code') return <code key={i}>{x.v}</code>;
    if (x.t === 'link') return x.href.startsWith('/') ? <Link key={i} to={x.href}>{x.v}</Link> : <a key={i} href={x.href} target="_blank" rel="noopener noreferrer">{x.v}</a>;
    return <span key={i}>{x.v}</span>;
  });
}
