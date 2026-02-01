'use client';

import { BarChart } from '@/components/charts';

interface AnalyticsChartsProps {
  revenueData: Array<{ month: string; revenue: number }>;
  attendanceData: Array<{ day: string; attendance: number }>;
  chartType: 'revenue' | 'attendance';
}

export function AnalyticsCharts({ revenueData, attendanceData, chartType }: AnalyticsChartsProps) {
  if (chartType === 'revenue') {
    return (
      <BarChart
        data={revenueData.map(d => ({
          label: d.month,
          value: d.revenue,
        }))}
        height={200}
        formatValue={(v) => `${v}€`}
        color="bg-primary"
      />
    );
  }

  return (
    <BarChart
      data={attendanceData.map(d => ({
        label: d.day,
        value: d.attendance,
      }))}
      height={200}
      color="bg-green-500"
    />
  );
}
