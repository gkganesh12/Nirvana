'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AlertsTrendChartProps {
  data: Array<{ hour: string; count: number }>;
}

export function AlertsTrendChart({ data }: AlertsTrendChartProps) {
  // Format hour labels for display
  const formattedData = data.map((item) => ({
    ...item,
    label: item.hour.slice(11, 13) + ':00', // Extract hour from ISO string
  }));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
      <h3 className="mb-4 text-sm font-medium text-stone-500">Alerts Trend (24h)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e2d9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#8b8376' }}
              tickLine={false}
              axisLine={{ stroke: '#e7e2d9' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#8b8376' }}
              tickLine={false}
              axisLine={{ stroke: '#e7e2d9' }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e7e2d9',
                borderRadius: '8px',
                boxShadow: '0 8px 20px -12px rgba(24, 25, 23, 0.35)',
                color: '#1c1917'
              }}
              labelStyle={{ color: '#6b6459', fontWeight: 600 }}
              itemStyle={{ color: '#1c1917' }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ fill: '#dc2626', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#ef4444', stroke: '#fecaca', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
