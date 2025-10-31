import React, { useState, useEffect } from "react";

function Dashboard() {
  const [seals, setSeals] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data on mount and every 10 seconds
    const fetchData = () => {
      fetch("http://127.0.0.1:8000/dashboard-data")
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch dashboard data");
          }
          return res.json();
        })
        .then((data) => {
          // Ensure data is always an array
          setSeals(Array.isArray(data) ? data : []);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
          setSeals([]); // Fallback to empty array on error
        });
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800">Company Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Live status of all seals, auto-refreshing every 10 seconds.
      </p>
      {error && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
      <div className="mt-6">
        <h3 className="text-lg font-semibold">Live Seal Status</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th>Seal ID</th>
              <th>Status</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(seals) && seals.length > 0 ? (
              seals.map((seal) => (
                <tr key={seal.seal_id}>
                  <td>{seal.seal_id}</td>
                  <td>
                    {seal.status === "SAFE" ? (
                      <span className="text-green-600 font-semibold">SAFE</span>
                    ) : (
                      <span className="text-red-600 font-semibold">VIOLATION</span>
                    )}
                  </td>
                  <td>
                    {seal.last_updated
                      ? new Date(seal.last_updated).toLocaleTimeString()
                      : "No data"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="text-center text-gray-500">
                  No seal data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
