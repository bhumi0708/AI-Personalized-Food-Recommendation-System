import React from 'react';
import { CheckCircle, AlertCircle, ShoppingBag, X, ArrowRight } from 'lucide-react';

export default function ToastNotification({
  toast,
  onClose,
  onViewBasket,
  onGoToLogin
}) {
  if (!toast || !toast.message) return null;

  const isError = toast.type === 'error';
  const isAuth = toast.type === 'auth';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 110,
      background: '#1e293b',
      border: `1px solid ${isError || isAuth ? 'rgba(239, 68, 68, 0.4)' : 'rgba(249, 115, 22, 0.4)'}`,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      borderRadius: '14px',
      padding: '14px 18px',
      maxWidth: '420px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      animation: 'fadeIn 0.25s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isError || isAuth ? (
            <AlertCircle size={20} color="#f87171" style={{ flexShrink: 0 }} />
          ) : (
            <CheckCircle size={20} color="#f97316" style={{ flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.3 }}>
            {toast.message}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex'
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '2px' }}>
        {isAuth ? (
          <button
            onClick={() => {
              if (onGoToLogin) onGoToLogin();
              onClose();
            }}
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            Customer Login <ArrowRight size={14} />
          </button>
        ) : (
          <>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.76rem' }}
            >
              Continue Shopping
            </button>
            <button
              onClick={() => {
                if (onViewBasket) onViewBasket();
                onClose();
              }}
              className="btn btn-primary"
              style={{ padding: '5px 12px', fontSize: '0.76rem' }}
            >
              <ShoppingBag size={14} /> View Basket
            </button>
          </>
        )}
      </div>
    </div>
  );
}
