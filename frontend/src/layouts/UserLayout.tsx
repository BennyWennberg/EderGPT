import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  MessageSquare,
  History,
  User,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/history', icon: History, label: 'Verlauf' },
  { to: '/profile', icon: User, label: 'Profil' },
];

export default function UserLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Minimal Sidebar */}
      <aside className="w-16 bg-card border-r border-border flex flex-col items-center py-4">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-6">
          <span className="text-primary-foreground font-bold">E</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
              title={item.label}
            >
              <item.icon size={20} />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="Abmelden"
        >
          <LogOut size={20} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

