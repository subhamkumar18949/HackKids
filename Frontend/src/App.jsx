import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthForm from './pages/AuthForm'
import SenderDashboard from './pages/SenderDashboard'
import ReceiverScanner from './pages/ReceiverScanner'
import DeliveryDashboard from './pages/DeliveryDashboard'
import ScanPage from './pages/ScanPage'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Auth routes */}
        <Route path="/auth/:role" element={<AuthForm />} />
        
        {/* Role-specific dashboard placeholders */}
        <Route path="/sender/dashboard" element={<SenderDashboard />} />
        
        <Route path="/receiver/scanner" element={<ReceiverScanner />} />
        
        <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
      </Routes>
    </div>
  )
}

export default App