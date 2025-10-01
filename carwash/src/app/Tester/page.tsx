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
      
      // Auto close after 4 seconds
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
      return <CheckCircle className="h-5 w-5 text-island-success" />;
    } else {
      return <XCircle className="h-5 w-5 text-island-error" />;
    }
  };

  const getMethodIcon = () => {
    if (method === 'cash') {
      return <Banknote className="h-4 w-4 text-white/80" />;
    }
    return <CreditCard className="h-4 w-4 text-white/80" />;
  };

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none">
      <div
        className={`
          bg-island-bg backdrop-blur-xl rounded-full text-white
          transition-all duration-500 ease-out shadow-2xl border border-white/10
          ${isExpanded ? 'px-6 py-4 min-w-[320px]' : 'px-4 py-2 min-w-[200px]'}
        `}
      >
        <div className="flex items-center gap-3">
          {getIcon()}
          
          <div className="flex-1 min-w-0">
            <div className="font-semibold font-rubik text-sm truncate">
              {message}
            </div>
            
            {isExpanded && amount && (
              <div className="flex items-center gap-2 mt-1">
                {getMethodIcon()}
                <span className="text-xs text-white/70">
                  {formatIDR(amount)} • {method?.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {type === 'success' && (
            <div className="w-2 h-2 rounded-full bg-island-success animate-pulse"></div>
          )}
          {type === 'error' && (
            <div className="w-2 h-2 rounded-full bg-island-error animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );
}