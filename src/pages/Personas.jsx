import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';
export default function Personas() {
  return <>
      <PageHeader title="Personas" subtitle="Gestión de colaboradores, formadoras y códigos de empleado." />
      <div className="page">
        <Placeholder icon="fa-users" titulo="Módulo de Personas" texto="Aquí se administrarán los colaboradores (alta, edición, código, formadora asignada, línea). Se conectará automáticamente con los datos que ya suben los Excel de Rendimientos, tomando como base las hojas 'Base' y 'NOMBRES' de tu archivo maestro." />
      </div>
    </>;
}
