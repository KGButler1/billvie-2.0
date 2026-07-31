import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Database, User, Trash2, Plus, Eye, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserService } from '@/services/UserService';
import { BillService } from '@/services/BillService';
import { EventService } from '@/services/EventService';
import { FinancialInfoService } from '@/services/FinancialInfoService';
import { UserSettings } from '@/types/bill';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DevPanelProps {
  onClose: () => void;
  onDataChange: () => void;
}

const DevPanel = ({ onClose, onDataChange }: DevPanelProps) => {
  const [settings, setSettings] = useState(UserService.getSettings());
  const [showStorage, setShowStorage] = useState(false);

  const handleUserTypeChange = (userType: UserSettings['userType']) => {
    UserService.setUserType(userType);
    setSettings(UserService.getSettings());
    onDataChange();
  };

  const handleToggleEvents = () => {
    const newSettings = UserService.saveSettings({ 
      hasEventsAccess: !settings.hasEventsAccess 
    });
    setSettings(newSettings);
  };

  const handleClearData = () => {
    UserService.clearAllData();
    EventService.clearAllEvents();
    FinancialInfoService.clearAll();
    setSettings(UserService.getSettings());
    onDataChange();
  };

  const handleInjectBills = () => {
    BillService.injectTestBills(5);
    onDataChange();
  };

  const handleInjectEvents = () => {
    EventService.injectTestEvents(2);
    onDataChange();
  };

  const handleInjectFinancial = () => {
    FinancialInfoService.injectTestData();
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
        {/* User Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            User Type
          </label>
          <Select value={settings.userType} onValueChange={handleUserTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anonymous">Anonymous</SelectItem>
              <SelectItem value="free">Free User (25 bills)</SelectItem>
              <SelectItem value="paid">Paid User (unlimited)</SelectItem>
              <SelectItem value="accountant">Accountant View</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Events Access Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Events Access</span>
          <Button
            variant={settings.hasEventsAccess ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleEvents}
          >
            {settings.hasEventsAccess ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {/* Inject Test Bills */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleInjectBills}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Inject 5 Test Bills
        </Button>

        {/* Inject Test Events */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleInjectEvents}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Inject 2 Test Events
        </Button>


        {/* Inject Financial Data */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleInjectFinancial}
          className="w-full"
        >
          <Building className="w-4 h-4 mr-2" />
          Inject Financial Data
        </Button>

        {/* Re-run access migration */}
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem('billvie_grants_migrated_v2');
              window.location.reload();
            }}
            className="w-full"
          >
            Re-run access migration
          </Button>
          <p className="text-xs text-muted-foreground">
            Reads billvie_shares and rebuilds grants. Legacy data is never deleted.
          </p>
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
