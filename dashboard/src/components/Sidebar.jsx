import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon, UsersIcon, MegaphoneIcon, DocumentTextIcon,
  GiftIcon, TicketIcon, CogIcon, ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon, RocketLaunchIcon,
} from '@heroicons/react/24/outline';

const nav = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, exact: true },
  { to: '/users', label: 'Users', icon: UsersIcon },
  { to: '/channels', label: 'Channels', icon: MegaphoneIcon },
  { to: '/posts', label: 'Posts', icon: DocumentTextIcon },
  { to: '/rewards', label: 'Rewards', icon: GiftIcon },
  { to: '/tickets', label: 'Tickets', icon: TicketIcon },
  { to: '/settings', label: 'Settings', icon: CogIcon },
  { to: '/logs', label: 'Logs', icon: ClipboardDocumentListIcon },
];

export default function Sidebar({ open, setOpen }) {
  const { admin, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <RocketLaunchIcon className="w-8 h-8 text-primary-400" />
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">Social Poster</h1>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
              {admin?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin?.username}</p>
              <p className="text-xs text-gray-500 truncate">{admin?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
