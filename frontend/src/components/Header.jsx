import React from 'react';
import { User, Shield, RefreshCw, LogOut, ShoppingBag, ShieldCheck } from 'lucide-react';

export default function Header({ 
  userRole, 
  loggedInCustomer,
  onLogout,
  onRefreshData,
  onNavigateTab,
  basketItemCount = 0,
  onOpenBasket,
  onRequestAdminSignIn
}) {
  return (
    <header style={{
      height: '70px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* System Context Title */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          AI Personalized Food Recommendation System
        </h2>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          Personalized Recommendations & Customer Order Intelligence
        </span>
      </div>

      {/* User Session & Role Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        
        {/* Scenario 1: Customer is Logged In */}
        {userRole === 'customer' && loggedInCustomer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#1e293b',
              padding: '6px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#ffffff'
              }}>
                {loggedInCustomer.name ? loggedInCustomer.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                  {loggedInCustomer.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {loggedInCustomer.phone ? `+91 ${loggedInCustomer.phone}` : `ID #${loggedInCustomer.customer_id}`}
                </div>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px', marginLeft: '4px' }}>
                {loggedInCustomer.preferences || 'Indian'}
              </span>
            </div>

            {/* Customer Basket Button */}
            <button
              id="header-basket-btn"
              onClick={onOpenBasket}
              className="btn btn-secondary"
              style={{
                position: 'relative',
                padding: '8px 14px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: basketItemCount > 0 ? 'rgba(249, 115, 22, 0.4)' : undefined,
                background: basketItemCount > 0 ? 'rgba(249, 115, 22, 0.1)' : undefined
              }}
              title="View your shopping basket"
            >
              <ShoppingBag size={16} color="#f97316" />
              <span style={{ fontWeight: 600 }}>Basket</span>
              {basketItemCount > 0 && (
                <span style={{
                  background: '#f97316',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  padding: '1px 6px',
                  marginLeft: '2px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {basketItemCount}
                </span>
              )}
            </button>

            {/* Logout Button */}
            <button
              id="header-logout-btn"
              onClick={onLogout}
              className="btn btn-secondary"
              title="Sign out of your customer account"
              style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '6px' }}
            >
              <LogOut size={14} color="#f87171" />
              <span style={{ color: '#fca5a5' }}>Logout</span>
            </button>
          </div>
        )}

        {/* Scenario 2: Admin is Logged In */}
        {userRole === 'admin' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '6px 14px',
              borderRadius: '10px',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 700
            }}>
              <ShieldCheck size={18} color="#38bdf8" />
              <span>Administrator Portal</span>
            </div>

            {/* Admin Logout Button */}
            <button
              id="header-admin-logout-btn"
              onClick={onLogout}
              className="btn btn-secondary"
              title="Sign out of Administrator Portal"
              style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '6px' }}
            >
              <LogOut size={14} color="#f87171" />
              <span style={{ color: '#fca5a5' }}>Admin Sign Out</span>
            </button>
          </div>
        )}

        {/* Refresh button */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            className="btn btn-secondary"
            title="Refresh System Data"
            style={{ padding: '8px', borderRadius: '8px' }}
          >
            <RefreshCw size={16} color="#94a3b8" />
          </button>
        )}
      </div>
    </header>
  );
}
