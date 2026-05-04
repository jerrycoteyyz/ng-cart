export default function SegmentSummaryTable({ summary }) {
  return (
    <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", marginBottom: "2rem" }}>
      <thead>
        <tr>
          <th>Segment</th>
          <th>Customers</th>
          <th>Positive</th>
          <th>Negative</th>
          <th>Avg Balance</th>
          <th>Critical</th>
          <th>High</th>
          <th>Priority</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {summary.map((row) => (
          <tr key={row.segment_label}>
            <td>{row.segment_label}</td>
            <td>{row.customer_count}</td>
            <td>{row.total_positive_balance.toFixed(2)}</td>
            <td>{row.total_negative_balance.toFixed(2)}</td>
            <td>{row.avg_balance.toFixed(2)}</td>
            <td>{row.critical_count}</td>
            <td>{row.high_count}</td>
            <td>{row.priority}</td>
            <td>{row.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}