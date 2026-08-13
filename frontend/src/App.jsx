import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import PaymentPage from './pages/PaymentPage';
import OverviewDashboardPage from './pages/OverviewDashboardPage';
import PaymentsPage from './pages/PaymentsPage';
import RecentPaymentsPage from './pages/RecentPaymentsPage';
import NetworksPage from './pages/NetworksPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DeveloperDocsPage from './pages/DeveloperDocsPage';
import PublicGuidePage from './pages/PublicGuidePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import AdminRecentPaymentsPage from './pages/AdminRecentPaymentsPage';
import AdminReferralsPage from './pages/AdminReferralsPage';
import AdminShowcaseTeamPage from './pages/AdminShowcaseTeamPage';
import AdminTestimonialsPage from './pages/AdminTestimonialsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import PackagesPage from './pages/PackagesPage';
import PackagePortfolioPage from './pages/PackagePortfolioPage';
import AdminPackagesPage from './pages/AdminPackagesPage';
import CommunityPage from './pages/CommunityPage';
import ReferralsPage from './pages/ReferralsPage';
import LoanPage from './pages/LoanPage';
import TransferPage from './pages/TransferPage';
import WithdrawPage from './pages/WithdrawPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AppLayout from './layouts/AppLayout';
import PwaInstallBanner from './components/PwaInstallBanner';
import CookieConsent from './components/CookieConsent';
import { useStandaloneApp } from './hooks/useStandaloneApp';

export default function App() {
  useStandaloneApp();

  return (
    <>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<TermsOfUsePage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/guide" element={<PublicGuidePage />} />
      <Route path="/docs" element={<DeveloperDocsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/payments/new" element={<HomePage />} />
        <Route path="/dashboard" element={<OverviewDashboardPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payments/recent" element={<RecentPaymentsPage />} />
        <Route path="/networks" element={<NetworksPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/packages/portfolio" element={<PackagePortfolioPage />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/referrals" element={<ReferralsPage />} />
        <Route path="/loan" element={<LoanPage />} />
        <Route path="/withdraw" element={<WithdrawPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/pay/:id" element={<PaymentPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payments/recent"
          element={
            <AdminRoute>
              <AdminRecentPaymentsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/packages"
          element={
            <AdminRoute>
              <AdminPackagesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/referrals"
          element={
            <AdminRoute>
              <AdminReferralsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/showcase-team"
          element={
            <AdminRoute>
              <AdminShowcaseTeamPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/testimonials"
          element={
            <AdminRoute>
              <AdminTestimonialsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
      </Route>
      </Routes>
      <PwaInstallBanner />
      <CookieConsent />
    </>
  );
}
