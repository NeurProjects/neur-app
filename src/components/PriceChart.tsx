"use client";
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PriceChartProps {
  data: {
    time: string;
    value: number;
  }[];
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  // Transform data to match chart requirements
  const transformedData = data.map(point => ({
    date: point.time,
    price: point.value
  }));

  return (
    <div className="w-auto h-96 min-w-[600px] min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={transformedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 10
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date"
            label={{ 
              value: 'Date', 
              position: 'bottom',
              offset: 0
            }}
          />
          <YAxis
            label={{ 
              value: 'Price (USD)', 
              angle: -90, 
              position: 'left',
              offset: 0
            }}
          />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            name="Price"
            stroke="rgb(75, 192, 192)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;