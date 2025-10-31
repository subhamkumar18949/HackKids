import React, { useState, useEffect } from 'react';

// Add BLE API in production, for hackathon mock status:
function ScanPage() {
  const [scanResult, setScanResult] = useState("");
  const [apiStatus, setApiStatus] = useState("Connecting to API...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then((data) => setApiStatus(`✅ ${data.message}`))
      .catch(() =>
        setApiStatus("❌ Error: Could not connect to API. Is it running?")
      );
  }, []);

  const handleScan = async () => {
    // Web Bluetooth integration goes here for real device
    // For demo, simulate finding a seal
    setScanResult("Connected to VeriSeal!\nStatus: SAFE\nLast event: No violation");
    // On violation, set: setScanResult("Status: VIOLATION\nLast event: Tamper at 7:17 PM");
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800">Customer Scan Page</h1>
      <p className="mt-4 text-gray-600">Scan your package to verify safety and integrity.</p>
      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold">Boilerplate Test</h3>
        <p className="mt-2">{apiStatus}</p>
      </div>
      <button
        onClick={handleScan}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700"
      >
        Scan for VeriSeal
      </button>
      {scanResult && (
        <pre className="mt-4 p-3 bg-gray-100 rounded font-mono text-sm">
          {scanResult}
        </pre>
      )}
    </div>
  );
}

export default ScanPage;
