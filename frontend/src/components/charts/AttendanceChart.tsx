import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

interface TrendChartProps {
  data: { date: string; percentage: number }[];
}

export function AttendanceTrendChart({ data }: TrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e3d6" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(1)}%`, "Attendance"]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="percentage"
          stroke="#1f9d73"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#1f9d73" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface ClassBreakdownChartProps {
  data: { class_name: string; average_attendance_percentage: number }[];
}

export function ClassBreakdownChart({ data }: ClassBreakdownChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e3d6" />
        <XAxis dataKey="class_name" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Avg. Attendance"]} />
        <Bar dataKey="average_attendance_percentage" fill="#1f9d73" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}