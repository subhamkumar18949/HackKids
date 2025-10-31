import { Routes, Route, Link } from 'react-router-dom'
import ScanPage from './pages/ScanPage'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-6">
          <Link to="/" className="text-blue-600 font-semibold hover:underline">
            Scan Page (Customer)
          </Link>
          <Link to="/dashboard" className="text-blue-600 font-semibold hover:underline">
            Dashboard (Company)
          </Link>
        </div>
      </nav>

      {/* Page Content */}
      <div className="max-w-4xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<ScanPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  )
}

export default App