import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DemoIntroModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-3">The Reyes-Whitfield Household</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Claire and her husband Mark manage their own life together, and they help keep things
              organized for Claire's mom, Eleanor, who's 78 and lives on her own nearby. Click around
              and see what they've put together.
            </p>
            <Button onClick={onClose} className="btn-hero w-full">
              Take a look
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoIntroModal;
