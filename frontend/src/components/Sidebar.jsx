import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Sparkles, 
  ShieldCheck,
  ShoppingBag,
  Lock
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  basketItemCount = 0, 
  onOpenBasket,
  userRole = 'customer',
  onRequestAdminLogin
}) {
  const navItems = [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'customer', label: 'Customer Portal', icon: User },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles },
    { id: 'basket', label: 'My Basket', icon: ShoppingBag, isBasket: true },
    { id: 'admin', label: 'Admin Panel', icon: ShieldCheck, isAdmin: true },
  ];

  const handleNavClick = (item) => {
    if (item.isBasket && onOpenBasket) {
      onOpenBasket();
      return;
    }

    if (item.isAdmin && userRole !== 'admin') {
      if (onRequestAdminLogin) {
        onRequestAdminLogin();
      }
      return;
    }

    setActiveTab(item.id);
  };

  return (
    <aside style={{
      width: '260px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand Logo Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)'
        }}>
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
            FoodAI
          </h1>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
            AI Food Intelligence
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLockedAdmin = item.isAdmin && userRole !== 'admin';

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                margin: '4px 0',
                borderRadius: '12px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.05))' : 'transparent',
                color: isActive ? '#f97316' : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
                borderLeft: isActive ? '3px solid #f97316' : '3px solid transparent'
              }}
              title={isLockedAdmin ? 'Administrator sign-in required' : item.label}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={19} color={isActive ? '#f97316' : '#94a3b8'} />
                <span>{item.label}</span>
              </div>

              {item.isBasket && basketItemCount > 0 && (
                <span style={{
                  background: '#f97316',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  padding: '2px 7px'
                }}>
                  {basketItemCount}
                </span>
              )}

              {isLockedAdmin && (
                <Lock size={14} color="#64748b" title="Admin Auth Required" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div>AI Recommendation Engine v1.0</div>
        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          Recommendation Service Active
        </div>
      </div>
    </aside>
  );
}
