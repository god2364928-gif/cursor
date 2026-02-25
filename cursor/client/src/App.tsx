import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import RetargetingPage from './pages/RetargetingPage'
import SalesPage from './pages/SalesPage'
import SalesTrackingPage from './pages/SalesTrackingPage'
import SettingsPage from './pages/SettingsPage'
import AccountOptimizationPage from './pages/AccountOptimizationPage'
import AccountOptimizationPage2 from './pages/AccountOptimizationPage2'
import KeywordAnalysisPage from './pages/KeywordAnalysisPage'
import AccountingPage from './pages/AccountingPage'
import InvoicePage from './pages/InvoicePage'
import InvoiceCreatePage from './pages/InvoiceCreatePage'
import QuotePage from './pages/QuotePage'
import QuoteCreatePage from './pages/QuoteCreatePage'
import HotpepperPage from './pages/HotpepperPage'
import InquiryLeadsPage from './pages/InquiryLeadsPage'
import HashtagAnalysisPage from './pages/HashtagAnalysisPage'
import HashtagBulkPage from './pages/HashtagBulkPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  return token ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="retargeting" element={<RetargetingPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales-tracking" element={<SalesTrackingPage />} />
          <Route path="invoices" element={<InvoicePage />} />
          <Route path="invoices/create" element={<InvoiceCreatePage />} />
          <Route path="quotes" element={<QuotePage />} />
          <Route path="quotes/create" element={<QuoteCreatePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/account-optimization" element={<AccountOptimizationPage />} />
          <Route path="settings/account-optimization-2" element={<AccountOptimizationPage2 />} />
          <Route path="settings/keyword-analysis" element={<KeywordAnalysisPage />} />
          <Route path="settings/hashtag-analysis" element={<HashtagAnalysisPage />} />
          <Route path="settings/hashtag-bulk" element={<HashtagBulkPage />} />
          <Route path="accounting" element={<AccountingPage />} />
          <Route path="hotpepper" element={<HotpepperPage />} />
          <Route path="inquiry-leads" element={<InquiryLeadsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App


