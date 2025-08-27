// src/utils/chartConfig.ts - Chart.js Configuration with Filler Plugin
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  TimeSeriesScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register all Chart.js components including Filler
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler, // This fixes the "fill option without Filler plugin" error
  TimeScale,
  TimeSeriesScale
);

// Default chart options with proper fill configuration
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: false,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false,
  },
};

// Equity curve specific options with fill
export const equityCurveOptions = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    filler: {
      propagate: false,
    },
  },
  elements: {
    line: {
      tension: 0.1,
      fill: {
        target: 'origin',
        above: 'rgba(34, 197, 94, 0.1)',   // Green fill above zero
        below: 'rgba(239, 68, 68, 0.1)',    // Red fill below zero
      },
    },
    point: {
      radius: 2,
      hoverRadius: 4,
    },
  },
};

// Time analysis chart options
export const timeAnalysisOptions = {
  ...defaultChartOptions,
  scales: {
    ...defaultChartOptions.scales,
    x: {
      ...defaultChartOptions.scales.x,
      title: {
        display: true,
        text: 'Time of Day',
      },
    },
    y: {
      ...defaultChartOptions.scales.y,
      title: {
        display: true,
        text: 'P&L ($)',
      },
    },
  },
};

// P&L distribution chart options
export const pnlDistributionOptions = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    tooltip: {
      callbacks: {
        label: function(context: any) {
          return `P&L: $${context.parsed.y.toFixed(2)}`;
        },
      },
    },
  },
  elements: {
    bar: {
      backgroundColor: function(context: any) {
        const value = context.parsed.y;
        return value >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      },
    },
  },
};

// Export Chart.js instance for direct use
export { ChartJS };

// Helper function to create gradient fills
export const createGradientFill = (ctx: CanvasRenderingContext2D, chartArea: any, colorStops: Array<{offset: number, color: string}>) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  colorStops.forEach(stop => {
    gradient.addColorStop(stop.offset, stop.color);
  });
  return gradient;
};

// Common color schemes
export const colorSchemes = {
  profit: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: 'rgba(34, 197, 94, 1)',
    fill: 'rgba(34, 197, 94, 0.2)',
  },
  loss: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 1)',
    fill: 'rgba(239, 68, 68, 0.2)',
  },
  neutral: {
    background: 'rgba(156, 163, 175, 0.1)',
    border: 'rgba(156, 163, 175, 1)',
    fill: 'rgba(156, 163, 175, 0.2)',
  },
};

export default ChartJS;