import { Navigate } from 'react-router-dom';
import { puedeVer } from '../lib/roles';
import { useSesion } from '../lib/useSesion';

export default function ProtectedRoute({ modulo, children }) {
  const { rol } = useSesion();
  if (!puedeVer(rol, modulo)) return <Navigate to="/" replace />;
  return children;
}
