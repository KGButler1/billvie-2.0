import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FabProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

const Fab = ({ onClick, icon }: FabProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="fab"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon ?? <Plus className="w-6 h-6" />}
    </motion.button>
  );
};

export default Fab;
