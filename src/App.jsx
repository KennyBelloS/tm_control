import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Personas from './pages/Personas';
import Rendimientos from './pages/Rendimientos';
import Reportes from './pages/Reportes';
import Ranking from './pages/Ranking';
import Lineas from './pages/Lineas';
import Configuracion from './pages/Configuracion';
import Indirectos from './pages/Indirectos';
import Gerencia from './pages/Gerencia';
import Tableros from './pages/Tableros';
import Clasificacion from './pages/Clasificacion';
import Usuarios from './pages/Usuarios';
import Auditoria from './pages/Auditoria';
import { useSesion } from './lib/useSesion';
const TIEMPO_MINIMO_SPLASH = 1300;
export default function App() {
  const [mostrarSplash, setMostrarSplash] = useState(true);
  const {
    cargando,
    sesion
  } = useSesion();
  useEffect(() => {
    const t = setTimeout(() => setMostrarSplash(false), TIEMPO_MINIMO_SPLASH);
    return () => clearTimeout(t);
  }, []);
  if (mostrarSplash || cargando) return <SplashScreen />;
  if (!sesion) return <Login />;
  return <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/personas" element={<ProtectedRoute modulo="personas"><Personas /></ProtectedRoute>} />
        <Route path="/rendimientos" element={<ProtectedRoute modulo="rendimientos"><Rendimientos /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute modulo="reportes"><Reportes /></ProtectedRoute>} />
        <Route path="/ranking" element={<ProtectedRoute modulo="ranking"><Ranking /></ProtectedRoute>} />
        <Route path="/lineas" element={<ProtectedRoute modulo="lineas"><Lineas /></ProtectedRoute>} />
        <Route path="/indirectos" element={<ProtectedRoute modulo="indirectos"><Indirectos /></ProtectedRoute>} />
        <Route path="/gerencia" element={<ProtectedRoute modulo="gerencia"><Gerencia /></ProtectedRoute>} />
        <Route path="/clasificacion" element={<ProtectedRoute modulo="clasificacion"><Clasificacion /></ProtectedRoute>} />
        <Route path="/tableros" element={<ProtectedRoute modulo="tableros"><Tableros /></ProtectedRoute>} />
        <Route path="/configuracion" element={<ProtectedRoute modulo="configuracion"><Configuracion /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute modulo="usuarios"><Usuarios /></ProtectedRoute>} />
        <Route path="/auditoria" element={<ProtectedRoute modulo="auditoria"><Auditoria /></ProtectedRoute>} />
      </Route>
    </Routes>;
}
