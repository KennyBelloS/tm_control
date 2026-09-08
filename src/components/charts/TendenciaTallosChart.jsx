import Chart from 'react-apexcharts';

/** Área de tendencia: total de tallos por día (Histórico), últimos N días. */
export default function TendenciaTallosChart({ categorias = [], valores = [], height = 300 }) {
  if (categorias.length === 0) {
    return <div className="empty-state"><i className="fa-solid fa-chart-area"></i>Sin histórico suficiente para graficar la tendencia.</div>;
  }

  return (
    <Chart
      type="area"
      height={height}
      series={[{ name: 'Tallos', data: valores }]}
      options={{
        chart: { toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
        colors: ['#166534'],
        fill: {
          type: 'gradient',
          gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.04, stops: [0, 90, 100] },
        },
        stroke: { curve: 'smooth', width: 3 },
        dataLabels: { enabled: false },
        xaxis: {
          categories: categorias,
          labels: { style: { fontSize: '11px', colors: '#6B7280' } },
          axisBorder: { color: '#E7E5DD' },
          axisTicks: { color: '#E7E5DD' },
        },
        yaxis: {
          min: 0, forceNiceScale: true,
          labels: { formatter: (v) => Math.round(v).toLocaleString(), style: { fontSize: '11px', colors: '#6B7280' } },
        },
        grid: { borderColor: '#F0EFE9', strokeDashArray: 3 },
        tooltip: {
          y: { formatter: (v) => `${v.toLocaleString()} tallos` },
        },
      }}
    />
  );
}
