import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface DashboardChartProps {
  type: 'column' | 'line' | 'area';
  categories: string[];
  seriesData: number[];
  seriesName: string;
  colors?: string[];
}

const CHART_PALETTES = [
  ['#0d9488', '#14b8a6', '#2dd4bf', '#0f766e', '#115e59'],
  ['#6366f1', '#818cf8', '#4f46e5', '#4338ca', '#3730a3'],
  ['#10b981', '#34d399', '#059669', '#047857', '#065f46'],
  ['#0ea5e9', '#38bdf8', '#0284c7', '#0369a1', '#075985'],
  ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#5b21b6'],
  ['#ec4899', '#f472b6', '#db2777', '#be185d', '#9d174d'],
];

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function columnGradient(color: string): Highcharts.GradientColorObject {
  return {
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, hexToRgba(color, 0.95)],
      [1, hexToRgba(color, 0.55)],
    ],
  };
}

function areaGradient(color: string): Highcharts.GradientColorObject {
  return {
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, hexToRgba(color, 0.35)],
      [1, hexToRgba(color, 0.02)],
    ],
  };
}

const DashboardChart: React.FC<DashboardChartProps> = ({
  type,
  categories,
  seriesData,
  seriesName,
  colors = ['#0f766e'],
}) => {
  const palette = useMemo(() => {
    const match = CHART_PALETTES.find((p) => p[0] === colors[0]);
    return match ?? CHART_PALETTES[0];
  }, [colors]);

  const seriesPoints = useMemo(
    () =>
      seriesData.map((value, index) => ({
        y: value,
        color: type === 'column' ? columnGradient(palette[index % palette.length]) : undefined,
      })),
    [seriesData, palette, type],
  );

  const primaryColor = colors[0] || palette[0];
  const rotateLabels = categories.length > 5;

  const options: Highcharts.Options = {
    chart: {
      type,
      backgroundColor: 'transparent',
      height: 280,
      style: {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      spacingTop: 12,
      spacingBottom: rotateLabels ? 8 : 4,
      spacingLeft: 4,
      spacingRight: 8,
      animation: {
        duration: 900,
      },
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      categories,
      gridLineWidth: 0,
      lineColor: '#e2e8f0',
      tickColor: '#e2e8f0',
      tickLength: 6,
      labels: {
        rotation: rotateLabels ? -35 : 0,
        autoRotation: [-35, -25, 0],
        style: {
          color: '#64748b',
          fontSize: '11px',
          fontWeight: '600',
        },
      },
    },
    yAxis: {
      title: {
        text: undefined,
      },
      gridLineColor: '#eef2f7',
      gridLineDashStyle: 'Dash',
      gridLineWidth: 1,
      labels: {
        style: {
          color: '#94a3b8',
          fontSize: '11px',
          fontWeight: '500',
        },
      },
    },
    tooltip: {
      useHTML: true,
      backgroundColor: 'rgba(15, 23, 42, 0.96)',
      borderWidth: 0,
      borderRadius: 10,
      shadow: {
        color: 'rgba(15, 23, 42, 0.25)',
        offsetX: 0,
        offsetY: 4,
        width: 12,
      },
      padding: 12,
      style: {
        color: '#f8fafc',
      },
      headerFormat:
        '<div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;">{point.key}</div>',
      pointFormat:
        '<div style="display:flex;align-items:center;gap:8px;font-size:13px;"><span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:{series.color};"></span><span style="color:#e2e8f0;">{series.name}</span><strong style="margin-left:auto;color:#fff;font-size:15px;">{point.y}</strong></div>',
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      series: {
        animation: {
          duration: 900,
        },
        states: {
          hover: {
            brightness: 0.08,
            halo: {
              size: 6,
              opacity: 0.2,
            },
          },
        },
      },
      column: {
        borderRadius: 8,
        borderWidth: 0,
        groupPadding: 0.12,
        pointPadding: 0.08,
        maxPointWidth: 48,
        dataLabels: {
          enabled: true,
          crop: false,
          overflow: 'allow',
          style: {
            color: '#475569',
            fontSize: '11px',
            fontWeight: '700',
            textOutline: 'none',
          },
          y: -4,
        },
      },
      line: {
        lineWidth: 3,
        marker: {
          radius: 5,
          symbol: 'circle',
          fillColor: '#ffffff',
          lineWidth: 2,
          lineColor: primaryColor,
        },
      },
      area: {
        lineWidth: 3,
        lineColor: primaryColor,
        fillColor: areaGradient(primaryColor),
        marker: {
          radius: 4,
          symbol: 'circle',
          fillColor: '#ffffff',
          lineWidth: 2,
          lineColor: primaryColor,
        },
      },
    },
    series: [
      {
        name: seriesName,
        type,
        data: type === 'column' ? seriesPoints : seriesData,
        color: primaryColor,
        lineColor: primaryColor,
      } as Highcharts.SeriesOptionsType,
    ],
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-slate-50/80 to-white px-1 pb-1 pt-2">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-40"
        style={{
          background: `radial-gradient(circle at top, ${hexToRgba(primaryColor, 0.18)}, transparent 70%)`,
        }}
      />
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default DashboardChart;
