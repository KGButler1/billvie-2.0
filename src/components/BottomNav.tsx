import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  MoreHorizontal,
  FolderOpen,
  Settings,
  UserCheck,
  Users,
  Briefcase,
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

const primaryNav = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/bills', icon: Receipt, label: 'Bills' },
  { path: '/events', icon: Calendar, label: 'Events' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/dashboard' && location.pathname === '/bills') ||
    (path === '/bills' && location.pathname === '/bills');

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
            {primaryNav.map(({ path, icon: Icon, label }) => {
              const active =
                location.pathname === path ||
                (path === '/dashboard' &&
                  (location.pathname === '/dashboard' || location.pathname === '/bills'));
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
            <Link
              to="/documents"
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                location.pathname === '/documents'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <FolderOpen className="w-4 h-4" />
              Documents
            </Link>
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
                <DropdownMenuLabel>Trusted People</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/advisor')}>
                  <UserCheck className="w-4 h-4 mr-2" /> Advisor Portal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/accountant')}>
                  <Users className="w-4 h-4 mr-2" /> Accountant Portal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Records & Tools</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/tax-documents')}>
                  <Receipt className="w-4 h-4 mr-2" /> Tax Documents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/loanready')}>
                  <Briefcase className="w-4 h-4 mr-2" /> LoanReady
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/financial')}>
                  <Building className="w-4 h-4 mr-2" /> Financial Info
                </DropdownMenuItem>
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
        {[...primaryNav, { path: '/more', icon: MoreHorizontal, label: 'More' }].map(
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
