import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'

interface LayoutProps {
  children: React.ReactNode
}

const roleColors: Record<UserRole, string> = {
  agent: 'bg-blue-100 text-blue-800',
  tl: 'bg-green-100 text-green-800',
  wfm: 'bg-purple-100 text-purple-800',
}

const roleLabels: Record<UserRole, string> = {
  agent: 'Agent',
  tl: 'Team Lead',
  wfm: 'WFM',
}

interface NavItem {
  name: string
  href: string
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', roles: ['agent', 'tl', 'wfm'] },
  { name: 'Schedule', href: '/schedule', roles: ['agent', 'tl', 'wfm'] },
  { name: 'My Shifts', href: '/shifts', roles: ['agent', 'tl', 'wfm'] },
  { name: 'Swap Requests', href: '/swap-requests', roles: ['agent', 'tl', 'wfm'] },
  { name: 'Leave Requests', href: '/leave-requests', roles: ['agent', 'tl', 'wfm'] },
  { name: 'Leave Balances', href: '/leave-balances', roles: ['agent', 'tl', 'wfm'] },
  { name: 'Team Approvals', href: '/approvals', roles: ['tl', 'wfm'] },
  { name: 'Schedule Upload', href: '/schedule/upload', roles: ['wfm'] },
  { name: 'Settings', href: '/settings', roles: ['wfm'] },
]

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) return null

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <span className="text-xl font-bold text-indigo-600">SwapTool</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="px-4 py-4 space-y-1">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === item.href
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          <div className="flex items-center h-16 px-4 border-b">
            <span className="text-xl font-bold text-indigo-600">SwapTool</span>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === item.href
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Spacer for desktop */}
            <div className="hidden lg:block" />

            {/* User info and sign out - top right */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
