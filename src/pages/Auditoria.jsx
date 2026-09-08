import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';

export default function Auditoria() {
  return (
    <>
      <PageHeader title="Auditoría" subtitle="Registro de cambios y actividad dentro del sistema." />
      <div className="page">
        <Placeholder
          icon="fa-clipboard-list"
          titulo="Módulo de Auditoría"
          texto="Aquí quedará el historial de quién subió cada Excel, quién editó o eliminó un registro, y cuándo — para trazabilidad completa. Es un módulo técnico, solo visible para el rol Administrador."
        />
      </div>
    </>
  );
}
