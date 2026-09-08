import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';

export default function Usuarios() {
  return (
    <>
      <PageHeader title="Usuarios" subtitle="Gestión de cuentas, roles y permisos de acceso." />
      <div className="page">
        <Placeholder
          icon="fa-user-shield"
          titulo="Módulo de Usuarios"
          texto="Aquí se administrarán las cuentas reales del sistema: crear usuarios, asignarles rol (Administrador, Ingeniero, Supervisor, Formador) y activar/desactivar accesos, conectado a Supabase Auth. Por ahora el rol se elige en la pantalla de inicio de sesión, a modo de vista previa."
        />
      </div>
    </>
  );
}
