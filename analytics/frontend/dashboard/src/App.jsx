import { useEffect, useMemo, useState } from "react";
import { fetchSegmentSummary, fetchCustomerSegments } from "./api";
import SummaryCards from "./components/SummaryCards";
import SegmentSummaryTable from "./components/SegmentSummaryTable";
import CustomerTable from "./components/CustomerTable";
import SegmentCharts from "./components/SegmentCharts";
import samplePayload from "./sample_payload_large.json";

export default function App() {
  const [summary, setSummary] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, customerData] = await Promise.all([
          fetchSegmentSummary(samplePayload),
          fetchCustomerSegments(samplePayload),
        ]);

        setSummary(summaryData.segments);
        setCustomers(customerData.customers);
      } catch (err) {
        setError(err.message);
      }
    }

    loadData();
  }, []);

  const segmentOptions = useMemo(() => {
    return ["all", ...summary.map((row) => row.segment_label)];
  }, [summary]);

  const filteredCustomers = useMemo(() => {
    if (selectedSegment === "all") {
      return customers;
    }
    return customers.filter((row) => row.segment_label === selectedSegment);
  }, [customers, selectedSegment]);

  if (error) {
    return <div style={{ padding: "1rem", color: "red" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Customer Reconciliation Dashboard</h1>

      <SummaryCards summary={summary} customers={customers} />

      <h2>Segment Summary</h2>
      <SegmentSummaryTable summary={summary} />

      <h2>Charts</h2>
      <SegmentCharts summary={summary} />

      <h2>Customer Details</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="segmentFilter" style={{ marginRight: "0.5rem" }}>
          Filter by segment:
        </label>
        <select
          id="segmentFilter"
          value={selectedSegment}
          onChange={(e) => setSelectedSegment(e.target.value)}
        >
          {segmentOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All segments" : option}
            </option>
          ))}
        </select>
      </div>

      <CustomerTable customers={filteredCustomers} />
    </div>
  );
}