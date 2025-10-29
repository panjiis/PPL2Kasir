'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, CreditCard, Banknote } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error' | null;
  message: string;
  amount?: number;
  method?: string;
  onClose: () => void;
}

export default function PremiumNotification({
  type,
  message,
  amount,
  method,
  onClose,
}: NotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  if (!type) return null;

  const formatIDR = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`;

  const getIcon = () => {
    const baseClass = 'w-7 h-7';
    if (type === 'success') return <CheckCircle className={`${baseClass} text-emerald-400`} />;
    return <XCircle className={`${baseClass} text-rose-400`} />;
  };

  const getMethodIcon = () => {
    if (method === 'cash') return <Banknote className="w-4 h-4 text-white/70" />;
    return <CreditCard className="w-4 h-4 text-white/70" />;
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[80] flex justify-center"
        >
          <div
            className={`
              backdrop-blur-xl border border-white/10 shadow-2xl 
              rounded-2xl px-6 py-4 min-w-[320px] flex items-start gap-4
              ${type === 'success'
                ? 'bg-gradient-to-r from-emerald-700/80 to-emerald-600/70'
                : 'bg-gradient-to-r from-rose-700/80 to-rose-600/70'}
            `}
          >
            <div className="flex-shrink-0 mt-1">{getIcon()}</div>

            <div className="flex flex-col flex-1 text-white">
              <span className="font-medium text-base">{message}</span>

              {amount !== undefined && (
                <div className="flex items-center gap-2 text-sm text-white/80 mt-1">
                  {getMethodIcon()}
                  <span>{formatIDR(amount)} • {method?.toUpperCase()}</span>
                </div>
              )}
            </div>

            <div
              className={`w-3 h-3 mt-1 rounded-full animate-pulse ${
                type === 'success' ? 'bg-emerald-300' : 'bg-rose-300'
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
