export default function SummaryCards(props) {
  console.log("SummaryCards props:", props);
  const summary = Array.isArray(props.summary) ? props.summary : [];
  const customers = Array.isArray(props.customers) ? props.customers : [];

  const totalPositive = summary.reduce(
    (sum, row) => sum + row.total_positive_balance,
    0
  );

  const totalNegative = summary.reduce(
    (sum, row) => sum + Math.abs(row.total_negative_balance),
    0
  );

  const totalCustomers = summary.reduce(
    (sum, row) => sum + row.customer_count,
    0
  );

  const criticalCustomers = customers.filter(
    (row) => row.severity === "critical"
  ).length;

  const topPositiveSegment = [...summary].sort(
    (a, b) => b.total_positive_balance - a.total_positive_balance
  )[0];

  const topNegativeSegment = [...summary].sort(
    (a, b) => Math.abs(b.total_negative_balance) - Math.abs(a.total_negative_balance)
  )[0];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <Card title="Total Customers" value={totalCustomers} />
      <Card title="Total Positive Exposure" value={`$${totalPositive.toFixed(2)}`} />
      <Card title="Total Negative Exposure" value={`$${totalNegative.toFixed(2)}`} />
      <Card title="Critical Customers" value={criticalCustomers} />
      <Card
        title="Top Positive Exposure Segment"
        value={topPositiveSegment ? topPositiveSegment.segment_label : "n/a"}
      />
      <Card
        title="Top Negative Exposure Segment"
        value={topNegativeSegment ? topNegativeSegment.segment_label : "n/a"}
      />
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "1rem",
        minWidth: "220px",
      }}
    >
      <div style={{ fontSize: "0.9rem", color: "#555" }}>{title}</div>
      <div style={{ fontSize: "1.2rem", fontWeight: "bold", marginTop: "0.35rem" }}>
        {value}
      </div>
    </div>
  );
}