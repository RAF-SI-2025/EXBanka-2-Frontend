import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  LogOut,
  Building2,
  CreditCard,
  Wallet,
  SendHorizontal,
  ArrowLeftRight,
  UserCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Banknote,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

export default function Sidebar() {
  const { user, clearAuth, hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [paymentOpen, setPaymentOpen] = useState(
    location.pathname.startsWith('/client/payments')
  )

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const isClient = user?.userType === 'CLIENT'
  const isAdmin = user?.userType === 'ADMIN'
  const isEmployee = user?.userType === 'EMPLOYEE'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary-700 text-white'
        : 'text-primary-300 hover:bg-primary-800 hover:text-white',
    ].join(' ')

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ml-4',
      isActive
        ? 'bg-primary-700 text-white'
        : 'text-primary-300 hover:bg-primary-800 hover:text-white',
    ].join(' ')

  return (
    <aside className="flex h-screen w-64 flex-col bg-primary-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-800">
        <Building2 className="h-7 w-7 text-primary-300" />
        <span className="text-lg font-bold tracking-tight">EXBanka</span>
      </div>

      {/* User info */}
      {user && (
        <div className="px-6 py-4 border-b border-primary-800">
          <p className="text-xs text-primary-400 uppercase tracking-wider">Prijavljeni kao</p>
          <p className="mt-1 text-sm font-medium truncate">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-primary-700 px-2 py-0.5 text-xs font-medium text-primary-200">
            {user.userType}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* ADMIN items */}
        {isAdmin && (
          <>
            <NavLink to="/admin" end className={navLinkClass}>
              <LayoutDashboard className="h-5 w-5" />
              Kontrolna tabla
            </NavLink>
            {hasPermission('MANAGE_USERS') && (
              <>
                <NavLink to="/admin/employees" className={navLinkClass}>
                  <Users className="h-5 w-5" />
                  Lista zaposlenih
                </NavLink>
                <NavLink to="/admin/employees/new" className={navLinkClass}>
                  <UserPlus className="h-5 w-5" />
                  Novi zaposleni
                </NavLink>
              </>
            )}
          </>
        )}

        {/* EMPLOYEE items */}
        {isEmployee && (
          <>
            <NavLink to="/employee" end className={navLinkClass}>
              <LayoutDashboard className="h-5 w-5" />
              Moj portal
            </NavLink>
            <NavLink to="/employee/clients/new" className={navLinkClass}>
              <UserPlus className="h-5 w-5" />
              Kreiraj korisnika
            </NavLink>
            <NavLink to="/employee/accounts/new" className={navLinkClass}>
              <CreditCard className="h-5 w-5" />
              Kreiraj račun
            </NavLink>
          </>
        )}

        {/* CLIENT items */}
        {isClient && (
          <>
            <NavLink to="/client" end className={navLinkClass}>
              <LayoutDashboard className="h-5 w-5" />
              Klijentski portal
            </NavLink>
            <NavLink to="/client/accounts" className={navLinkClass}>
              <Wallet className="h-5 w-5" />
              Računi
            </NavLink>

            {/* Plaćanja collapsible group */}
            <div>
              <button
                onClick={() => setPaymentOpen((v) => !v)}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname.startsWith('/client/payments')
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white',
                ].join(' ')}
              >
                <Banknote className="h-5 w-5" />
                <span className="flex-1 text-left">Plaćanja</span>
                {paymentOpen
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
              </button>

              {paymentOpen && (
                <div className="mt-1 space-y-1">
                  <NavLink to="/client/payments/new" className={subNavLinkClass}>
                    <SendHorizontal className="h-4 w-4" />
                    Novo plaćanje
                  </NavLink>
                  <NavLink to="/client/payments/transfer" className={subNavLinkClass}>
                    <ArrowLeftRight className="h-4 w-4" />
                    Prenos
                  </NavLink>
                  <NavLink to="/client/payments/recipients" className={subNavLinkClass}>
                    <UserCheck className="h-4 w-4" />
                    Primaoci plaćanja
                  </NavLink>
                  <NavLink to="/client/payments/history" className={subNavLinkClass}>
                    <ClipboardList className="h-4 w-4" />
                    Pregled plaćanja
                  </NavLink>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-primary-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-300 hover:bg-primary-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Odjavi se
        </button>
      </div>
    </aside>
  )
}
