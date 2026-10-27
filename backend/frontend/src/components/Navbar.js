import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Upload, BarChart3, ListChecks, LogOut } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/upload', label: 'Upload Bill', icon: Upload },
    { path: '/insights', label: 'Insights', icon: BarChart3 },
    { path: '/shopping-list', label: 'Shopping List', icon: ListChecks },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-stone-200 sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3" data-testid="logo-link">
            <div className="bg-primary p-2 rounded-xl shadow-lg">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-heading font-extrabold text-stone-900">SmartSpend AI</span>
          </Link>

          <div className="flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-body ${
                    isActive
                      ? 'bg-emerald-50 text-primary font-semibold'
                      : 'text-stone-600 hover:text-primary hover:bg-emerald-50/50'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}

            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-stone-200">
              <span className="text-sm text-stone-600 font-body" data-testid="user-name">{user?.name}</span>
              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
                className="text-stone-500 hover:text-accent hover:bg-accent/10"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;