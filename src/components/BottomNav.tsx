import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Receipt, Calendar, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/bills', icon: Receipt, label: 'Bills' },
    { path: '/events', icon: Calendar, label: 'Events' },
    { path: '/more', icon: MoreHorizontal, label: 'More' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, icon: Icon, label }) => {
        const isActive = location.pathname === path || 
          (path === '/dashboard' && location.pathname === '/bills');
        
        return (
          <Link
            key={path}
            to={path}
            className={cn('bottom-nav-item', isActive && 'active')}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
