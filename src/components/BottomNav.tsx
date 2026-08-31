import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Calendar, FolderOpen, Settings, Users, Building, CircleHelp as HelpCircle, FileText, Shield, Search, LogOut, MoveHorizontal as MoreHorizontal, Lock } from 'lucide-react';
import { openSearch } from '@/components/search/GlobalSearch';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { UserService } from '@/services/UserService';
import UpgradeModal from '@/components/UpgradeModal';

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
import UserAvatar from '@/components/UserAvatar';
import { isDemoModeActive } from '@/demo/demoFlag';

const demoPrefix = (path: string) => (isDemoModeActive() ? `/demo${path}` : path);

const mobileNav = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/documents', icon: FolderOpen, label: 'Documents' },
  { path: '/people', icon: Users, label: 'People' },
];

const desktopNav = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/bills', icon: Receipt, label: 'Bills' },
  { path: '/documents', icon: FolderOpen, label: 'Documents' },
  { path: '/financial', icon: Building, label: 'Snapshot' },
  { path: '/people', icon: Users, label: 'People' },
];

const AccountDropdownContent = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();

  return (
    <>
      <DropdownMenuLabel className="px-3 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            displayName={profile?.displayName ?? 'You'}
            avatarUrl={profile?.avatarUrl}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{profile?.displayName ?? 'You'}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.householdName ?? 'My Household'}</p>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Records &amp; Tools</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => navigate('/events')}>
        <Calendar className="w-4 h-4 mr-2" /> Events
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate('/tax-documents')}>
        <Receipt className="w-4 h-4 mr-2" /> Tax Documents
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate('/financial')}>
        <Building className="w-4 h-4 mr-2" /> Financial Snapshot
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>App</DropdownMenuLabel>
      <DropdownMenuItem onClick={() => navigate('/settings')}>
        <Settings className="w-4 h-4 mr-2" /> Settings
      </DropdownMenuItem>
      <DropdownMenuItem>
        <HelpCircle className="w-4 h-4 mr-2" /> Help &amp; Support
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate('/terms')}>
        <FileText className="w-4 h-4 mr-2" /> Terms of Service
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate('/privacy')}>
        <Shield className="w-4 h-4 mr-2" /> Privacy Policy
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={async () => {
          await signOut();
          navigate('/');
        }}
        className="text-destructive"
      >
        <LogOut className="w-4 h-4 mr-2" /> Sign out
      </DropdownMenuItem>
    </>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const demo = isDemoModeActive();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isActive = (path: string) => location.pathname === demoPrefix(path);

  const settings = UserService.getSettings();
  const isPaid = settings.userType === 'paid' || settings.userType === 'accountant';

  const handleNavClick = (path: string) => {
    if (path === '/financial' && !isPaid) {
      setShowUpgradeModal(true);
      return;
    }
    navigate(demoPrefix(path));
  };

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-40 h-16 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 flex items-center justify-between w-full">
          <button
            onClick={() => navigate(demoPrefix('/dashboard'))}
            className="flex items-center gap-2"
          >
            <BillvieLogo size="md" />
          </button>

          <nav className="flex items-center gap-1">
            {desktopNav.map(({ path, icon: Icon, label }) => {
              const active = isActive(path);
              const locked = path === '/financial' && !isPaid;
              return (
                <button
                  key={path}
                  onClick={() => handleNavClick(path)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {locked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {!demo && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={openSearch}>
                <Search className="w-4 h-4" />
                Search
                <kbd className="ml-1 text-xs text-muted-foreground border border-border rounded px-1">
                  ⌘K
                </kbd>
              </Button>
            )}
            {!demo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center rounded-full hover:ring-2 hover:ring-primary/30 transition-all">
                    <UserAvatar
                      displayName={profile?.displayName ?? 'You'}
                      avatarUrl={profile?.avatarUrl}
                      size="md"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-background z-50">
                  <AccountDropdownContent />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reason="financial"
          onUpgrade={() => {
            UserService.saveSettings({ userType: 'paid', hasEventsAccess: true });
            setShowUpgradeModal(false);
            navigate(demoPrefix('/financial'));
          }}
          onPreviewAnyway={() => {
            setShowUpgradeModal(false);
            navigate(demoPrefix('/financial'));
          }}
        />
      )}

      {/* Mobile bottom nav */}
      <nav className="bottom-nav lg:hidden">
        {mobileNav.map(({ path, icon: Icon, label }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={demoPrefix(path)}
              className={cn('bottom-nav-item', active && 'active')}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
        {!demo && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn('bottom-nav-item', isActive('/more') && 'active')}>
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-5 h-5 rounded-full object-cover mb-0.5"
                  />
                ) : (
                  <MoreHorizontal className="w-5 h-5 mb-0.5" />
                )}
                <span className="text-xs">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-background z-50 mb-2">
              <AccountDropdownContent />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    </>
  );
};

export default BottomNav;
