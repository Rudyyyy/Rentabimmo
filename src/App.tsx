import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { InvestmentProvider } from './contexts/InvestmentContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PropertyForm from './components/PropertyForm';
import { GlobalProfitability } from './pages/GlobalProfitability';

function App() {
  return (
    <Router>
      <AuthProvider>
        <InvestmentProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/property/new"
              element={
                <ProtectedRoute>
                  <PropertyForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/property/:id"
              element={
                <ProtectedRoute>
                  <PropertyForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profitability"
              element={
                <ProtectedRoute>
                  <GlobalProfitability />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Login />} />
          </Routes>
        </InvestmentProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;