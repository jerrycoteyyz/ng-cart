const severityRank = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function severityStyle(severity) {
  switch (severity) {
    case "critical":
      return { backgroundColor: "#f8d7da", color: "#842029", fontWeight: "bold" };
    case "high":
      return { backgroundColor: "#fff3cd", color: "#664d03", fontWeight: "bold" };
    case "medium":
      return { backgroundColor: "#cff4fc", color: "#055160" };
    default:
      return { backgroundColor: "#e2e3e5", color: "#41464b" };
  }
}

export default function CustomerTable({ customers }) {

    const sortedCustomers = [...customers].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (severityRank[a.severity] !== severityRank[b.severity]) {
            return severityRank[b.severity] - severityRank[a.severity];
        }
        return Math.abs(b.balance) - Math.abs(a.balance);
    });
    return (
    <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%" }}>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Segment</th>
          <th>Severity</th>
          <th>Action</th>
          <th>Balance</th>
          <th>Orders</th>
          <th>Payments</th>
        </tr>
      </thead>
      <tbody>
        {sortedCustomers.map((row) => (
          <tr key={row.customer}>
            <td>{row.customer}</td>
            <td>{row.segment_label}</td>
            <td style={severityStyle(row.severity)}>{row.severity}</td>
            <td>{row.action}</td>
            <td>{row.balance.toFixed(2)}</td>
            <td>{row.total_orders.toFixed(2)}</td>
            <td>{row.total_payments.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}