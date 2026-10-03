import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface ToastContextType {
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    // Schedule state update outside current execution stack to prevent
    // 'Cannot update a component while rendering a different component' errors
    setTimeout(() => {
      setToastMessage(msg);
    }, 0);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToastMessage(null), 3200);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [toastMessage]);

  return (
    <ToastContext.Provider value={{ toastMessage, showToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
