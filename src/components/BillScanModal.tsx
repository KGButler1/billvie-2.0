import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Check, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bill, 
  BillCategory, 
  PaymentMethod, 
  RecurringInterval,
  CATEGORY_LABELS, 
  PAYMENT_METHOD_LABELS,
  RECURRING_LABELS,
} from '@/types/bill';
import { simulateAIExtraction, ExtractedBillData } from '@/utils/billCategorizer';

interface BillScanModalProps {
  onAdd: (bill: Omit<Bill, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

type Step = 'upload' | 'processing' | 'confirm';

const BillScanModal = ({ onAdd, onClose }: BillScanModalProps) => {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBillData | null>(null);
  
  // Editable fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [category, setCategory] = useState<BillCategory>('other');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
    
    // Simulate processing
    setStep('processing');
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Extract data
    const extracted = simulateAIExtraction(file.name);
    setExtractedData(extracted);
    
    // Set form fields
    setName(extracted.name);
    setAmount(extracted.amount?.toString() || '');
    if (extracted.dueDate) {
      setDueDate(extracted.dueDate.split('T')[0]);
    }
    setIsRecurring(extracted.isRecurring);
    setCategory(extracted.category);
    if (extracted.recurringInterval) {
      setRecurringInterval(extracted.recurringInterval);
    }
    
    setStep('confirm');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    onAdd({
      name: name.trim(),
      amount: amount ? parseFloat(amount) : undefined,
      dueDate: dueDate || undefined,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      category,
      paymentMethod: paymentMethod || undefined,
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
      />

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="pointer-events-auto w-full sm:max-w-lg sm:rounded-2xl bg-card rounded-t-3xl shadow-dramatic p-6 pb-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {step === 'upload' && 'Scan Bill'}
            {step === 'processing' && 'Analyzing...'}
            {step === 'confirm' && 'Confirm Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Upload a bill</p>
                <p className="text-sm text-muted-foreground">
                  Drop an image or PDF, or tap to browse
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium">Analyzing your bill...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Extracting name, amount, and due date
              </p>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Preview and Confidence */}
              <div className="flex gap-4 mb-6">
                {previewUrl && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={previewUrl} alt="Bill preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {uploadedFile?.name}
                  </p>
                  {extractedData && (
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${extractedData.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(extractedData.confidence * 100)}%
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Please verify the extracted information
                  </p>
                </div>
              </div>

              {/* Editable Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Bill Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-12 pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as BillCategory)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="recurring">Recurring bill</Label>
                  <Switch
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>

                {isRecurring && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={recurringInterval} onValueChange={(v) => setRecurringInterval(v as RecurringInterval)}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECURRING_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="btn-hero w-full mt-6"
              >
                <Check className="w-4 h-4 mr-2" />
                Add Bill
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default BillScanModal;
