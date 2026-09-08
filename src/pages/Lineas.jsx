import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';
export default function Lineas() {
  return <>
      <PageHeader title="Líneas" subtitle="Estado y producción por línea/mesa de trabajo." />
      <div className="page">
        <Placeholder icon="fa-warehouse" titulo="Módulo de Líneas" texto="Configuración de líneas y mesas, con el consolidado de tallos y cumplimiento por línea tomado directamente de los registros por hora." />
      </div>
    </>;
}
