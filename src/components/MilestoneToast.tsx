import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type Toast = { id: number; message: string };

let counter = 0;
const listeners = new Set<(toast: Toast) => void>();

export function showMilestoneToast(message: string) {
  const toast = { id: ++counter, message };
  listeners.forEach((fn) => fn(toast));
}

export function MilestoneToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => remove(toast.id), 4000);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [remove]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto bg-card border border-border rounded-xl shadow-lg px-4 py-3 max-w-sm flex items-start gap-3"
          >
            <p className="text-sm text-foreground flex-1">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="p-0.5 rounded-full hover:bg-muted flex-shrink-0"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
