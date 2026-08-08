import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DemoBanner = () => {
  const navigate = useNavigate();
  return (
    <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-amber-50 border-y border-amber-200 px-4 py-2.5">
      <div className="container mx-auto flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-amber-900">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">You're exploring the Reyes-Whitfield household.</span>
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-amber-800 hover:text-amber-900 underline-offset-2 hover:underline transition-colors"
          >
            Exit demo
          </button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate('/auth')}
          >
            Create your own
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
