import React, { useState, useEffect } from 'react';
import { 
  User, 
  ShoppingBag, 
  Sparkles, 
  MapPin, 
  Tag, 
  Star, 
  Phone, 
  Mail, 
  ArrowRight, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  LogOut, 
  UtensilsCrossed, 
  DollarSign, 
  Info 
} from 'lucide-react';
import FoodCard from '../components/FoodCard';
import { API_BASE } from '../config';

export default function CustomerView({ 
  customer, 
  recommendations, 
  likelyNextOrder,
  orderHistory = [],
  onOrderFood,
  onLoginSuccess,
  onLogout
}) {
  // Mobile login form state
  const [mobileInput, setMobileInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Rating simulator state
  const [ratedItem, setRatedItem] = useState('Biryani');
  const [userRating, setUserRating] = useState(5);
  const [successMsg, setSuccessMsg] = useState('');

  // Filter state for previous orders
  const [sourceFilter, setSourceFilter] = useState('All');

  const handleMobileLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    const trimmed = mobileInput.trim();
    if (!trimmed) {
      setLoginError('Please enter your registered mobile number.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: trimmed })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Exact user-friendly error required by prompt
        throw new Error(errorData.detail || 'Customer not found. Please contact the administrator to create your account.');
      }

      const data = await res.json();
      if (data && data.customer) {
        if (onLoginSuccess) {
          onLoginSuccess(data.customer);
        }
      } else {
        throw new Error('Customer not found. Please contact the administrator to create your account.');
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickDemoSelect = (samplePhone) => {
    setMobileInput(samplePhone);
    setLoginError('');
  };

  const submitRating = (e) => {
    e.preventDefault();
    setSuccessMsg(`Thank you! Rating of ${userRating} ★ submitted for ${ratedItem}.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Helper function to render Source Badge
  const renderSourceBadge = (source) => {
    const s = (source || 'Project App').toLowerCase();
    if (s.includes('swiggy')) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(249, 115, 22, 0.18)',
          color: '#fb923c',
          border: '1px solid rgba(249, 115, 22, 0.4)',
          borderRadius: '6px',
          padding: '2px 8px',
          fontSize: '0.72rem',
          fontWeight: 700
        }}>
          Swiggy
        </span>
      );
    } else if (s.includes('zomato')) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(239, 68, 68, 0.18)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '6px',
          padding: '2px 8px',
          fontSize: '0.72rem',
          fontWeight: 700
        }}>
          Zomato
        </span>
      );
    } else {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(99, 102, 241, 0.18)',
          color: '#a5b4fc',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '6px',
          padding: '2px 8px',
          fontSize: '0.72rem',
          fontWeight: 700
        }}>
          Project App
        </span>
      );
    }
  };

  // =========================================================================
  // VIEW A: CUSTOMER NOT LOGGED IN -> SHOW MOBILE LOGIN SCREEN
  // =========================================================================
  if (!customer) {
    return (
      <div className="animate-fade-in" style={{ padding: '60px 24px', maxWidth: '520px', margin: '0 auto' }}>
        <div className="glass-card" style={{
          padding: '36px 32px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 8px 20px rgba(249, 115, 22, 0.35)'
            }}>
              <Phone size={28} color="#ffffff" />
            </div>
            <h2 id="mobile-login-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
              Welcome to FoodAI
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              Sign in with your registered mobile number to access personalized AI food recommendations & order history.
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div id="mobile-login-error" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>{loginError}</div>
            </div>
          )}

          {/* Mobile Login Form */}
          <form onSubmit={handleMobileLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label htmlFor="customer-mobile-input" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                Mobile Number
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease'
              }}>
                <span style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#f97316',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  +91
                </span>
                <input
                  id="customer-mobile-input"
                  type="tel"
                  placeholder="98765 43210"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    padding: '12px 14px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                Enter your 10-digit registered Indian mobile number
              </span>
            </div>

            <button
              id="customer-login-button"
              type="submit"
              disabled={loginLoading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                justifyContent: 'center',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '12px',
                boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)'
              }}
            >
              {loginLoading ? 'Locating Customer Profile...' : 'Login'}
            </button>
          </form>

          {/* Quick Demo Login Switcher */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
              💡 Quick Test Accounts (Pre-registered in Database):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Aarav Sharma', phone: '+91 9590078541', pref: 'Indian' },
                { name: 'Ananya Verma', phone: '+91 7837069898', pref: 'Fast Food' },
                { name: 'Rahul Dravid', phone: '+91 9097487696', pref: 'South Indian' }
              ].map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickDemoSelect(demo.phone)}
                  style={{
                    background: '#151c2e',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span>
                    <strong style={{ color: '#f8fafc' }}>{demo.name}</strong> ({demo.phone})
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                    {demo.pref}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: CUSTOMER LOGGED IN -> DISPLAY CUSTOMER DASHBOARD
  // =========================================================================
  const filteredOrders = orderHistory.filter((ord) => {
    if (sourceFilter === 'All') return true;
    return (ord.order_source || 'Project App').toLowerCase().includes(sourceFilter.toLowerCase());
  });

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* 1. CUSTOMER WELCOME BANNER & PROFILE DETAILS */}
      <div className="glass-card" style={{
        padding: '24px 30px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
        borderLeft: '5px solid #f97316'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)'
          }}>
            {customer.name ? customer.name.charAt(0) : 'U'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 id="customer-welcome-heading" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Welcome, {customer.name}
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>
                {customer.preferences} Cuisine Lover
              </span>
            </div>

            <div style={{ display: 'flex', gap: '18px', marginTop: '8px', fontSize: '0.84rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#cbd5e1' }}>
                <Phone size={14} color="#f97316" /> {customer.phone || 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#cbd5e1' }}>
                <Mail size={14} color="#38bdf8" /> {customer.email || 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={14} color="#10b981" /> {customer.location || 'Hyderabad'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Tag size={14} color="#a855f7" /> Customer ID #{customer.customer_id}
              </span>
            </div>
          </div>
        </div>

        {/* Logout / Switch User */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="btn btn-secondary"
            title="Log out or sign in with another number"
            style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px' }}
          >
            <LogOut size={15} color="#f87171" />
            <span style={{ color: '#fca5a5' }}>Logout</span>
          </button>
        )}
      </div>

      {/* 2. LIKELY NEXT ORDER (AI PREDICTION SECTION) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Sparkles size={22} color="#f97316" /> Likely Next Order
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Predicted via recency, purchase frequency, order intervals & dining patterns
          </span>
        </div>

        {likelyNextOrder && likelyNextOrder.has_prediction ? (
          <div className="glass-card" style={{
            padding: '24px 28px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 8px 25px rgba(249, 115, 22, 0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '18px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <img
                  src={likelyNextOrder.image_url || "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80"}
                  alt={likelyNextOrder.food_name}
                  style={{ width: '90px', height: '90px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(249, 115, 22, 0.4)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                      Predicted Next Order
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 700 }}>
                      {likelyNextOrder.confidence_level || 'High Confidence'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
                    {likelyNextOrder.food_name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span>{likelyNextOrder.cuisine}</span>
                    <span>•</span>
                    <span>{likelyNextOrder.category}</span>
                    <span>•</span>
                    <span style={{ color: '#f97316', fontWeight: 700 }}>₹{likelyNextOrder.price}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOrderFood && onOrderFood({ 
                  food_id: likelyNextOrder.food_id, 
                  food_name: likelyNextOrder.food_name, 
                  price: likelyNextOrder.price,
                  category: likelyNextOrder.category,
                  cuisine: likelyNextOrder.cuisine,
                  image_url: likelyNextOrder.image_url
                })}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '0.88rem' }}
              >
                Reorder {likelyNextOrder.food_name}
              </button>
            </div>

            {/* Prediction Reasoning */}
            <div style={{
              marginTop: '18px',
              padding: '14px 18px',
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f97316', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reasoning
              </div>
              <p style={{ fontSize: '0.88rem', color: '#f8fafc', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                {likelyNextOrder.reason}
              </p>

              {/* Factors */}
              {likelyNextOrder.factors && likelyNextOrder.factors.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {likelyNextOrder.factors.map((factor, i) => (
                    <span key={i} style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#a5b4fc',
                      fontSize: '0.72rem',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontWeight: 600
                    }}>
                      • {factor}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '24px 28px', textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.92rem' }}>
              {likelyNextOrder ? likelyNextOrder.reason : 'No previous orders found.'}
            </p>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              As you order dishes, FoodAI will analyze your repeat patterns and time intervals to predict your likely next order.
            </span>
          </div>
        )}
      </div>

      {/* 3. PREVIOUS ORDER HISTORY SECTION */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 id="previous-orders-heading" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <ShoppingBag size={22} color="#10b981" /> Your Previous Orders
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Historical orders permanently stored in the project database (Sources: Swiggy, Zomato, Project App)
            </span>
          </div>

          {/* Filter by Order Source */}
          {orderHistory.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '10px' }}>
              {['All', 'Swiggy', 'Zomato', 'Project App'].map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: sourceFilter === src ? '#f97316' : 'transparent',
                    color: sourceFilter === src ? '#ffffff' : '#94a3b8',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {src}
                </button>
              ))}
            </div>
          )}
        </div>

        {orderHistory.length === 0 ? (
          <div className="glass-card" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
            <UtensilsCrossed size={32} color="#64748b" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#cbd5e1', margin: '0 0 6px 0' }}>
              No previous orders found.
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
              You do not have any historical orders in the project database yet. An administrator can record past orders, or you can place an order below to start building your dining history!
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            No orders found matching source filter "{sourceFilter}".
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px' }}>Order ID</th>
                  <th style={{ padding: '12px 16px' }}>Food Name</th>
                  <th style={{ padding: '12px 16px' }}>Category & Cuisine</th>
                  <th style={{ padding: '12px 16px' }}>Order Source</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Quantity</th>
                  <th style={{ padding: '12px 16px' }}>Amount</th>
                  <th style={{ padding: '12px 16px' }}>Payment Method</th>
                  <th style={{ padding: '12px 16px' }}>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, idx) => (
                  <tr key={ord.order_id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f97316' }}>
                      #{ord.order_id}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f8fafc' }}>
                      {ord.food_name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      <span>{ord.category}</span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>{ord.cuisine}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {renderSourceBadge(ord.order_source)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: '0.8rem' }}>
                      {ord.date} {ord.time_of_day ? `(${ord.time_of_day})` : ''}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {ord.quantity}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                      ₹{ord.total_price || ord.price}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontSize: '0.8rem', fontWeight: 600 }}>
                      {ord.payment_method || 'UPI'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        background: (ord.payment_status === 'Pending' || (ord.payment_method || '').toLowerCase() === 'cash on delivery')
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                        color: (ord.payment_status === 'Pending' || (ord.payment_method || '').toLowerCase() === 'cash on delivery')
                          ? '#fbbf24'
                          : '#34d399',
                        border: (ord.payment_status === 'Pending' || (ord.payment_method || '').toLowerCase() === 'cash on delivery')
                          ? '1px solid rgba(245, 158, 11, 0.3)'
                          : '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {ord.payment_status || ((ord.payment_method || '').toLowerCase() === 'cash on delivery' ? 'Pending' : 'Completed')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. AI PERSONALIZED RECOMMENDATIONS SECTION */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 id="ai-recommendations-heading" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Sparkles size={22} color="#f97316" /> AI Recommendations for You
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {orderHistory.length > 0 
                ? 'Personalized from your order frequency, repeats, and dining behavior'
                : 'Generated from your profile preference and Food.com recipe interaction data'}
            </span>
          </div>
        </div>

        {recommendations && recommendations.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
            {recommendations.slice(0, 6).map((food) => (
              <FoodCard key={food.food_id} food={food} onOrder={onOrderFood} />
            ))}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            Generating personalized food recommendations...
          </div>
        )}
      </div>

      {/* 5. RATING & FEEDBACK SIMULATOR FORM */}
      <div className="glass-card" style={{ padding: '24px 28px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={18} color="#f59e0b" /> Submit Food Item Rating
        </h3>

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        <form onSubmit={submitRating} style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Select Food Item:</label>
            <select
              value={ratedItem}
              onChange={(e) => setRatedItem(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <option value="Biryani">Biryani</option>
              <option value="Raita">Raita</option>
              <option value="Chicken 65">Chicken 65</option>
              <option value="Pizza">Pizza</option>
              <option value="Burger">Burger</option>
              <option value="Fries">Fries</option>
              <option value="Dosa">Dosa</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Rating Score (1 to 5):</label>
            <select
              value={userRating}
              onChange={(e) => setUserRating(Number(e.target.value))}
              style={{ background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <option value={5}>5 ★★★★★ (Excellent)</option>
              <option value={4}>4 ★★★★☆ (Good)</option>
              <option value={3}>3 ★★★☆☆ (Average)</option>
              <option value={2}>2 ★★☆☆☆ (Below Average)</option>
              <option value={1}>1 ★☆☆☆☆ (Poor)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '18px' }}>
            Submit Rating
          </button>
        </form>
      </div>
    </div>
  );
}
