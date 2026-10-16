import React, { useState } from 'react';
import {
  Sparkles,
  Filter,
  Search,
  User,
  ArrowRight,
  Clock,
  Calendar,
  ShoppingBag,
  Check,
  Info,
  TrendingUp,
  Award,
  ChevronRight,
  Layers,
  Utensils
} from 'lucide-react';
import FoodCard from '../components/FoodCard';

export default function RecommendationView({
  recommendations = [],
  likelyNextOrder = null,
  frequentOrders = [],
  customer = null,
  onOrderFood,
  onNavigate
}) {
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderedMap, setOrderedMap] = useState({});

  // Extract unique cuisines and categories from recommendations
  const cuisines = ['All', ...new Set(recommendations.map((item) => item.cuisine).filter(Boolean))];
  const categories = ['All', ...new Set(recommendations.map((item) => item.category).filter(Boolean))];

  // Filter recommendations
  const filteredItems = recommendations.filter((item) => {
    const matchesCuisine = selectedCuisine === 'All' || item.cuisine === selectedCuisine;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.food_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCuisine && matchesCategory && matchesSearch;
  });

  const handleQuickOrder = (food) => {
    if (!food) return;
    setOrderedMap((prev) => ({ ...prev, [food.food_id]: true }));
    if (onOrderFood) {
      onOrderFood(food);
    }
    setTimeout(() => {
      setOrderedMap((prev) => ({ ...prev, [food.food_id]: false }));
    }, 2000);
  };

  // Helper for Order Source Badges
  const renderSourceBadges = (sources = {}) => {
    if (!sources || Object.keys(sources).length === 0) {
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
          Project App: 1 order
        </span>
      );
    }

    return Object.entries(sources).map(([sourceName, count]) => {
      let colorStyle = {
        background: 'rgba(99, 102, 241, 0.18)',
        color: '#a5b4fc',
        border: '1px solid rgba(99, 102, 241, 0.4)'
      };

      const s = sourceName.toLowerCase();
      if (s.includes('swiggy')) {
        colorStyle = {
          background: 'rgba(249, 115, 22, 0.18)',
          color: '#fb923c',
          border: '1px solid rgba(249, 115, 22, 0.4)'
        };
      } else if (s.includes('zomato')) {
        colorStyle = {
          background: 'rgba(239, 68, 68, 0.18)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.4)'
        };
      }

      return (
        <span
          key={sourceName}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            ...colorStyle
          }}
        >
          {sourceName}: {count} {count === 1 ? 'order' : 'orders'}
        </span>
      );
    });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* =========================================================================
          TOP BANNER: PERSONALIZED HEADER / LOGIN PROMPT
      ========================================================================= */}
      {customer ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(99, 102, 241, 0.08))',
          border: '1px solid rgba(249, 115, 22, 0.35)',
          borderRadius: '14px',
          padding: '16px 24px',
          marginBottom: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
            }}>
              {customer.name ? customer.name.charAt(0) : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: 800 }}>
                  Personalized for {customer.name}
                </span>
                <span className="badge badge-primary" style={{ fontSize: '0.74rem' }}>
                  {customer.preferences} Cuisine
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
                Mobile: {customer.phone || 'N/A'} • Location: {customer.location || 'Local'} • Customer ID #{customer.customer_id}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.76rem', color: '#cbd5e1', background: 'rgba(15, 23, 42, 0.6)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              Historical Orders: {frequentOrders.reduce((sum, item) => sum + item.order_count, 0)} across Swiggy, Zomato & Project App
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '14px',
          padding: '16px 24px',
          marginBottom: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <User size={22} color="#818cf8" />
            <div>
              <div style={{ fontSize: '0.92rem', color: '#f8fafc', fontWeight: 700 }}>
                Viewing Catalog AI Recommendations
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Log in with your registered mobile number in the Customer Portal to see dishes frequently ordered by you and your personalized Next Order prediction!
              </div>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('customer')}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              Customer Mobile Login <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 1: FREQUENTLY ORDERED BY THE CUSTOMER
      ========================================================================= */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <TrendingUp size={22} color="#f97316" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Frequently Ordered By You
              </h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
              Your most frequently ordered dishes from your previous food orders.
            </p>
          </div>
          {customer && frequentOrders.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Grouped by food item • Sorted by highest order frequency
            </span>
          )}
        </div>

        {/* Customer Not Logged In */}
        {!customer ? (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', borderRadius: '14px' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: '0 0 14px 0' }}>
              Please log in with your mobile number to view dishes frequently ordered by you.
            </p>
            {onNavigate && (
              <button onClick={() => onNavigate('customer')} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                Log In to View Your Frequent Orders <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : frequentOrders.length === 0 ? (
          /* Customer Logged In But No Historical Orders */
          <div className="glass-card" style={{
            padding: '36px 24px',
            textAlign: 'center',
            borderRadius: '14px',
            border: '1px dashed rgba(255, 255, 255, 0.15)'
          }}>
            <Utensils size={36} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#cbd5e1', margin: '0 0 6px 0' }}>
              No previous order history available.
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', maxWidth: '520px', margin: '0 auto 16px auto' }}>
              As you place orders or an administrator imports your historical dining logs, your most repeated favorites and ordering sources (Swiggy, Zomato, Project App) will appear here.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#f97316' }}>
              <Sparkles size={14} /> FoodAI is currently recommending dishes based on your registered cuisine preference ({customer.preferences})
            </div>
          </div>
        ) : (
          /* Frequent Orders Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {frequentOrders.map((item, idx) => {
              const isOrdered = orderedMap[item.food_id];
              return (
                <div
                  key={item.food_id || idx}
                  className="glass-card glass-card-interactive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Food Image with Rank Badge */}
                  <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                      alt={item.food_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Rank Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      backdropFilter: 'blur(6px)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#f97316',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: '1px solid rgba(249, 115, 22, 0.4)'
                    }}>
                      <Award size={13} /> #{idx + 1} Most Ordered
                    </div>

                    {/* Price Badge */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      backdropFilter: 'blur(6px)',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: '#f97316'
                    }}>
                      ₹{item.price || 220}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Title & Frequency */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                          {item.food_name}
                        </h3>
                        <span style={{
                          background: 'rgba(249, 115, 22, 0.15)',
                          color: '#f97316',
                          border: '1px solid rgba(249, 115, 22, 0.35)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}>
                          {item.order_count} {item.order_count === 1 ? 'order' : 'orders'}
                        </span>
                      </div>

                      {/* Category & Cuisine Tags */}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px' }}>
                          {item.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px' }}>
                          {item.cuisine}
                        </span>
                        {item.total_quantity > item.order_count && (
                          <span style={{ fontSize: '0.72rem', background: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>
                            Qty: {item.total_quantity}
                          </span>
                        )}
                      </div>

                      {/* Source Breakdown Box */}
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Order Source Breakdown
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {renderSourceBadges(item.sources)}
                        </div>
                      </div>

                      {/* Last Ordered Timestamp */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '14px' }}>
                        <Calendar size={13} color="#f97316" />
                        <span>
                          Last ordered: <strong>{item.last_order_date || 'Recent'}</strong>
                          {item.last_order_days_ago ? ` (${item.last_order_days_ago})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Order Now Button */}
                    <button
                      onClick={() => handleQuickOrder(item)}
                      className={`btn ${isOrdered ? 'btn-accent' : 'btn-primary'}`}
                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '8px' }}
                    >
                      {isOrdered ? (
                        <>
                          <Check size={15} /> Added to Basket!
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={15} /> Order Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 2: LIKELY NEXT ORDER
      ========================================================================= */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <Sparkles size={22} color="#f97316" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Likely Next Order
              </h2>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
              Predicted based on your repeat order frequency, intervals, recency, and cuisine preferences.
            </p>
          </div>
          {likelyNextOrder?.confidence_level && (
            <span className="badge badge-warning" style={{ fontSize: '0.74rem' }}>
              {likelyNextOrder.confidence_level}
            </span>
          )}
        </div>

        {likelyNextOrder && likelyNextOrder.has_prediction ? (
          <div className="glass-card" style={{
            padding: '24px 28px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.98))',
            border: '1px solid rgba(249, 115, 22, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(249, 115, 22, 0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              {/* Food Info & Visual */}
              <div style={{ display: 'flex', gap: '22px', alignItems: 'center', flexWrap: 'wrap' }}>
                <img
                  src={likelyNextOrder.image_url || "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80"}
                  alt={likelyNextOrder.food_name}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid rgba(249, 115, 22, 0.5)'
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                      Predicted Next Order
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>
                      {likelyNextOrder.confidence_level}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                    {likelyNextOrder.food_name}
                  </h3>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                    <span>{likelyNextOrder.cuisine}</span>
                    <span>•</span>
                    <span>{likelyNextOrder.category}</span>
                    <span>•</span>
                    <span style={{ color: '#f97316', fontWeight: 700 }}>₹{likelyNextOrder.price || 240}</span>
                    {likelyNextOrder.order_count > 0 && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#cbd5e1' }}>
                          <strong>{likelyNextOrder.order_count}</strong> previous orders
                        </span>
                      </>
                    )}
                    {likelyNextOrder.last_ordered_days_ago && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#cbd5e1' }}>
                          Last ordered {likelyNextOrder.last_ordered_days_ago}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Sources pill row if present */}
                  {likelyNextOrder.order_sources && Object.keys(likelyNextOrder.order_sources).length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Sources:</span>
                      {renderSourceBadges(likelyNextOrder.order_sources)}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleQuickOrder(likelyNextOrder)}
                className={`btn ${orderedMap[likelyNextOrder.food_id] ? 'btn-accent' : 'btn-primary'}`}
                style={{ padding: '12px 24px', fontSize: '0.9rem', gap: '8px', minWidth: '160px' }}
              >
                {orderedMap[likelyNextOrder.food_id] ? (
                  <>
                    <Check size={18} /> Added to Basket!
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} /> Order Now
                  </>
                )}
              </button>
            </div>

            {/* Why Box */}
            <div style={{
              marginTop: '20px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(249, 115, 22, 0.08)',
              border: '1px solid rgba(249, 115, 22, 0.25)'
            }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>
                Why:
              </div>
              <p style={{ fontSize: '0.84rem', color: '#e2e8f0', margin: 0, lineHeight: 1.5 }}>
                "{likelyNextOrder.reason}"
              </p>
            </div>

            {/* Predictive Factors */}
            {likelyNextOrder.factors && likelyNextOrder.factors.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Predictive Signals:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', marginTop: '8px' }}>
                  {likelyNextOrder.factors.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.78rem',
                      color: '#cbd5e1',
                      background: 'rgba(15, 23, 42, 0.6)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Cold start or not logged in */
          <div className="glass-card" style={{
            padding: '24px 28px',
            borderRadius: '14px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Clock size={20} color="#818cf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {customer ? "Awaiting Customer Order History" : "Mobile Login Required"}
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '0 0 12px 0' }}>
              {likelyNextOrder?.reason || "No previous order history available. As you place orders or an administrator imports past dining records, FoodAI analyzes repeat purchase frequencies, time-of-day habits, and interval cycles to predict your likely next order."}
            </p>
            {customer && likelyNextOrder?.food_name && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(99, 102, 241, 0.12)',
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: '0.8rem',
                color: '#cbd5e1'
              }}>
                <Sparkles size={14} color="#818cf8" />
                <span>Suggested profile discovery item: <strong>{likelyNextOrder.food_name}</strong> ({likelyNextOrder.cuisine})</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3: RECOMMENDED FOR YOU (WITH FILTER & SEARCH)
      ========================================================================= */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
              Explainable AI Engine
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Sparkles size={22} color="#f97316" /> Recommended For You
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Dynamically generated based on customer profiles, previous orders, food preferences, and historical dining patterns.
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search food item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#151c2e',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px 10px 36px',
                color: '#f8fafc',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="glass-card" style={{ padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8' }}>
            <Filter size={16} color="#f97316" /> Filter By:
          </div>

          {/* Cuisine Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Cuisine:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {cuisines.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCuisine(c)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedCuisine === c ? '#f97316' : '#1e293b',
                    color: selectedCuisine === c ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Recommended Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
              No food items match the selected filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
            {filteredItems.map((food) => (
              <FoodCard key={food.food_id} food={food} onOrder={onOrderFood} />
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 4: AI RECOMMENDATION REASON (SYNTHESIS & EXPLAINABILITY)
      ========================================================================= */}
      <section style={{ marginBottom: '24px' }}>
        <div className="glass-card" style={{
          padding: '24px 28px',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Info size={22} color="#818cf8" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              AI Recommendation Reason
            </h2>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
            Personalized explanation calculated specifically for {customer ? customer.name : 'the customer'} using verified order records and affinity signals.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px'
          }}>
            {customer && frequentOrders.length > 0 ? (
              <>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '14px 16px'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f97316', marginBottom: '4px' }}>
                    Frequent Reorder Habits
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    Frequently ordered by you — <strong>{frequentOrders[0]?.order_count}</strong> previous orders for {frequentOrders[0]?.food_name}.
                  </div>
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '14px 16px'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                    Multi-Platform Order Signals
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    {frequentOrders[0]?.sources && Object.keys(frequentOrders[0].sources).length > 1
                      ? `Frequently ordered across ${Object.keys(frequentOrders[0].sources).join(' and ')} and matches your ${customer.preferences} cuisine preference.`
                      : `Recommended based on your recent ${Object.keys(frequentOrders[0]?.sources || {})[0] || 'dining'} order history.`}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '14px 16px'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a855f7', marginBottom: '4px' }}>
                    Menu Companion Affinity
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    Similar to your frequently ordered dishes ({frequentOrders[0]?.food_name}) and aligned with your {customer.preferences} preference.
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '14px 16px',
                gridColumn: '1 / -1'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', marginBottom: '4px' }}>
                  Cold-Start Recommendation Logic
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                  {customer ? (
                    <>
                      Recommendations are currently generated from your registered profile preferences ({customer.preferences} Cuisine), demographic location ({customer.location}), and top-rated interaction data from the Food.com recipe dataset. As you place orders or an administrator imports historical dining data, your personalized order habits will drive tailored predictions.
                    </>
                  ) : (
                    <>
                      Catalog recommendations are currently generated from global customer favorites and top-rated Food.com recipes. Log in with your mobile number to view customized explanations.
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transparent Data Note */}
          <div style={{ marginTop: '16px', fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={13} />
            <span>
              Orders sourced from your verified dining history (Swiggy, Zomato, Project App records stored in the FoodAI database). FoodAI does not access private accounts or scrape third-party platforms.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
