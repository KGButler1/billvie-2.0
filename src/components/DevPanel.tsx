import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Database, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserService } from '@/services/UserService';
import { EventService } from '@/services/EventService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { BillService } from '@/services/BillService';

interface DevPanelProps {
  onClose: () => void;
  onDataChange: () => void;
}

const DevPanel = ({ onClose, onDataChange }: DevPanelProps) => {
  const [showStorage, setShowStorage] = useState(false);

  const handleToggleEvents = () => {
    UserService.saveSettings({
      hasEventsAccess: !UserService.getSettings().hasEventsAccess
    });
  };

  const handleClearData = async () => {
    UserService.clearAllData();
    await Promise.all([
      EventService.clearAllEvents(),
      FinancialInfoService.clearAll(),
      BillService.clearAllBills(),
    ]);
    onDataChange();
  };

  const storageState = UserService.getLocalStorageState();

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="dev-panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Database className="w-4 h-4" />
          Dev Panel
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Events Access Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Events Access</span>
          <Button
            variant={UserService.getSettings().hasEventsAccess ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleEvents}
          >
            {UserService.getSettings().hasEventsAccess ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {/* View Storage State */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStorage(!showStorage)}
          className="w-full"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showStorage ? 'Hide' : 'View'} localStorage
        </Button>

        {showStorage && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(storageState, null, 2)}
          </pre>
        )}

        {/* Clear All Data */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearData}
          className="w-full"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All Data
        </Button>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Ctrl+Shift+D to toggle
        </p>
      </div>
    </motion.div>
  );
};

export default DevPanel;
