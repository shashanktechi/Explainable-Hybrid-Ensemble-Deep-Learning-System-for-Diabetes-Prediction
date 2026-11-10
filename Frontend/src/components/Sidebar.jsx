import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  History,
  Users,
  Settings2,
  LogOut,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/predict', icon: Stethoscope, label: 'New Prediction' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/settings', icon: Settings2, label: 'Settings' },
];

const sidebarVariants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const SidebarContent = ({ onClose, isMobile = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mobile close button */}
      {isMobile && (
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-white/5">
          <span className="font-heading font-bold text-lg bg-gradient-to-r from-accent-500 to-accent-400 bg-clip-text text-transparent">
            Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex items-center justify-center w-9 h-9 rounded-xl
              text-slate-500 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-navy-800
              transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-accent-500/10 to-accent-400/5 text-accent-500 dark:text-accent-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive
                      ? 'text-accent-500 dark:text-accent-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                />
                <span>{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-500" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section: User Info + Logout */}
      <div className="border-t border-slate-200 dark:border-white/5 p-4 space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3 px-2">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full
              bg-gradient-to-br from-accent-500 to-accent-400
              text-white text-sm font-semibold flex-shrink-0"
          >
            {(user?.full_name || user?.name)
              ? (user.full_name || user.name)
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {user?.full_name || user?.name || 'Doctor'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
              {user?.role || 'Physician'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium
            text-red-500 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-500/10
            transition-colors duration-200 cursor-pointer"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ isOpen = false, onClose }) => {
  return (
    <>
      {/* Desktop Sidebar — always visible on md+ */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:top-16
          bg-white dark:bg-navy-950
          border-r border-slate-200 dark:border-white/5
          z-30"
      >
        <SidebarContent onClose={undefined} />
      </aside>

      {/* Mobile Sidebar — slide-over overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />
        )}
        {isOpen && (
          <motion.aside
            key="sidebar-mobile"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-72
              bg-white dark:bg-navy-950
              border-r border-slate-200 dark:border-white/5
              shadow-2xl md:hidden"
          >
            <SidebarContent isMobile onClose={onClose} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
