import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';
export default function Indirectos() {
  return <>
      <PageHeader title="Indirectos" subtitle="Personal indirecto: supervisión, calidad, logística, mantenimiento." />
      <div className="page">
        <Placeholder icon="fa-user-gear" titulo="Módulo de Indirectos" texto="Módulo nuevo pensado para el personal que no produce tallos directamente (supervisores, calidad, logística, mantenimiento), con su propio seguimiento de horas y costos." />
      </div>
    </>;
}
