'use client';

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  height?: number;
  showValues?: boolean;
  color?: string;
  formatValue?: (value: number) => string;
}

export function BarChart({
  data,
  height = 200,
  showValues = true,
  color = 'bg-primary',
  formatValue = (v) => v.toString(),
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;

          return (
            <div
              key={index}
              className="flex flex-col items-center flex-1 h-full"
            >
              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full ${color} rounded-t transition-all duration-300`}
                  style={{ height: `${barHeight}%`, minHeight: item.value > 0 ? '4px' : '0' }}
                />
              </div>
              {showValues && (
                <div className="text-xs font-medium mt-1 text-center">
                  {formatValue(item.value)}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-0.5 text-center truncate w-full">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HorizontalBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export function HorizontalBarChart({
  data,
  showValues = true,
  formatValue = (v) => v.toString(),
}: HorizontalBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const barWidth = (item.value / maxValue) * 100;

        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              {showValues && (
                <span className="font-medium">{formatValue(item.value)}</span>
              )}
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color || 'bg-primary'} rounded-full transition-all duration-300`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
