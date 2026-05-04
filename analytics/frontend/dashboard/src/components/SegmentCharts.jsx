import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function SegmentCharts({ summary = [] }) {
  const countData = summary.map((row) => ({
    segment: row.segment_label,
    customers: row.customer_count,
  }));

  const exposureData = summary.map((row) => ({
    segment: row.segment_label,
    positive: row.total_positive_balance,
    negative: Math.abs(row.total_negative_balance),
  }));

  return (
    <div style={{ display: "grid", gap: "2rem", marginBottom: "2rem" }}>
      <div>
        <h3>Customers by Segment</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={countData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="segment"
                angle={-20}
                textAnchor="end"
                height={90}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3>Exposure by Segment</h3>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={exposureData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="segment"
                angle={-20}
                textAnchor="end"
                height={90}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="positive" name="Positive Exposure" />
              <Bar dataKey="negative" name="Negative Exposure" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}