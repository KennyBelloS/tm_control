import Chart from 'react-apexcharts';
import { calcularPorcentajeMeta, clasificarEstado } from '../../lib/calculos';
const COLOR_EXCELENTE = '#166534';
const COLOR_CUMPLE = '#2F9E4F';
const COLOR_APUNTO = '#D97706';
const COLOR_BAJO = '#A91D3A';
export default function EstadoDonutChart({
  lista,
  metaHora = 470,
  height = 260
}) {
  const conteo = {
    Excelente: 0,
    Cumple: 0,
    'A punto de cumplir': 0,
    Bajo: 0
  };
  for (const p of lista) {
    const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
    const estado = clasificarEstado(pct);
    conteo[estado.label] = (conteo[estado.label] || 0) + 1;
  }
  const etiquetas = Object.keys(conteo).filter(k => conteo[k] > 0);
  const valores = etiquetas.map(k => conteo[k]);
  const colores = etiquetas.map(k => {
    if (k === 'Excelente') return COLOR_EXCELENTE;
    if (k === 'Cumple') return COLOR_CUMPLE;
    if (k === 'A punto de cumplir') return COLOR_APUNTO;
    return COLOR_BAJO;
  });
  if (valores.length === 0) {
    return <div className="empty-state"><i className="fa-solid fa-chart-pie"></i>Sin datos para graficar.</div>;
  }
  return <Chart type="donut" height={height} series={valores} options={{
    chart: {
      fontFamily: 'inherit'
    },
    labels: etiquetas,
    colors: colores,
    legend: {
      position: 'bottom',
      fontSize: '12px',
      labels: {
        colors: '#3F4744'
      }
    },
    dataLabels: {
      enabled: true,
      formatter: v => `${Math.round(v)}%`,
      style: {
        fontSize: '11px',
        fontWeight: 700
      }
    },
    stroke: {
      width: 2,
      colors: ['#fff']
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Personas',
              fontSize: '12px',
              color: '#6B7280'
            },
            value: {
              fontSize: '22px',
              fontWeight: 800,
              color: '#1C2321'
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: v => `${v} persona(s)`
      }
    }
  }} />;
}
