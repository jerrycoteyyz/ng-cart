export async function fetchSegmentSummary(payload) {
  const response = await fetch("http://127.0.0.1:8000/api/segment-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch segment summary");
  }

  return response.json();
}

export async function fetchCustomerSegments(payload) {
  const response = await fetch("http://127.0.0.1:8000/api/customer-segments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer segments");
  }

  return response.json();
}

export async function simulateWeekDb() {
  const response = await fetch("http://127.0.0.1:8000/api/simulate-week-db", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to simulate next week of orders and payments");
  }

  return response.json();
}