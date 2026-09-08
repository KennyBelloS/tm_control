import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { getConfig, getAlmacenamientoUsadoMB, getHistoricoCompleto, getActualCompleto, getPersonasCompleto, getMetasDiariasCompleto } from '../lib/db';
export default function Auditoria() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [usoMB, setUsoMB] = useState(0);
  const [limiteMB, setLimiteMB] = useState(500);
  const [cfg, setCfg] = useState(null);
  const [generandoRespaldo, setGenerandoRespaldo] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const configuracion = await getConfig();
        const usado = await getAlmacenamientoUsadoMB();
        if (!activo) return;
        setCfg(configuracion);
        setLimiteMB(configuracion.almacenamientoLimiteMB);
        setUsoMB(usado);
      } catch (e) {
        if (activo) setError(e.message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);
  const porcentaje = limiteMB > 0 ? Math.round(usoMB / limiteMB * 1000) / 10 : 0;
  const critico = porcentaje >= 90;
  const advertencia = porcentaje >= 80 && porcentaje < 90;
  async function generarRespaldo() {
    setGenerandoRespaldo(true);
    setMensaje(null);
    try {
      const {
        exportarRespaldoCompletoExcel
      } = await import('../lib/exportExcelProfesional');
      const [historico, actual, personas, metasDiarias] = await Promise.all([getHistoricoCompleto(), getActualCompleto(), getPersonasCompleto(), getMetasDiariasCompleto()]);
      await exportarRespaldoCompletoExcel({
        historico,
        actual,
        personas,
        metasDiarias,
        cfg
      });
      setMensaje({
        tipo: 'ok',
        texto: `Respaldo generado: ${historico.length} filas de Histórico, ${actual.length} de Turno Actual, ${personas.length} personas, ${metasDiarias.length} metas diarias — todo en 6 hojas del mismo Excel.`
      });
    } catch (e) {
      setMensaje({
        tipo: 'err',
        texto: `Error generando el respaldo: ${e.message}`
      });
    } finally {
      setGenerandoRespaldo(false);
    }
  }
  return <>
      <PageHeader title="Auditoría" subtitle="Almacenamiento real de la base de datos y respaldo histórico." />
      <div className="page">
        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`}><i className="fa-solid fa-circle-info"></i> {mensaje.texto}</div>}

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-database" style={{
                color: 'var(--primary)',
                marginRight: 8
              }}></i>Almacenamiento en Supabase</h2>
              <p>Espacio real usado en tu base de datos, contra el límite de tu plan.</p>
            </div>
          </div>

          {cargando ? <p style={{
          color: 'var(--gray)'
        }}>Calculando...</p> : <>
              <div className="almacenamiento-barra-track">
                <div className={`almacenamiento-barra-fill ${critico ? 'critico' : advertencia ? 'advertencia' : ''}`} style={{
              width: `${Math.min(porcentaje, 100)}%`
            }}></div>
              </div>
              <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12.5,
            color: 'var(--gray)'
          }}>
                <span><strong style={{
                color: 'var(--text)'
              }}>{usoMB.toLocaleString()} MB</strong> usados</span>
                <span>{porcentaje}% de {limiteMB.toLocaleString()} MB</span>
              </div>

              {critico && <div className="alert err">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Almacenamiento crítico: llevas {porcentaje}% usado. Considera hacer un respaldo y limpiar datos antiguos, o subir de plan en Supabase.
                </div>}
              {advertencia && <div className="alert warn">
                  <i className="fa-solid fa-circle-info"></i>
                  Vas en {porcentaje}% de tu almacenamiento — te acercas al límite.
                </div>}

              <p style={{
            fontSize: 11,
            color: 'var(--gray)'
          }}>
                El límite ({limiteMB} MB) se define en Configuración → campo "almacenamiento_limite_mb" en la base de datos (500 MB es el plan gratuito de Supabase).
              </p>
            </>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-box-archive" style={{
                color: 'var(--accent)',
                marginRight: 8
              }}></i>Respaldo completo de la base de datos</h2>
              <p>Descarga TODOS los datos guardados (Histórico, Turno Actual, Personas, Metas Diarias y Configuración) en un Excel profesional, organizado en varias hojas — útil antes de limpiar espacio o como copia de seguridad.</p>
            </div>
          </div>
          <div>
            <button className="btn-primary" disabled={generandoRespaldo} onClick={generarRespaldo}>
              <i className="fa-solid fa-file-excel"></i> {generandoRespaldo ? 'Generando respaldo...' : 'Generar respaldo completo (Excel)'}
            </button>
          </div>
        </section>
      </div>
    </>;
}
