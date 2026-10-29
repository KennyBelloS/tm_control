import { lazy, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { useSesion } from './lib/useSesion';
import { cargadores } from './lib/paginas';

// Cada pantalla se descarga solo cuando se entra a ella (y se precarga al acercarse al menú); el inicio carga la suya en paralelo con la sesión.
const Dashboard = lazy(cargadores['/']);
const Personas = lazy(cargadores['/personas']);
const Rendimientos = lazy(cargadores['/rendimientos']);
const Reportes = lazy(cargadores['/reportes']);
const Ranking = lazy(cargadores['/ranking']);
const Lineas = lazy(cargadores['/lineas']);
const Configuracion = lazy(cargadores['/configuracion']);
const Indirectos = lazy(cargadores['/indirectos']);
const Gerencia = lazy(cargadores['/gerencia']);
const Tableros = lazy(cargadores['/tableros']);
const Clasificacion = lazy(cargadores['/clasificacion']);
const Devoluciones = lazy(cargadores['/devoluciones']);
const TableroColaborador = lazy(cargadores['/colaborador']);
const Usuarios = lazy(cargadores['/usuarios']);
const Auditoria = lazy(cargadores['/auditoria']);
const Seguridad = lazy(cargadores['/seguridad']);
const Resumenes = lazy(cargadores['/resumenes']);
const Ayuda = lazy(cargadores['/ayuda']);
if (typeof window !== 'undefined') cargadores['/']();
const TIEMPO_MINIMO_SPLASH = 600;                                              // la presentación dura lo justo, y solo la primera vez de la sesión
const yaVistoSplash = () => { try { return sessionStorage.getItem('tm_splash') === '1'; } catch { return false; } };
export default function App() {
  const [mostrarSplash, setMostrarSplash] = useState(() => !yaVistoSplash());
  const {
    cargando,
    sesion
  } = useSesion();
  useEffect(() => {
    try { sessionStorage.setItem('tm_splash', '1'); } catch { /* sin almacenamiento */ }
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
        <Route path="/colaborador" element={<ProtectedRoute modulo="colaborador"><TableroColaborador /></ProtectedRoute>} />
        <Route path="/devoluciones" element={<ProtectedRoute modulo="devoluciones"><Devoluciones /></ProtectedRoute>} />
        <Route path="/tableros" element={<ProtectedRoute modulo="tableros"><Tableros /></ProtectedRoute>} />
        <Route path="/configuracion" element={<ProtectedRoute modulo="configuracion"><Configuracion /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute modulo="usuarios"><Usuarios /></ProtectedRoute>} />
        <Route path="/auditoria" element={<ProtectedRoute modulo="auditoria"><Auditoria /></ProtectedRoute>} />
        <Route path="/seguridad" element={<ProtectedRoute modulo="seguridad"><Seguridad /></ProtectedRoute>} />
        <Route path="/resumenes" element={<ProtectedRoute modulo="resumenes"><Resumenes /></ProtectedRoute>} />
        <Route path="/ayuda" element={<ProtectedRoute modulo="ayuda"><Ayuda /></ProtectedRoute>} />
      </Route>
    </Routes>;
}
