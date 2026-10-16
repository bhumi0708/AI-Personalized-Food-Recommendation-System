import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle, 
  ArrowLeft, 
  CreditCard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Banknote,
  MapPin,
  Phone,
  User,
  AlertCircle
} from 'lucide-react';
import { API_BASE } from '../config';

export default function BasketDrawer({
  isOpen,
  onClose,
  basket = { items: [], total_items: 0, subtotal: 0, grand_total: 0 },
  customer,
  onAddToBasket,
  onUpdateQuantity,
  onRemoveItem,
  onClearBasket,
  onPlaceOrder,
  orderConfirmation,
  onClearConfirmation,
  onNavigateTab
}) {
  // Flow steps: 'basket' -> 'payment' -> 'review'
  const [step, setStep] = useState('basket');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [demoUpiId, setDemoUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Complementary recommendations state (Apriori Association Rule Mining)
  const [complementaryItems, setComplementaryItems] = useState([]);
  const [loadingComplementary, setLoadingComplementary] = useState(false);
  const [complementaryMessage, setComplementaryMessage] = useState('');

  // Reset or initialize state when opening / closing or when confirmation changes
  useEffect(() => {
    if (!isOpen) {
      setStep('basket');
      setOrderError('');
      setUpiError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (orderConfirmation) {
      setStep('confirmation');
    }
  }, [orderConfirmation]);

  useEffect(() => {
    if (customer && customer.phone) {
      setDemoUpiId(`${customer.phone}@upi`);
    } else {
      setDemoUpiId('demo.customer@okhdfcbank');
    }
  }, [customer]);

  // Fetch complementary food items using Apriori association rules whenever basket changes
  useEffect(() => {
    const fetchComplementary = async () => {
      if (!isOpen || !basket.items || basket.items.length === 0) {
        setComplementaryItems([]);
        return;
      }

      setLoadingComplementary(true);
      try {
        const foodIds = basket.items.map(i => i.food_id).filter(Boolean).join(',');
        const foodNames = basket.items.map(i => i.food_name).filter(Boolean).join(',');
        const res = await fetch(`${API_BASE}/recommendations/complementary?food_ids=${foodIds}&food_names=${encodeURIComponent(foodNames)}&limit=4`);
        if (res.ok) {
          const data = await res.json();
          setComplementaryItems(data.items || []);
          setComplementaryMessage(data.message || '');
        }
      } catch (err) {
        console.error('Error fetching complementary pairings:', err);
      } finally {
        setLoadingComplementary(false);
      }
    };

    fetchComplementary();
  }, [isOpen, basket.items]);

  if (!isOpen) return null;

  // Validate payment step before proceeding to order review
  const handleProceedToReview = () => {
    setUpiError('');
    setOrderError('');

    if (!paymentMethod) {
      setOrderError('Please select a payment method to continue.');
      return;
    }

    if (paymentMethod === 'UPI') {
      const trimmed = (demoUpiId || '').trim();
      if (!trimmed || !trimmed.includes('@')) {
        setUpiError('Please enter a valid demo UPI ID (e.g., username@bank).');
        return;
      }
    }

    setStep('review');
  };

  // Confirm order execution
  const handleConfirmOrder = async () => {
    if (!basket.items || basket.items.length === 0) {
      setOrderError('Your basket is empty. Please add items before placing an order.');
      return;
    }

    if (!paymentMethod) {
      setOrderError('Please select a payment method.');
      return;
    }

    setOrderError('');
    setPlacingOrder(true);

    try {
      // Determine payment status strictly according to project specifications:
      // Cash on Delivery -> "Pending"
      // UPI / Card demo -> "Demo Payment Successful"
      const isCod = paymentMethod === 'Cash on Delivery';
      const paymentStatus = isCod ? 'Pending' : 'Demo Payment Successful';

      await onPlaceOrder({
        payment_method: paymentMethod,
        payment_status: paymentStatus
      });

      // Confirmation screen will display via orderConfirmation prop
    } catch (err) {
      setOrderError(err.message || 'Unable to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCloseDrawer = () => {
    if (orderConfirmation && onClearConfirmation) {
      onClearConfirmation();
    }
    setStep('basket');
    setOrderError('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease'
    }}>
      {/* Click outside backdrop to close */}
      <div 
        onClick={handleCloseDrawer} 
        style={{ flex: 1, cursor: 'pointer' }} 
        aria-label="Close basket"
      />

      {/* Drawer Container */}
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: '#0f172a',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.7)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.98)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)'
            }}>
              <ShoppingBag size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {step === 'payment' ? 'Select Payment Method' : step === 'review' ? 'Review Your Order' : orderConfirmation ? 'Order Confirmation' : 'My Basket'}
              </h2>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                {customer ? `${customer.name}'s Cart` : 'Customer Basket'}
                {basket.total_items > 0 ? ` • ${basket.total_items} item${basket.total_items > 1 ? 's' : ''}` : ''}
              </span>
            </div>
          </div>

          <button
            onClick={handleCloseDrawer}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Close basket"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Error Banner */}
        {orderError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 20px',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} color="#ef4444" />
            <span>{orderError}</span>
          </div>
        )}

        {/* =========================================================================
            STAGE 4: ORDER CONFIRMATION VIEW
            ========================================================================= */}
        {orderConfirmation ? (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)'
            }}>
              <CheckCircle size={36} color="#10b981" />
            </div>

            <span className="badge badge-success" style={{ marginBottom: '8px', fontSize: '0.82rem', padding: '4px 12px' }}>
              Order Placed Successfully!
            </span>

            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 6px 0' }}>
              Order #{orderConfirmation.order_id}
            </h3>

            <p style={{ fontSize: '0.84rem', color: '#94a3b8', maxWidth: '360px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Thank you, <strong>{orderConfirmation.customer_name}</strong>! Your order has been placed and added to your personalized dining history.
            </p>

            {/* Structured Confirmation Card */}
            <div style={{
              width: '100%',
              background: '#1e293b',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '18px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Ordered Items
                </span>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Date: {orderConfirmation.order_date}
                </span>
              </div>

              {/* Line items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {orderConfirmation.items && orderConfirmation.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#e2e8f0' }}>
                    <span>{it.quantity}x {it.food_name}</span>
                    <span style={{ fontWeight: 600 }}>₹{it.subtotal}</span>
                  </div>
                ))}
              </div>

              {/* Totals & Payment Badges */}
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '1rem',
                color: '#f8fafc'
              }}>
                <span>Total Amount</span>
                <span style={{ color: '#f97316' }}>₹{orderConfirmation.total_amount}</span>
              </div>

              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Payment Method:</span>
                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>{orderConfirmation.payment_method}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Payment Status:</span>
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: orderConfirmation.payment_status === 'Pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: orderConfirmation.payment_status === 'Pending' ? '#fbbf24' : '#34d399',
                    border: orderConfirmation.payment_status === 'Pending' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    {orderConfirmation.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* College project safe demo notice */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.76rem',
              color: '#cbd5e1',
              marginBottom: '20px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left'
            }}>
              <ShieldCheck size={18} color="#818cf8" style={{ flexShrink: 0 }} />
              <span>Demo order simulation: No real transaction or banking credentials were processed.</span>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (onClearConfirmation) onClearConfirmation();
                  if (onNavigateTab) onNavigateTab('customer');
                  onClose();
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                View Order History <ArrowRight size={16} />
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleCloseDrawer}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ArrowLeft size={16} /> Continue Shopping
              </button>
            </div>
          </div>
        ) : step === 'payment' ? (
          /* =========================================================================
              STAGE 2: SELECT PAYMENT METHOD
              ========================================================================= */
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>Step 2 of 3</span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Payment Options</span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
              Select Payment Method
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 20px 0' }}>
              Choose a safe payment option to proceed with your order of ₹{basket.grand_total}.
            </p>

            {/* 3 Payment Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
              
              {/* Option 1: Cash on Delivery */}
              <label style={{
                background: paymentMethod === 'Cash on Delivery' ? 'rgba(249, 115, 22, 0.12)' : '#1e293b',
                border: paymentMethod === 'Cash on Delivery' ? '1.5px solid #f97316' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash on Delivery"
                  checked={paymentMethod === 'Cash on Delivery'}
                  onChange={() => setPaymentMethod('Cash on Delivery')}
                  style={{ accentColor: '#f97316', marginTop: '4px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <Banknote size={18} color="#f97316" />
                    <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.94rem' }}>Cash on Delivery</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Pay when your order is delivered.
                  </p>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '4px', display: 'inline-block' }}>
                    Status on order: Pending
                  </span>
                </div>
              </label>

              {/* Option 2: UPI */}
              <label style={{
                background: paymentMethod === 'UPI' ? 'rgba(249, 115, 22, 0.12)' : '#1e293b',
                border: paymentMethod === 'UPI' ? '1.5px solid #f97316' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="UPI"
                  checked={paymentMethod === 'UPI'}
                  onChange={() => setPaymentMethod('UPI')}
                  style={{ accentColor: '#f97316', marginTop: '4px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <Smartphone size={18} color="#6366f1" />
                    <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.94rem' }}>UPI</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Pay using a UPI ID.
                  </p>

                  {/* Safe Demo UPI Input */}
                  {paymentMethod === 'UPI' && (
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        Safe Demo UPI ID:
                      </label>
                      <input
                        type="text"
                        value={demoUpiId}
                        onChange={(e) => setDemoUpiId(e.target.value)}
                        placeholder="e.g. mobile@upi or username@bank"
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: upiError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '8px 12px',
                          fontSize: '0.82rem',
                          outline: 'none'
                        }}
                      />
                      {upiError && (
                        <span style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                          {upiError}
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                        Demo payment — no real transaction will be processed.
                      </span>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: Credit / Debit Card */}
              <label style={{
                background: paymentMethod === 'Credit / Debit Card' ? 'rgba(249, 115, 22, 0.12)' : '#1e293b',
                border: paymentMethod === 'Credit / Debit Card' ? '1.5px solid #f97316' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Credit / Debit Card"
                  checked={paymentMethod === 'Credit / Debit Card'}
                  onChange={() => setPaymentMethod('Credit / Debit Card')}
                  style={{ accentColor: '#f97316', marginTop: '4px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <CreditCard size={18} color="#10b981" />
                    <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.94rem' }}>Credit / Debit Card</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Pay using your debit or credit card.
                  </p>

                  {/* Clearly labeled Demo Notice */}
                  {paymentMethod === 'Credit / Debit Card' && (
                    <div style={{
                      marginTop: '12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
                        <span>Demo Card:</span>
                        <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>•••• •••• •••• 4242</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                        Demo payment — no real transaction will be processed.
                      </span>
                    </div>
                  )}
                </div>
              </label>

            </div>

            {/* Security notice */}
            <div style={{
              marginTop: 'auto',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <ShieldCheck size={20} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Safe college project demo. No sensitive payment passwords, CVV, or banking details are collected or stored.
              </span>
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep('basket')}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <ArrowLeft size={16} /> Back to Basket
              </button>
              <button
                onClick={handleProceedToReview}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}
              >
                Review Order <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : step === 'review' ? (
          /* =========================================================================
              STAGE 3: ORDER REVIEW SCREEN
              ========================================================================= */
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>Step 3 of 3</span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Final Verification</span>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
              Order Review
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 18px 0' }}>
              Verify your customer details, selected items, and payment method before placing your order.
            </p>

            {/* Customer & Delivery Information Card */}
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
                Customer & Delivery Details
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                  <User size={15} color="#94a3b8" />
                  <span>Customer Name: <strong style={{ color: '#f8fafc' }}>{customer?.name || 'Customer'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                  <Phone size={15} color="#94a3b8" />
                  <span>Mobile Number: <strong style={{ color: '#f8fafc' }}>{customer?.phone || 'N/A'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
                  <MapPin size={15} color="#94a3b8" />
                  <span>Delivery Location: <strong style={{ color: '#f8fafc' }}>{customer?.location || 'Registered Address'}</strong></span>
                </div>
              </div>
            </div>

            {/* Order Items Breakdown */}
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
                Order Items ({basket.total_items})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {basket.items.map((item) => (
                  <div key={item.item_id || item.food_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>{item.food_name}</span>
                      <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.74rem' }}>
                        {item.quantity} × ₹{item.price}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#f8fafc' }}>
                      ₹{item.item_subtotal}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Selected */}
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                    Selected Payment Method
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                    {paymentMethod}
                  </span>
                </div>
                <button
                  onClick={() => setStep('payment')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f97316',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Change
                </button>
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#94a3b8' }}>
                Payment Status: {paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Demo Payment Successful'}
              </div>
            </div>

            {/* Financial Summary */}
            <div style={{
              marginTop: 'auto',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8' }}>
                <span>Subtotal</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>₹{basket.subtotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8' }}>
                <span>Delivery Charge</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>FREE</span>
              </div>
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#f8fafc'
              }}>
                <span>Grand Total</span>
                <span style={{ color: '#f97316' }}>₹{basket.grand_total}</span>
              </div>
            </div>

            {/* Final Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep('payment')}
                disabled={placingOrder}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <ArrowLeft size={16} /> Back to Basket
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={placingOrder}
                className="btn btn-primary"
                style={{
                  flex: 1.4,
                  justifyContent: 'center',
                  fontWeight: 800,
                  cursor: placingOrder ? 'not-allowed' : 'pointer',
                  opacity: placingOrder ? 0.7 : 1
                }}
              >
                {placingOrder ? 'Confirming Order...' : (
                  <>
                    <CheckCircle size={18} /> Confirm Order
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
              STAGE 1: ACTIVE BASKET VIEW
              ========================================================================= */
          <>
            {/* Scrollable Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {!basket.items || basket.items.length === 0 ? (
                /* Empty Basket State */
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '40px 20px'
                }}>
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}>
                    <ShoppingBag size={32} color="#64748b" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                    Your basket is empty
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '300px', lineHeight: 1.5, marginBottom: '20px' }}>
                    Browse our AI recommendations and click <strong>Order Now</strong> on any dish to add it here.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab('recommendations');
                      onClose();
                    }}
                    style={{ fontSize: '0.84rem' }}
                  >
                    <Sparkles size={16} /> Browse AI Recommendations
                  </button>
                </div>
              ) : (
                <>
                  {/* Basket Items Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {basket.items.map((item) => (
                      <div
                        key={item.item_id || item.food_id}
                        className="glass-card"
                        style={{
                          padding: '12px',
                          display: 'flex',
                          gap: '12px',
                          background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          borderRadius: '12px'
                        }}
                      >
                        {/* Food Image */}
                        <img
                          src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                          alt={item.food_name}
                          style={{
                            width: '76px',
                            height: '76px',
                            borderRadius: '10px',
                            objectFit: 'cover',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            flexShrink: 0
                          }}
                        />

                        {/* Food Details */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.food_name}
                              </h4>
                              <button
                                onClick={() => onRemoveItem && onRemoveItem(item.item_id || item.food_id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Remove item"
                              >
                                <Trash2 size={15} color="#f87171" />
                              </button>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {item.category} • {item.cuisine}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.78rem', color: '#f97316', fontWeight: 600, marginTop: '2px' }}>
                              ₹{item.price} each
                            </div>
                          </div>

                          {/* Quantity and Subtotal Controls */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              background: '#0f172a',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              padding: '2px 4px'
                            }}>
                              <button
                                onClick={() => onUpdateQuantity && onUpdateQuantity(item.item_id || item.food_id, item.quantity - 1)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Decrease quantity"
                              >
                                <Minus size={14} />
                              </button>
                              <span style={{
                                minWidth: '24px',
                                textAlign: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: '#f8fafc'
                              }}>
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity && onUpdateQuantity(item.item_id || item.food_id, item.quantity + 1)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Increase quantity"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                              ₹{item.item_subtotal}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ========================================================================= */}
                  {/* COMPLEMENTARY FOOD PAIRINGS: "Goes Well With Your Order" (Apriori Mining)  */}
                  {/* ========================================================================= */}
                  <div style={{
                    marginTop: '18px',
                    marginBottom: '10px',
                    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                    borderRadius: '14px',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    padding: '16px 16px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #f97316, #ea580c)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Sparkles size={14} color="#ffffff" />
                        </div>
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                          Goes Well With Your Order
                        </h4>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        color: '#fbbf24',
                        background: 'rgba(245, 158, 11, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        border: '1px solid rgba(245, 158, 11, 0.25)'
                      }}>
                        Apriori Rules
                      </span>
                    </div>

                    {loadingComplementary ? (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '14px 0' }}>
                        Mining complementary pairings for your basket...
                      </div>
                    ) : complementaryItems && complementaryItems.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {complementaryItems.map((comp) => (
                          <div
                            key={comp.food_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              background: '#0f172a',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              border: '1px solid rgba(255, 255, 255, 0.08)'
                            }}
                          >
                            <img
                              src={comp.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                              alt={comp.food_name}
                              style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                                <strong style={{ fontSize: '0.86rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {comp.food_name}
                                </strong>
                                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f97316', flexShrink: 0 }}>
                                  ₹{comp.price}
                                </span>
                              </div>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>
                                {comp.reason}
                              </p>
                            </div>
                            <button
                              id={`add-complementary-${comp.food_id}-btn`}
                              onClick={() => onAddToBasket && onAddToBasket(comp, 1)}
                              className="btn btn-primary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                borderRadius: '8px',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title={`Add ${comp.food_name} to basket`}
                            >
                              <Plus size={13} /> Add
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic', padding: '6px 0', textAlign: 'center' }}>
                        {complementaryMessage || "No additional complementary pairings found for current items in basket."}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Footer Checkout Summary */}
            {basket.items && basket.items.length > 0 && (
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.98)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {/* Price Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8' }}>
                    <span>Total Items</span>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{basket.total_items} items</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8' }}>
                    <span>Subtotal</span>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>₹{basket.subtotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8' }}>
                    <span>Delivery Fee</span>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>FREE</span>
                  </div>
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#f8fafc'
                  }}>
                    <span>Grand Total</span>
                    <span style={{ color: '#f97316' }}>₹{basket.grand_total}</span>
                  </div>
                </div>

                {/* Clear Basket & Continue Shopping Row */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={onClearBasket}
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                    title="Remove all items from basket"
                  >
                    <Trash2 size={14} color="#f87171" /> Clear Basket
                  </button>
                  <button
                    onClick={onClose}
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                  >
                    <ArrowLeft size={14} /> Continue Shopping
                  </button>
                </div>

                {/* Primary "Proceed to Checkout" Action */}
                <button
                  id="proceed-to-checkout-btn"
                  onClick={() => setStep('payment')}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Proceed to Checkout <ArrowRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
