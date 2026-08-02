import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  MoreHorizontal,
  FolderOpen,
  Settings,
  Users,
  Building,
  HelpCircle,
  FileText,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import BillvieLogo from '@/components/BillvieLogo';
import { UserService } from '@/services/UserService';

const mobileNav = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/documents', icon: FolderOpen, label: 'Documents' },
  { path: '/people', icon: Users, label: 'People' },
];

const desktopNav = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/bills', icon: Receipt, label: 'Bills' },
  { path: '/documents', icon: FolderOpen, label: 'Documents' },
  { path: '/people', icon: Users, label: 'People' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const settings = UserService.getSettings();
  const isAccountant = settings.userType === 'accountant';

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-40 h-16 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 flex items-center justify-between w-full">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <BillvieLogo size="md" />
          </button>

          <nav className="flex items-center gap-1">
            {desktopNav.map(({ path, icon: Icon, label }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <MoreHorizontal className="w-4 h-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                <DropdownMenuLabel>Records &amp; Tools</DropdownMenuLabel>
                <DropdownMenuItem className="lg:hidden" onClick={() => navigate('/bills')}>
                  <Receipt className="w-4 h-4 mr-2" /> Bills
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/events')}>
                  <Calendar className="w-4 h-4 mr-2" /> Events
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/tax-documents')}>
                  <Receipt className="w-4 h-4 mr-2" /> Tax Documents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/financial')}>
                  <Building className="w-4 h-4 mr-2" /> Financial Snapshot
                </DropdownMenuItem>
                {isAccountant && (
                  <DropdownMenuItem onClick={() => navigate('/accountant')}>
                    <Users className="w-4 h-4 mr-2" /> Accountant Portal
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>App</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="w-4 h-4 mr-2" /> Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" /> Terms of Service
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="w-4 h-4 mr-2" /> Privacy Policy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav lg:hidden">
        {[...mobileNav, { path: '/more', icon: MoreHorizontal, label: 'More' }].map(
          ({ path, icon: Icon, label }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn('bottom-nav-item', active && 'active')}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-xs">{label}</span>
              </Link>
            );
          },
        )}
      </nav>
    </>
  );
};

export default BottomNav;
