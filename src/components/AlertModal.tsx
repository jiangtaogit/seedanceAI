import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2 } from 'lucide-react';

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'error' | 'success';
}

// ============ Global state for alert modal ============

let _setAlert: ((alert: AlertOptions | null) => void) | null = null;

export function showAlert(message: string, title?: string, type?: 'info' | 'error' | 'success') {
  if (_setAlert) {
    _setAlert({ title: title || (type === 'error' ? '错误' : '提示'), message, type: type || 'info' });
  }
}

export function AlertModalProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    _setAlert = setAlert;
    return () => { _setAlert = null; };
  }, []);

  const handleClose = useCallback(() => {
    setAlert(null);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (alert?.message) {
      await navigator.clipboard.writeText(alert.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [alert]);

  // Close on Escape
  useEffect(() => {
    if (!alert) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [alert, handleClose]);

  const typeColors = {
    info: 'border-accent/30',
    error: 'border-error/30',
    success: 'border-success/30',
  };

  const typeIconColors = {
    info: 'text-accent',
    error: 'text-error',
    success: 'text-success',
  };

  return (
    <>
      {children}
      {createPortal(
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
              onClick={handleClose}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-lg glass-nav rounded-2xl overflow-hidden border-t-2 ${typeColors[alert.type || 'info']}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <h3 className={`font-heading font-semibold text-base ${typeIconColors[alert.type || 'info']}`}>
                    {alert.title}
                  </h3>
                  <button
                    onClick={handleClose}
                    className="p-1 hover:bg-white/[0.06] rounded-md transition-colors"
                  >
                    <X size={16} className="text-text-secondary" />
                  </button>
                </div>

                {/* Message - selectable & copyable */}
                <div className="px-5 pb-3">
                  <div className="relative group">
                    <div className="bg-bg-primary/50 border border-white/[0.06] rounded-lg p-3 text-sm text-text-primary whitespace-pre-wrap break-words select-text leading-relaxed max-h-[60vh] overflow-y-auto">
                      {alert.message}
                    </div>
                    {/* Copy button */}
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-bg-card/60 border border-white/[0.06] hover:bg-accent/10 hover:border-accent/30 transition-colors opacity-0 group-hover:opacity-100"
                      title="复制内容"
                    >
                      {copied ? (
                        <CheckCircle2 size={14} className="text-success" />
                      ) : (
                        <Copy size={14} className="text-text-secondary" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-[10px] text-success mt-1.5 text-right">已复制到剪贴板</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 pb-4">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                  >
                    {copied ? <CheckCircle2 size={12} className="text-success" /> : <Copy size={12} />}
                    {copied ? '已复制' : '复制全部'}
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-1.5 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    确定
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
