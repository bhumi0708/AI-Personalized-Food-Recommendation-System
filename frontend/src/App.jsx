import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BasketDrawer from './components/BasketDrawer';
import ToastNotification from './components/ToastNotification';
import AdminLoginModal from './components/AdminLoginModal';
import AuthView from './views/AuthView';
import HomeView from './views/HomeView';
import CustomerView from './views/CustomerView';
import RecommendationView from './views/RecommendationView';
import AdminView from './views/AdminView';
import { API_BASE, getAuthHeaders } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [userRole, setUserRole] = useState('customer'); // 'customer' or 'admin'
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  
  // Data states
  const [systemStats, setSystemStats] = useState({});
  const [loggedInCustomer, setLoggedInCustomer] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [likelyNextOrder, setLikelyNextOrder] = useState(null);
  const [frequentOrders, setFrequentOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Basket & Cart States
  const [basket, setBasket] = useState({ items: [], total_items: 0, subtotal: 0, grand_total: 0 });
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  // Auto-dismiss toast notification
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch customer basket from API with auth token
  const fetchCustomerBasket = async (customerId) => {
    if (!customerId) {
      setBasket({ items: [], total_items: 0, subtotal: 0, grand_total: 0 });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/basket/${customerId}`, {
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setBasket(data || { items: [], total_items: 0, subtotal: 0, grand_total: 0 });
      }
    } catch (err) {
      console.error("Error fetching basket:", err);
    }
  };

  // Fetch initial global system stats
  const fetchInitialData = async () => {
    try {
      const statsRes = await fetch(`${API_BASE}/admin/dashboard/stats`).then(r => r.json()).catch(() => ({}));
      setSystemStats(statsRes);
    } catch (err) {
      console.error("Error fetching system stats:", err);
    }
  };

  // Load customer-specific profile, order history, recommendations, frequent orders & likely next order
  const loadCustomerPersonalizedData = async (customerId) => {
    if (!customerId) return;
    try {
      const [profileRes, recsRes, nextOrderRes, frequentRes] = await Promise.all([
        fetch(`${API_BASE}/customers/${customerId}`, { headers: { ...getAuthHeaders() } }).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/recommendations/${customerId}?top_n=8`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/recommendations/${customerId}/likely-next-order`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/orders/customer/${customerId}/frequent`).then(r => r.json()).catch(() => [])
      ]);

      if (profileRes && profileRes.order_history) {
        setOrderHistory(profileRes.order_history);
      }
      setRecommendations(recsRes || []);
      setLikelyNextOrder(nextOrderRes || null);
      setFrequentOrders(frequentRes || []);
    } catch (err) {
      console.error("Error loading customer personalized data:", err);
    }
  };

  // Check saved session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem('foodai_token');
      const savedRole = localStorage.getItem('foodai_role');

      if (!savedToken) {
        // No saved session -> visitor starts signed out on Welcome / Auth Page
        setLoggedInCustomer(null);
        setUserRole('customer');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.role === 'admin') {
            setUserRole('admin');
            setLoggedInCustomer(null);
            setActiveTab('admin');
            await fetchInitialData();
          } else if (data.role === 'customer' && data.customer) {
            setUserRole('customer');
            setLoggedInCustomer(data.customer);
            setActiveTab('home');
            await Promise.all([
              loadCustomerPersonalizedData(data.customer.customer_id),
              fetchCustomerBasket(data.customer.customer_id),
              fetchInitialData()
            ]);
          }
        } else {
          // Token expired or invalid
          localStorage.removeItem('foodai_token');
          localStorage.removeItem('foodai_customer');
          localStorage.removeItem('foodai_role');
          setLoggedInCustomer(null);
          setUserRole('customer');
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
    };

    checkSession();
  }, []);

  // When loggedInCustomer state changes, load their personalized data & basket
  useEffect(() => {
    if (loggedInCustomer && loggedInCustomer.customer_id) {
      loadCustomerPersonalizedData(loggedInCustomer.customer_id);
      fetchCustomerBasket(loggedInCustomer.customer_id);
    }
  }, [loggedInCustomer]);

  // Customer Login Handler
  const handleLoginSuccess = async (customerObj, token) => {
    if (token) {
      localStorage.setItem('foodai_token', token);
    }
    if (customerObj) {
      localStorage.setItem('foodai_customer', JSON.stringify(customerObj));
    }
    localStorage.removeItem('foodai_role');

    setLoggedInCustomer(customerObj);
    setUserRole('customer');
    setActiveTab('home');

    setToast({
      message: `Welcome, ${customerObj.name}! Personalized recommendations loaded.`,
      type: 'success'
    });

    await Promise.all([
      loadCustomerPersonalizedData(customerObj.customer_id),
      fetchCustomerBasket(customerObj.customer_id),
      fetchInitialData()
    ]);
  };

  // Administrator Login Handler
  const handleAdminLoginSuccess = async (token) => {
    if (token) {
      localStorage.setItem('foodai_token', token);
      localStorage.setItem('foodai_role', 'admin');
    }
    localStorage.removeItem('foodai_customer');

    setUserRole('admin');
    setLoggedInCustomer(null);
    setActiveTab('admin');

    setToast({
      message: 'Signed in as System Administrator.',
      type: 'success'
    });

    await fetchInitialData();
  };

  // Sign out handler
  const handleLogout = async () => {
    const token = localStorage.getItem('foodai_token');
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }

    localStorage.removeItem('foodai_token');
    localStorage.removeItem('foodai_customer');
    localStorage.removeItem('foodai_role');

    setLoggedInCustomer(null);
    setUserRole('customer');
    setOrderHistory([]);
    setLikelyNextOrder(null);
    setFrequentOrders([]);
    setBasket({ items: [], total_items: 0, subtotal: 0, grand_total: 0 });
    setIsBasketOpen(false);
    setOrderConfirmation(null);

    setToast({
      message: 'You have been signed out.',
      type: 'info'
    });
  };

  // Add to basket handler (triggered by clicking "Order Now" on any card)
  const handleAddToBasket = async (food, quantity = 1) => {
    if (!food) return;

    if (!loggedInCustomer) {
      setToast({
        message: 'Please log in to add items to your basket.',
        type: 'auth'
      });
      return;
    }

    try {
      const payload = {
        customer_id: loggedInCustomer.customer_id,
        food_id: food.food_id,
        food_name: food.food_name,
        quantity: quantity || 1
      };

      const res = await fetch(`${API_BASE}/basket`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Unable to add this item to your basket. Please try again.');
      }

      const updatedBasket = await res.json();
      setBasket(updatedBasket);
      setOrderConfirmation(null);

      setToast({
        message: `${food.food_name} added to your basket.`,
        type: 'success'
      });
      setIsBasketOpen(true);
    } catch (err) {
      console.error('Error adding item to basket:', err);
      setToast({
        message: 'Unable to add this item to your basket. Please try again.',
        type: 'error'
      });
    }
  };

  // Update item quantity in basket (+ or -)
  const handleUpdateBasketQuantity = async (itemId, newQuantity) => {
    if (!loggedInCustomer) return;
    try {
      const res = await fetch(`${API_BASE}/basket/${loggedInCustomer.customer_id}/${itemId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ quantity: newQuantity })
      });
      if (res.ok) {
        const data = await res.json();
        setBasket(data);
      }
    } catch (err) {
      console.error('Error updating basket quantity:', err);
    }
  };

  // Remove specific item from basket
  const handleRemoveBasketItem = async (itemId) => {
    if (!loggedInCustomer) return;
    try {
      const res = await fetch(`${API_BASE}/basket/${loggedInCustomer.customer_id}/${itemId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setBasket(data);
      }
    } catch (err) {
      console.error('Error removing item from basket:', err);
    }
  };

  // Clear customer basket
  const handleClearBasket = async () => {
    if (!loggedInCustomer) return;
    try {
      const res = await fetch(`${API_BASE}/basket/${loggedInCustomer.customer_id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setBasket(data);
      }
    } catch (err) {
      console.error('Error clearing basket:', err);
    }
  };

  // Place order from basket (triggered after payment method selection & review)
  const handlePlaceOrder = async (paymentDetails = {}) => {
    if (!loggedInCustomer || !basket.items || basket.items.length === 0) return;

    const paymentMethod = paymentDetails.payment_method || 'Cash on Delivery';
    const isCOD = paymentMethod.toLowerCase().includes('cash') || paymentMethod.toLowerCase().includes('cod');
    const paymentStatus = paymentDetails.payment_status || (isCOD ? 'Pending' : 'Demo Payment Successful');

    const res = await fetch(`${API_BASE}/basket/${loggedInCustomer.customer_id}/checkout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        customer_id: loggedInCustomer.customer_id,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        order_source: 'Project App'
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to place order.');
    }

    const confirmation = await res.json();
    setOrderConfirmation(confirmation);
    setBasket({ items: [], total_items: 0, subtotal: 0, grand_total: 0 });

    // Refresh customer personalized data & global system statistics
    await loadCustomerPersonalizedData(loggedInCustomer.customer_id);
    fetchInitialData();
  };

  // =========================================================================
  // SCENARIO 1: VISITOR IS NOT SIGNED IN
  // Show Welcome / Authentication Page with Sign In & Create Account
  // =========================================================================
  if (!loggedInCustomer && userRole !== 'admin') {
    return (
      <AuthView
        onLoginSuccess={handleLoginSuccess}
        onAdminLoginSuccess={handleAdminLoginSuccess}
      />
    );
  }

  // =========================================================================
  // SCENARIO 2: USER IS AUTHENTICATED (CUSTOMER OR ADMIN)
  // =========================================================================
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0f19', color: '#f8fafc' }}>
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        basketItemCount={basket.total_items}
        onOpenBasket={() => setIsBasketOpen(true)}
        userRole={userRole}
        onRequestAdminLogin={() => setIsAdminModalOpen(true)}
      />

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <Header
          userRole={userRole}
          loggedInCustomer={loggedInCustomer}
          onLogout={handleLogout}
          onRefreshData={fetchInitialData}
          onNavigateTab={setActiveTab}
          basketItemCount={basket.total_items}
          onOpenBasket={() => setIsBasketOpen(true)}
          onRequestAdminSignIn={() => setIsAdminModalOpen(true)}
        />

        {/* Dynamic Main View */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f97316', marginBottom: '8px' }}>
                Loading FoodAI Recommendation Engine...
              </div>
              <div>Personalizing recommendations based on customer profiles & order patterns</div>
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeView
                  stats={systemStats}
                  customer={loggedInCustomer}
                  frequentOrders={frequentOrders}
                  likelyNextOrder={likelyNextOrder}
                  orderHistory={orderHistory}
                  onNavigate={setActiveTab}
                  onOrderFood={handleAddToBasket}
                />
              )}

              {activeTab === 'customer' && (
                <CustomerView
                  customer={loggedInCustomer}
                  recommendations={recommendations}
                  likelyNextOrder={likelyNextOrder}
                  orderHistory={orderHistory}
                  onOrderFood={handleAddToBasket}
                  onLoginSuccess={handleLoginSuccess}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === 'recommendations' && (
                <RecommendationView
                  recommendations={recommendations}
                  likelyNextOrder={likelyNextOrder}
                  frequentOrders={frequentOrders}
                  customer={loggedInCustomer}
                  onOrderFood={handleAddToBasket}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'admin' && (
                <AdminView
                  onAddFood={async () => { await fetchInitialData(); }}
                  onAddCustomer={async () => { await fetchInitialData(); }}
                  onRefreshGlobal={async () => {
                    await fetchInitialData();
                    if (loggedInCustomer) {
                      await loadCustomerPersonalizedData(loggedInCustomer.customer_id);
                    }
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Slide-over Basket Drawer / Modal */}
      <BasketDrawer
        isOpen={isBasketOpen}
        onClose={() => {
          setIsBasketOpen(false);
          setOrderConfirmation(null);
        }}
        basket={basket}
        customer={loggedInCustomer}
        onAddToBasket={handleAddToBasket}
        onUpdateQuantity={handleUpdateBasketQuantity}
        onRemoveItem={handleRemoveBasketItem}
        onClearBasket={handleClearBasket}
        onPlaceOrder={handlePlaceOrder}
        orderConfirmation={orderConfirmation}
        onClearConfirmation={() => setOrderConfirmation(null)}
        onNavigateTab={setActiveTab}
      />

      {/* Admin Login Modal (When customer requests access to admin panel) */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onAdminLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Actionable Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
        onViewBasket={() => setIsBasketOpen(true)}
        onGoToLogin={() => setActiveTab('customer')}
      />
    </div>
  );
}
