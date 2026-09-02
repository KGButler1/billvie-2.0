import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

export interface FabMenuChoice {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FabMenuProps {
  choices: FabMenuChoice[];
  onOpenChange?: (isOpen: boolean) => void;
}

const FabMenu = ({ choices, onOpenChange }: FabMenuProps) => {
  const [open, setOpen] = useState(false);

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const handleChoice = (choice: FabMenuChoice) => {
    choice.onClick();
    toggle(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <AnimatePresence>
        {open &&
          choices.map((choice, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.05 } }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              onClick={() => handleChoice(choice)}
              className="absolute right-0 flex items-center gap-2 rounded-full bg-secondary pl-3 pr-4 h-10 shadow-lg"
              style={{ bottom: `${16 + i * 56}px` }}
            >
              <span className="flex items-center justify-center w-6 h-6">
                {choice.icon}
              </span>
              <span className="text-sm font-medium whitespace-nowrap">{choice.label}</span>
            </motion.button>
          ))}
      </AnimatePresence>

      <motion.button
        onClick={() => toggle(!open)}
        className="fab relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: open ? 45 : 0 }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default FabMenu;
