import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';

export default function Reportes() {
  return (
    <>
      <PageHeader title="Reportes" subtitle="Informes consolidados, exportables en PDF y Excel." />
      <div className="page">
        <Placeholder
          icon="fa-chart-column"
          titulo="Módulo de Reportes"
          texto="Reportes por rango de fechas, línea, formadora y turno, con exportación a PDF/Excel, reutilizando el histórico ya guardado en Rendimientos."
        />
      </div>
    </>
  );
}
