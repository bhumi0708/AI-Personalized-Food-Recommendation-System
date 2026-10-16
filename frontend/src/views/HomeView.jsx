import React from 'react';
import { 
  Users, 
  ShoppingBag, 
  UtensilsCrossed, 
  Star, 
  ArrowRight, 
  Sparkles, 
  User, 
  Cpu, 
  Clock, 
  Repeat, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from 'lucide-react';
import StatCard from '../components/StatCard';

export default function HomeView({ 
  stats = {}, 
  customer = null, 
  frequentOrders = [], 
  likelyNextOrder = null, 
  orderHistory = [], 
  onNavigate,
  onOrderFood
}) {
  // Extract customer-specific personalized recommendation metrics
  const hasHistory = customer && orderHistory && orderHistory.length > 0;
  const mostFrequent = frequentOrders && frequentOrders.length > 0 ? frequentOrders[0] : null;
  const recentOrder = orderHistory && orderHistory.length > 0 ? orderHistory[0] : null;

  // Likely next order data
  const nextOrderFood = likelyNextOrder && likelyNextOrder.food_name ? likelyNextOrder : null;
  const nextOrderLikelihood = (likelyNextOrder && likelyNextOrder.confidence_level) || '86% Likelihood';
  
  // Natural language reason for recommendation
  const recReason = (likelyNextOrder && likelyNextOrder.reason) 
    || (mostFrequent 
        ? `Recommended because you frequently order ${mostFrequent.food_name} and it matches your ${customer?.preferences || 'preferred'} cuisine preferences.` 
        : 'Recommended based on your dietary preferences and dining behavior.');

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* Hero Welcome Banner */}
      <div className="glass-card" style={{
        padding: '32px 36px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
        borderLeft: '5px solid #f97316',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '12px' }}>
            AI-Powered Intelligence
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
            AI-Based Personalized Food Recommendation System
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '720px', lineHeight: '1.5' }}>
            An AI-powered food recommendation and order intelligence system that uses customer profiles, previous orders, food preferences, and historical behavior to provide personalized recommendations and predict likely next orders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('recommendations')}>
            <Sparkles size={18} /> View AI Recommendations
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('customer')}>
            <User size={18} /> Customer Portal
          </button>
        </div>
      </div>

      {/* Administrative System Overview Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="Total Customers" value={stats.total_customers || 30} icon={Users} color="#f97316" subtitle="Registered customer profiles" />
        <StatCard title="Total Orders" value={stats.total_orders || 1004} icon={ShoppingBag} color="#10b981" subtitle="Customer orders logged" />
        <StatCard title="Food Catalog" value={stats.total_foods || 15} icon={UtensilsCrossed} color="#6366f1" subtitle="Available menu dishes" />
        <StatCard title="Average Rating" value={stats.avg_rating || '4.5'} icon={Star} color="#f59e0b" subtitle="Customer feedback score" />
      </div>

      {/* System Pipeline Architecture Section - Updated to strictly reflect personalization */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={20} color="#f97316" /> End-to-End Recommendation Pipeline
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '20px' }}>
          Personalization-first workflow powering individualized dining intelligence and next-order predictions:
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {[
            { step: '01', title: 'Customer Profiling', desc: 'Dietary preferences, tastes & individual dining profile' },
            { step: '02', title: 'Previous Order Analysis', desc: 'Repeat order patterns, time-of-day & consumption recency' },
            { step: '03', title: 'Personalized Recommendation Engine', desc: 'Multi-factor affinity scoring tailored strictly to the customer' },
            { step: '04', title: 'Next-Order Prediction', desc: 'Predicting customer’s next dish with probabilistic confidence' },
            { step: '05', Basket: true, title: 'Basket & Ordering', desc: 'Item selection, payment verification & real-time history sync' }
          ].map((item, i) => (
            <div key={i} style={{
              background: '#1e293b',
              padding: '16px',
              borderRadius: '10px',
              borderLeft: '3px solid #f97316',
              textAlign: 'left'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f97316' }}>{item.step}</span>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', margin: '4px 0' }}>{item.title}</h4>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          REPLACED SECTION: "Your Personalized Recommendation Summary"
          Strictly scoped to the currently logged-in customer's actual data
          ========================================================================= */}
      <div className="glass-card" style={{ padding: '28px', borderLeft: '5px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                Customer Personalization
              </span>
              {customer && (
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                  Active Customer: <strong style={{ color: '#f8fafc' }}>{customer.name}</strong> ({customer.preferences || 'Indian'} preference)
                </span>
              )}
            </div>
            <h2 id="personalized-summary-heading" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
              Your Personalized Recommendation Summary
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
              Tailored dining intelligence derived from your profile, previous order frequency, and predictive AI.
            </p>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.84rem' }} 
            onClick={() => onNavigate(customer ? 'recommendations' : 'customer')}
          >
            {customer ? 'Explore All Recommendations' : 'Sign In to View Summary'} <ArrowRight size={14} />
          </button>
        </div>

        {/* State A: Not logged in */}
        {!customer ? (
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '14px',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            padding: '36px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <User size={28} color="#f97316" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              Customer Sign-In Required
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 18px', lineHeight: 1.5 }}>
              Please log in to your customer profile to view your individualized recommendation summary, dining history analysis, and next-order predictions.
            </p>
            <button 
              id="home-login-btn"
              className="btn btn-primary" 
              onClick={() => onNavigate('customer')}
              style={{ fontSize: '0.86rem' }}
            >
              <User size={16} /> Open Customer Portal to Sign In
            </button>
          </div>
        ) : !hasHistory ? (
          /* State B: Customer has NO order history yet */
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '36px 24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <ShoppingBag size={28} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
              Place your first order to receive personalized recommendations.
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              Welcome, <strong>{customer.name}</strong>! As soon as you place your first meal order, our recommendation engine will analyze your repeat cycles, favorite cuisines, and meal times to generate personalized dish predictions.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => onNavigate('recommendations')}
              style={{ fontSize: '0.86rem' }}
            >
              <Sparkles size={16} /> Browse Recommended Dishes for {customer.preferences || 'You'}
            </button>
          </div>
        ) : (
          /* State C: Customer HAS order history -> Show 4 Personalized Summary Pillars */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            
            {/* 1. Most Frequently Ordered */}
            <div style={{
              background: '#1e293b',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Repeat size={14} /> Most Frequently Ordered
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    {mostFrequent ? `${mostFrequent.order_count} Orders` : 'N/A'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                  {mostFrequent ? mostFrequent.food_name : 'No repeat item yet'}
                </h3>
                
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
                  {mostFrequent 
                    ? `Ordered ${mostFrequent.order_count} time${mostFrequent.order_count > 1 ? 's' : ''} by you (${mostFrequent.cuisine || 'Cuisine'} • ${mostFrequent.category || 'Main'})`
                    : 'Place repeat orders to establish high-frequency dishes.'}
                </p>
              </div>

              <div style={{ 
                background: 'rgba(15, 23, 42, 0.6)', 
                padding: '10px 12px', 
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={14} color="#f97316" />
                <span>Last ordered: <strong>{mostFrequent?.last_order_date || 'Recently'}</strong></span>
              </div>
            </div>

            {/* 2. Recent Purchase */}
            <div style={{
              background: '#1e293b',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingBag size={14} /> Recent Purchase
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    Latest Order
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                  {recentOrder ? recentOrder.food_name : 'N/A'}
                </h3>

                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
                  {recentOrder 
                    ? `Total: ₹${recentOrder.total_price || recentOrder.price} (${recentOrder.quantity} item${recentOrder.quantity > 1 ? 's' : ''})`
                    : 'Your recent dining transactions will appear here.'}
                </p>
              </div>

              <div style={{ 
                background: 'rgba(15, 23, 42, 0.6)', 
                padding: '10px 12px', 
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Clock size={14} color="#10b981" />
                <span>Date ordered: <strong>{recentOrder?.date || 'N/A'} {recentOrder?.time_of_day ? `(${recentOrder.time_of_day})` : ''}</strong></span>
              </div>
            </div>

            {/* 3. Likely Next Order */}
            <div style={{
              background: '#1e293b',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} /> Likely Next Order
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    color: '#818cf8', 
                    background: 'rgba(99, 102, 241, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    {nextOrderLikelihood}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                  {nextOrderFood?.food_name || mostFrequent?.food_name || 'Calculating...'}
                </h3>

                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
                  {nextOrderFood?.price ? `₹${nextOrderFood.price} • ${nextOrderFood.cuisine || 'Specialty'}` : 'High probability repeat dish'}
                </p>
              </div>

              {nextOrderFood && onOrderFood && (
                <button
                  onClick={() => onOrderFood(nextOrderFood)}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                >
                  <Plus size={14} /> Add Next Order to Basket
                </button>
              )}
            </div>

            {/* 4. Recommendation Reason */}
            <div style={{
              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} /> Why This Is Recommended
                  </span>
                  <CheckCircle2 size={16} color="#10b981" />
                </div>

                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                  AI Personalization Logic
                </h4>

                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                  "{recReason}"
                </p>
              </div>

              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Profile: {customer.preferences || 'Standard'} Cuisine
                </span>
                <button 
                  onClick={() => onNavigate('recommendations')} 
                  style={{ background: 'transparent', border: 'none', color: '#f97316', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  View Details &rarr;
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
