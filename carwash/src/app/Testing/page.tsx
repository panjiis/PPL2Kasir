'use client'
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, CreditCard, Banknote } from 'lucide-react';

interface DynamicIslandProps {
  type: 'success' | 'error' | null;
  message: string;
  amount?: number;
  method?: string;
  onClose: () => void;
}

export default function DynamicIsland({ type, message, amount, method, onClose }: DynamicIslandProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (type) {
      setIsVisible(true);
      setIsExpanded(true);
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  if (!type || !isVisible) return null;

  const formatIDR = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`;

  const getIcon = () => {
    if (type === 'success') {
      return <CheckCircle className="h-5 w-5 text-white" />;
    } else {
      return <XCircle className="h-5 w-5 text-white" />;
    }
  };

  const getMethodIcon = () => {
    if (method === 'cash') {
      return <Banknote className="h-4 w-4 text-white/80" />;
    }
    return <CreditCard className="h-4 w-4 text-white/80" />;
  };

  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-none w-full flex justify-center">
      <div
        className={`
          transition-all duration-500 ease-out shadow-2xl border-2 
          ${isExpanded ? 'px-6 py-4 min-w-[320px]' : 'px-4 py-2 min-w-[200px]'}
          rounded-full text-white flex items-center gap-3
          ${type === 'success' ? 'bg-green-600/90 border-green-700' : 'bg-red-600/90 border-red-700'}
        `}
      >
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-semibold  font-rubik text-sm truncate">
            {message}
          </div>
          {isExpanded && amount !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              {getMethodIcon()}
              <span className="text-xs text-white/80">
                {formatIDR(amount)} • {method?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full animate-pulse ${type === 'success' ? 'bg-green-300' : 'bg-red-300'}`}></div>
      </div>
    </div>
  );
}