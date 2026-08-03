import { useState } from 'react';
import { Menu, X, Settings, Info, Eye, EyeOff } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardHeaderProps {
  onClearSamples: () => void;
  hasSampleBills: boolean;
  isFamilyView?: boolean;
  onToggleFamilyView?: () => void;
}

const DashboardHeader = ({ onClearSamples, hasSampleBills, isFamilyView = false, onToggleFamilyView }: DashboardHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border lg:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <BillvieLogo size="md" />
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={openSearch}
            >
              <Search className="w-5 h-5" />
            </Button>


            {onToggleFamilyView && (
              <Button
                variant={isFamilyView ? "default" : "ghost"}
                size="sm"
                onClick={onToggleFamilyView}
                className="text-sm gap-1.5"
              >
                {isFamilyView ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline">Family View</span>
              </Button>
            )}

            {hasSampleBills && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSamples}
                className="text-sm text-muted-foreground hidden sm:flex"
              >
                Clear samples
              </Button>
            )}
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors md:hidden"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-30 bg-card border-b border-border p-4 md:hidden"
          >
            <nav className="space-y-2">
              {hasSampleBills && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    onClearSamples();
                    setIsMenuOpen(false);
                  }}
                >
                  <Info className="w-4 h-4 mr-2" />
                  Clear sample bills
                </Button>
              )}
              <Button variant="ghost" className="w-full justify-start" onClick={() => {
                navigate('/settings');
                setIsMenuOpen(false);
              }}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardHeader;
