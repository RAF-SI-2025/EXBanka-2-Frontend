import { createBrowserRouter, RouterProvider, Route, Navigate, createRoutesFromElements, useParams } from 'react-router-dom'
import PrivateRoute from './router/PrivateRoute'
import HartijePortalRoute from './router/HartijePortalRoute'
import PortfolioRoute from './router/PortfolioRoute'
import PermissionRoute from './router/PermissionRoute'
import Layout from '@/components/layout/Layout'

// Auth pages (public)
import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ActivatePage from '@/pages/auth/ActivatePage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Admin pages
import AdminPortal from '@/pages/admin/AdminPortal'
import EmployeeList from '@/pages/admin/EmployeeList'
import EditEmployee from '@/pages/admin/EditEmployee'
import CreateEmployee from '@/pages/admin/CreateEmployee'

// Role home pages
import EmployeePage from '@/pages/employee/EmployeePage'
import CreateClient from '@/pages/employee/CreateClient'
import ClientListPage from '@/pages/employee/ClientListPage'
import ClientDetailPage from '@/pages/employee/ClientDetailPage'
import EditClient from '@/pages/employee/EditClient'
import CreateAccount from '@/pages/employee/CreateAccount'
import ClientPage from '@/pages/client/ClientPage'
import AccountsPage from '@/pages/client/AccountsPage'
import AccountDetailPage from '@/pages/client/AccountDetailPage'
import PrimaociPage from '@/pages/client/payments/PrimaociPage'
import NovoPlacanjeWizard from '@/pages/client/payments/NovoPlacanjeWizard'
import PrenosPage from '@/pages/client/payments/PrenosPage'
import PregledPlacanja from '@/pages/client/payments/PregledPlacanja'
import MenjacnicaPage from '@/pages/client/MenjacnicaPage'

// Client – Kartice
import KarticeListaPage from '@/pages/client/KarticeListaPage'

// Client – Krediti
import KreditiPage from '@/pages/client/krediti/KreditiPage'
import KreditZahtevForm from '@/pages/client/krediti/KreditZahtevForm'

// Employee – Računi i kartice
import AccountsListPage from '@/pages/employee/AccountsListPage'
import AccountCardsPage from '@/pages/employee/AccountCardsPage'

// Employee – Krediti
import ZahteviZaKreditPage from '@/pages/employee/krediti/ZahteviZaKreditPage'
import SviKreditiPage from '@/pages/employee/krediti/SviKreditiPage'

// Employee – Aktuari
import ActuaryManagement from '@/pages/employee/actuaries/ActuaryManagement'

// Employee – Trading
import TaxTrackingPage from '@/pages/employee/trading/TaxTrackingPage'
import SupervisorOrdersPage from '@/pages/employee/trading/SupervisorOrdersPage'

// Berze (shared: employees + clients)
import ExchangesPage from '@/pages/employee/ExchangesPage'

// Hartije od vrednosti (client)
import ListingsPage from '@/pages/client/listings/ListingsPage'
import ListingDetailsPage from '@/pages/client/listings/ListingDetailsPage'
import CreateOrderPage from '@/pages/client/listings/CreateOrderPage'
import MyTradingOrdersPage from '@/pages/client/listings/MyTradingOrdersPage'


import NotFoundPage from '@/pages/NotFoundPage'

// ── Celina 4 – OTC ────────────────────────────────────────────────────────────
import OTCTradingPage from '@/pages/otc/OTCTradingPage'
import OTCCombinedPage from '@/pages/otc/OTCCombinedPage'
import OTCOfferDetailPage from '@/pages/otc/OTCOfferDetailPage'
import OTCContractDetailPage from '@/pages/otc/OTCContractDetailPage'

// ── Interbank (si-tx-proto) ──────────────────────────────────────────────────
import InterbankPaymentPage from '@/pages/client/payments/InterbankPaymentPage'
import InterbankOTCPage from '@/pages/otc/InterbankOTCPage'

// ── Celina 4 – Fondovi ────────────────────────────────────────────────────────
import FundsDiscoveryPage from '@/pages/funds/FundsDiscoveryPage'
import FundDetailPage from '@/pages/funds/FundDetailPage'
import CreateFundPage from '@/pages/funds/CreateFundPage'
import FundInvestPage from '@/pages/funds/FundInvestPage'

// ── Celina 4 – Banka ─────────────────────────────────────────────────────────
import ActuaryPerformancePage from '@/pages/bank/ActuaryPerformancePage'
import BankFundPositionsPage from '@/pages/bank/BankFundPositionsPage'

import AllowedRolesRoute from '@/router/AllowedRolesRoute'

function RedirectClientHartijeToCanonical() {
  return <Navigate to="/hartije" replace />
}

function RedirectClientHartijeDetailToCanonical() {
  const { id } = useParams()
  return <Navigate to={id ? `/hartije/${id}` : '/hartije'} replace />
}

function RedirectClientCreateOrderToCanonical() {
  const { id } = useParams()
  return <Navigate to={id ? `/hartije/kupovina/${id}` : '/hartije'} replace />
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* ── Public routes ─────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ── Protected routes (require auth) ─────────────────────────── */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          {/* Admin portal – requires ADMIN role */}
          <Route path="/admin" element={<PrivateRoute requiredRole="ADMIN" />}>
            <Route index element={<AdminPortal />} />
            <Route path="employees" element={<EmployeeList />} />
            <Route path="employees/new" element={<CreateEmployee />} />
            <Route path="employees/:id/edit" element={<EditEmployee />} />
            <Route path="exchanges" element={<ExchangesPage />} />
            <Route path="actuaries" element={<PermissionRoute permission="SUPERVISOR"><ActuaryManagement /></PermissionRoute>} />
            <Route path="trading/tax" element={<PermissionRoute permission="SUPERVISOR"><TaxTrackingPage /></PermissionRoute>} />
            <Route path="trading/orders" element={<PermissionRoute permission="SUPERVISOR"><SupervisorOrdersPage /></PermissionRoute>} />
          </Route>

          {/* Employee home */}
          <Route element={<HartijePortalRoute />}>
            <Route path="/hartije" element={<ListingsPage />} />
            <Route path="/hartije/my-orders" element={<MyTradingOrdersPage />} />
            <Route path="/hartije/kupovina/:id" element={<CreateOrderPage />} />
            <Route path="/hartije/:id" element={<ListingDetailsPage />} />
          </Route>

          <Route path="/employee" element={<PrivateRoute requiredRole="EMPLOYEE" />}>
            <Route index element={<EmployeePage />} />
            <Route path="clients" element={<ClientListPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="clients/:id/edit" element={<EditClient />} />
            <Route path="clients/new" element={<CreateClient />} />
            <Route path="accounts/new" element={<CreateAccount />} />
            <Route path="accounts" element={<AccountsListPage />} />
            <Route path="accounts/:broj_racuna/cards" element={<AccountCardsPage />} />
            <Route path="credits/requests" element={<ZahteviZaKreditPage />} />
            <Route path="credits/all" element={<SviKreditiPage />} />
            <Route path="actuaries" element={<PermissionRoute permission="SUPERVISOR"><ActuaryManagement /></PermissionRoute>} />
            <Route path="exchanges" element={<ExchangesPage />} />
            <Route path="trading/tax" element={<PermissionRoute permission="SUPERVISOR"><TaxTrackingPage /></PermissionRoute>} />
            <Route path="trading/orders" element={<PermissionRoute permission="SUPERVISOR"><SupervisorOrdersPage /></PermissionRoute>} />
          </Route>

          {/* Portfolio – klijenti i aktuari */}
          <Route path="/portfolio" element={<PortfolioRoute />} />

          {/* ── Celina 4 – OTC ──────────────────────────────────────────── */}
          <Route path="/otc/trade" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'AGENT', 'SUPERVISOR']}>
              <OTCTradingPage />
            </AllowedRolesRoute>
          } />
          <Route path="/otc" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'AGENT', 'SUPERVISOR']}>
              <OTCCombinedPage />
            </AllowedRolesRoute>
          } />
          <Route path="/otc/offers/:id" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'AGENT', 'SUPERVISOR']}>
              <OTCOfferDetailPage />
            </AllowedRolesRoute>
          } />
          <Route path="/otc/contracts/:id" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'AGENT', 'SUPERVISOR']}>
              <OTCContractDetailPage />
            </AllowedRolesRoute>
          } />

          {/* ── Celina 4 – Fondovi ────────────────────────────────────── */}
          <Route path="/funds" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'AGENT', 'SUPERVISOR']}>
              <FundsDiscoveryPage />
            </AllowedRolesRoute>
          } />
          <Route path="/funds/create" element={
            <AllowedRolesRoute allowedRoles={['SUPERVISOR']}>
              <CreateFundPage />
            </AllowedRolesRoute>
          } />
          <Route path="/funds/:id" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'AGENT', 'SUPERVISOR']}>
              <FundDetailPage />
            </AllowedRolesRoute>
          } />
          <Route path="/funds/:id/invest" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'SUPERVISOR']}>
              <FundInvestPage />
            </AllowedRolesRoute>
          } />

          {/* ── Celina 4 – Profit banke ──────────────────────────────── */}
          <Route path="/bank/actuary-performance" element={
            <AllowedRolesRoute allowedRoles={['SUPERVISOR']}>
              <ActuaryPerformancePage />
            </AllowedRolesRoute>
          } />
          <Route path="/bank/fund-positions" element={
            <AllowedRolesRoute allowedRoles={['SUPERVISOR']}>
              <BankFundPositionsPage />
            </AllowedRolesRoute>
          } />

          {/* ── Interbank (si-tx-proto) ──────────────────────────────── */}
          <Route path="/interbank/payments" element={
            <AllowedRolesRoute allowedRoles={['CLIENT']}>
              <InterbankPaymentPage />
            </AllowedRolesRoute>
          } />
          <Route path="/interbank/otc" element={
            <AllowedRolesRoute allowedRoles={['CLIENT', 'AGENT', 'SUPERVISOR']}>
              <InterbankOTCPage />
            </AllowedRolesRoute>
          } />

          {/* Client home */}
          <Route path="/client" element={<PrivateRoute requiredRole="CLIENT" />}>
            <Route index element={<ClientPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="accounts/:id" element={<AccountDetailPage />} />
            <Route path="payments/new" element={<NovoPlacanjeWizard />} />
            <Route path="payments/interbank" element={<InterbankPaymentPage />} />
            <Route path="payments/transfer" element={<PrenosPage />} />
            <Route path="payments/recipients" element={<PrimaociPage />} />
            <Route path="payments/history" element={<PregledPlacanja />} />
            <Route path="cards" element={<KarticeListaPage />} />
            <Route path="credits" element={<KreditiPage />} />
            <Route path="credits/new" element={<KreditZahtevForm />} />
            <Route path="exchange" element={<MenjacnicaPage />} />
            <Route path="exchanges" element={<ExchangesPage />} />
            <Route path="hartije" element={<RedirectClientHartijeToCanonical />} />
            <Route path="hartije/:id" element={<RedirectClientHartijeDetailToCanonical />} />
            <Route path="create-order/:id" element={<RedirectClientCreateOrderToCanonical />} />
          </Route>
        </Route>
      </Route>

      {/* ── Fallback ──────────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
)

export default function App() {
  return <RouterProvider router={router} />
}
