'use client';

import React from 'react';

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface PriceChartProps {
  data: {
    time: string;
    value: number;
  }[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  // Transform data for Chart.js format
  const chartLabels = data.map((point) => point.time); // X-axis (Date/Time)
  const chartDataValues = data.map((point) => point.value); // Y-axis (Price)

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Price (USD)',
        data: chartDataValues,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        pointRadius: 0, // Removes point markers
        pointHoverRadius: 6, // Highlight point on hover
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
      title: {
        display: true,
        text: 'Price History Chart',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Price (USD)',
        },
      },
    },
  };

  return (
    <div className="h-96 min-h-[400px] w-auto min-w-[600px]">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default PriceChart;
