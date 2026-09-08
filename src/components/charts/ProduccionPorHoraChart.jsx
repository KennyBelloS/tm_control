import Chart from 'react-apexcharts';

/** Barras: total de tallos de todo el personal, por bloque de hora (Turno Actual). */
export default function ProduccionPorHoraChart({ bloques = [], height = 300 }) {
  if (bloques.length === 0) {
    return <div className="empty-state"><i className="fa-solid fa-chart-column"></i>Sin bloques por hora para graficar todavía.</div>;
  }

  const categorias = bloques.map(b => b.bloque);
  const tallos = bloques.map(b => b.totalTallos);
  const max = Math.max(...tallos, 1);

  return (
    <Chart
      type="bar"
      height={height}
      series={[{ name: 'Tallos', data: tallos }]}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'inherit' },
        colors: [({ value }) => (value >= max * 0.75 ? '#166534' : value >= max * 0.4 ? '#2F9E4F' : '#D97706')],
        plotOptions: { bar: { borderRadius: 6, columnWidth: categorias.length <= 4 ? '35%' : '55%', distributed: true } },
        legend: { show: false },
        dataLabels: { enabled: false },
        xaxis: {
          categories: categorias,
          labels: { rotate: -30, style: { fontSize: '10.5px', colors: '#6B7280' } },
          axisBorder: { color: '#E7E5DD' },
          axisTicks: { color: '#E7E5DD' },
        },
        yaxis: {
          min: 0, forceNiceScale: true,
          labels: { formatter: (v) => Math.round(v).toLocaleString(), style: { fontSize: '11px', colors: '#6B7280' } },
        },
        grid: { borderColor: '#F0EFE9', strokeDashArray: 3 },
        tooltip: {
          custom: ({ dataPointIndex }) => {
            const b = bloques[dataPointIndex];
            return `<div style="padding:10px 14px;font-size:12px;">
              <div style="font-weight:700;margin-bottom:4px;">${b.bloque}</div>
              <div>Tallos: <strong>${b.totalTallos.toLocaleString()}</strong></div>
              <div>Personas: <strong>${b.personas}</strong></div>
            </div>`;
          },
        },
      }}
    />
  );
}
