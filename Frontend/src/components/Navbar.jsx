import { Link } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ onMenuToggle, isSidebarOpen = false }) => {
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className="sticky top-0 z-40 w-full
        bg-white/80 dark:bg-navy-950/80
        backdrop-blur-xl
        border-b border-slate-200 dark:border-white/5"
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Hamburger */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={onMenuToggle}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl
                text-slate-600 dark:text-slate-300
                hover:bg-slate-100 dark:hover:bg-navy-800
                transition-colors cursor-pointer"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}

          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 shadow-lg shadow-accent-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-xl bg-gradient-to-r from-accent-500 to-accent-400 bg-clip-text text-transparent">
              XAI-HEDL
            </span>
          </Link>
        </div>

        {/* Right: Auth-dependent content */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            /* Authenticated: avatar + name */
            <div className="hidden sm:flex items-center gap-3 ml-1">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">
                  {user.full_name || user.name || 'Doctor'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user.role || 'Physician'}
                </p>
              </div>
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full
                  bg-gradient-to-br from-accent-500 to-accent-400
                  text-white text-sm font-semibold
                  ring-2 ring-white dark:ring-navy-950"
              >
                {getInitials(user.full_name || user.name)}
              </div>
            </div>
          ) : (
            /* Public: Login + Register */
            <div className="flex items-center gap-2 ml-1">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium rounded-xl
                  text-slate-700 dark:text-slate-300
                  hover:bg-slate-100 dark:hover:bg-navy-800
                  transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold rounded-xl
                  bg-gradient-to-r from-accent-500 to-accent-400
                  text-white shadow-lg shadow-accent-500/25
                  hover:shadow-accent-500/40 hover:scale-[1.02]
                  active:scale-[0.98]
                  transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
