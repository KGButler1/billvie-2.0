import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setDemoMode } from './demoFlag';
import DemoBanner from './DemoBanner';
import DemoIntroModal from './DemoIntroModal';

const DemoRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    setDemoMode(true);
    return () => setDemoMode(false);
  }, []);

  useEffect(() => {
    if (location.pathname === '/demo') {
      navigate('/demo/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    setShowIntro(true);
  }, []);

  return (
    <>
      {children}
      <DemoBanner />
      <DemoIntroModal open={showIntro} onClose={() => setShowIntro(false)} />
    </>
  );
};

export default DemoRoute;
