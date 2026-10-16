import React, { useState } from 'react';
import { Star, Sparkles, Info, ShoppingCart, Check } from 'lucide-react';

export default function FoodCard({ food, onOrder }) {
  const [showReasons, setShowReasons] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const handleOrder = () => {
    setOrdered(true);
    if (onOrder) onOrder(food);
    setTimeout(() => setOrdered(false), 2000);
  };

  return (
    <div className="glass-card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Food Image Header */}
      <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
        <img
          src={food.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
          alt={food.food_name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        {/* Recommendation Type Tag */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} />
            {food.recommendation_type || food.cuisine}
          </span>
        </div>

        {/* Price Badge */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(6px)',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 800,
          color: '#f97316'
        }}>
          ₹{food.price}
        </div>
      </div>

      {/* Card Content Body */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              {food.food_name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>
              <Star size={14} fill="#fbbf24" color="#fbbf24" />
              <span>{food.rating || 4.5}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px' }}>
              {food.category}
            </span>
            <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: '4px' }}>
              {food.cuisine}
            </span>
          </div>

          {/* Explainable AI Reason Dropdown/Box */}
          {food.reasons && food.reasons.length > 0 && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '10px',
              padding: '10px 12px',
              margin: '8px 0 14px 0'
            }}>
              <div 
                onClick={() => setShowReasons(!showReasons)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} /> AI Recommendation Reason
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {showReasons ? 'Hide' : 'Why?'}
                </span>
              </div>

              {showReasons && (
                <ul style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '0.76rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {food.reasons.map((r, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleOrder}
          className={`btn ${ordered ? 'btn-accent' : 'btn-primary'}`}
          style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
        >
          {ordered ? (
            <>
              <Check size={16} /> Added to Basket!
            </>
          ) : (
            <>
              <ShoppingCart size={16} /> Order Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}
