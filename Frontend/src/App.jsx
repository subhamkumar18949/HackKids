import { Routes, Route, Link, useLocation } from 'react-router-dom'
import ScanPage from './pages/ScanPage'
import Dashboard from './pages/Dashboard'

function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">V</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  VeriSeal
                </h1>
                <p className="text-xs text-gray-500">Secure Package Verification</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              <Link 
                to="/" 
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  location.pathname === '/' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <span className="text-lg">📱</span>
                Customer Scan
              </Link>
              <Link 
                to="/dashboard" 
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  location.pathname === '/dashboard' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                }`}
              >
                <span className="text-lg">📊</span>
                Company Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className="w-full">
        <Routes>
          <Route path="/" element={<ScanPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  )
}

export default App