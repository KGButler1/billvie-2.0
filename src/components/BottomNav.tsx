import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Calendar, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/bills', icon: Receipt, label: 'Bills' },
    { path: '/events', icon: Calendar, label: 'Events', comingSoon: true },
    { path: '/more', icon: MoreHorizontal, label: 'More' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path === '/dashboard' && location.pathname === '/');
        
        return (
          <button
            key={item.path}
            onClick={() => !item.comingSoon && navigate(item.path)}
            className={cn(
              'bottom-nav-item',
              isActive && 'active',
              item.comingSoon && 'opacity-50 cursor-not-allowed'
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">
              {item.label}
              {item.comingSoon && (
                <span className="block text-[10px] opacity-70">Soon</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
