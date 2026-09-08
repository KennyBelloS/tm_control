import { Navigate } from 'react-router-dom';
import { puedeVer } from '../lib/roles';
import { useSesion } from '../lib/useSesion';
export default function ProtectedRoute({
  modulo,
  children
}) {
  const {
    cargando,
    sesion
  } = useSesion();
  if (cargando) return null;
  if (!sesion || !puedeVer(sesion.rol, modulo)) return <Navigate to="/" replace />;
  return children;
}
