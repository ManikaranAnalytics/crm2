import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface DashboardChartProps {
  type: 'column' | 'line' | 'area';
  categories: string[];
  seriesData: number[];
  seriesName: string;
  colors?: string[];
}

const DashboardChart: React.FC<DashboardChartProps> = ({
  type,
  categories,
  seriesData,
  seriesName,
  colors = ['#0f766e'],
}) => {
  const options: Highcharts.Options = {
    chart: {
      type: type,
      backgroundColor: 'transparent',
      height: 220,
      style: {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      spacingTop: 10,
      spacingBottom: 5,
      spacingLeft: 0,
      spacingRight: 0,
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      categories: categories,
      gridLineWidth: 0,
      lineColor: '#e2e8f0',
      tickColor: '#e2e8f0',
      labels: {
        style: {
          color: '#64748b',
          fontSize: '11px',
          fontWeight: '500',
        },
      },
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineColor: '#f1f5f9',
      gridLineWidth: 1,
      labels: {
        style: {
          color: '#64748b',
          fontSize: '11px',
          fontWeight: '500',
        },
      },
    },
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: '#1e293b',
      borderWidth: 0,
      borderRadius: 8,
      shadow: true,
      style: {
        color: '#f8fafc',
      },
      headerFormat: '<span style="font-size: 10px; color: #94a3b8; font-weight: 600;">{point.key}</span><br/>',
      pointFormat: '<span style="color:{series.color}">●</span> <span style="font-weight: 600;">{series.name}:</span> <b>{point.y}</b>',
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      column: {
        borderRadius: 4,
        borderWidth: 0,
        groupPadding: 0.15,
        colorByPoint: false,
        colors: colors,
      },
      line: {
        lineWidth: 3,
        marker: {
          radius: 4,
          symbol: 'circle',
          fillColor: '#ffffff',
          lineWidth: 2,
          lineColor: undefined,
        },
      },
      area: {
        lineWidth: 3,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, Highcharts.color(colors[0] || '#0f766e').setOpacity(0.2).get('rgba') as any],
            [1, Highcharts.color(colors[0] || '#0f766e').setOpacity(0).get('rgba') as any],
          ],
        } as any,
        marker: {
          radius: 4,
          symbol: 'circle',
          fillColor: '#ffffff',
          lineWidth: 2,
          lineColor: undefined,
        },
      },
    },
    series: [
      {
        name: seriesName,
        type: type,
        data: seriesData,
        color: colors[0],
      } as any,
    ],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
};

export default DashboardChart;
