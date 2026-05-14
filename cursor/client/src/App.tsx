import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useAdminAuthStore } from './store/adminAuthStore'
import { hasAccess } from './lib/appAccess'
import { canAccessCrmPage, crmPageKeyFromPath } from './lib/pageAccess'
import Layout from './components/Layout'
import ErpLayout from './components/ErpLayout'
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
import InvoicePage from './pages/InvoicePage'
import InvoiceCreatePage from './pages/InvoiceCreatePage'
import QuotePage from './pages/QuotePage'
import QuoteCreatePage from './pages/QuoteCreatePage'
import HotpepperPage from './pages/HotpepperPage'
import InquiryLeadsPage from './pages/InquiryLeadsPage'
import HashtagAnalysisPage from './pages/HashtagAnalysisPage'
import HashtagBulkPage from './pages/HashtagBulkPage'
import FlagCheckPage from './pages/FlagCheckPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'
import MyPage from './pages/Erp/MyPage'
import OrgPage from './pages/Erp/OrgPage'
import LeavePage from './pages/Erp/LeavePage'
import LeaveSchedulePage from './pages/Erp/LeaveSchedulePage'
import SnackRequestPage from './pages/Erp/SnackRequestPage'
import HealthCheckupPage from './pages/Erp/HealthCheckupPage'
import EducationPage from './pages/Erp/EducationPage'
import EducationApprovalsPage from './pages/Erp/admin/EducationApprovalsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token)
  return token ? <>{children}</> : <Navigate to="/login" />
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAdminAuthStore((state) => state.token)
  return token ? <>{children}</> : <Navigate to="/admin/login" />
}

function CrmGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  if (!hasAccess(user, 'crm')) {
    return <Navigate to="/erp" replace />
  }
  const pageKey = crmPageKeyFromPath(location.pathname)
  if (pageKey && !canAccessCrmPage(user, pageKey)) {
    return <Navigate to="/sales-tracking" replace />
  }
  return <>{children}</>
}

function ErpReviewerGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  if (user?.role !== 'admin' && user?.role !== 'office_assistant') {
    return <Navigate to="/erp" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />

        {/* ERP routes */}
        <Route
          path="/erp"
          element={
            <ProtectedRoute>
              <ErpLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MyPage />} />
          <Route path="org" element={<OrgPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="leave-schedule" element={<LeaveSchedulePage />} />
          <Route path="snack-request" element={<SnackRequestPage />} />
          <Route path="health-checkup" element={<HealthCheckupPage />} />
          <Route path="education" element={<EducationPage />} />
          <Route path="admin/education" element={<ErpReviewerGuard><EducationApprovalsPage /></ErpReviewerGuard>} />
        </Route>

        {/* CRM routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <CrmGuard>
                <Layout />
              </CrmGuard>
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
          <Route path="settings/flag-check" element={<FlagCheckPage />} />
          <Route path="hotpepper" element={<HotpepperPage />} />
          <Route path="inquiry-leads" element={<InquiryLeadsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
