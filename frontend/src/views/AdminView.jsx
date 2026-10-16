import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Eye, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  X, 
  User, 
  ShoppingBag, 
  MapPin, 
  UtensilsCrossed,
  Sparkles,
  Database,
  Layers,
  PieChart,
  Activity,
  TrendingUp,
  BarChart2,
  ArrowRight
} from 'lucide-react';
import { API_BASE } from '../config';

const CUISINE_OPTIONS = ['Indian', 'South Indian', 'Fast Food', 'Chinese'];
const LOCATION_OPTIONS = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune'];

export default function AdminView({ onAddFood, onAddCustomer: _onAddCustomer, onRefreshGlobal }) {
  // Navigation sub-tab inside admin view
  const [adminTab, setAdminTab] = useState('customers'); // 'customers' or 'menu'

  // Customer state
  const [customersList, setCustomersList] = useState([]);
  const [totalCustomerCount, setTotalCustomerCount] = useState(0);
  const [activeCustomerCount, setActiveCustomerCount] = useState(0);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisineFilter, setSelectedCuisineFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Customer Form state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [custForm, setCustForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    location: 'Hyderabad',
    preferences: 'Indian',
    email: '',
    phone: '',
    status: 'Active'
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Customer Details & Order History Modal
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Delete confirmation modal state
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // Food Item Form state (retained)
  const [foodForm, setFoodForm] = useState({
    food_name: '',
    category: 'Main Course',
    cuisine: 'Indian',
    price: '',
    image_url: ''
  });
  const [foodSubmitting, setFoodSubmitting] = useState(false);

  // Historical Order Form state (Requirement 7)
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [availableFoods, setAvailableFoods] = useState([]);
  const [orderForm, setOrderForm] = useState({
    customer_id: '',
    food_id: '',
    food_name: '',
    order_date: new Date().toISOString().split('T')[0],
    quantity: 1,
    price: '',
    order_source: 'Swiggy'
  });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Status feedback
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Fetch available foods from catalog
  const fetchAvailableFoods = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/foods`);
      if (res.ok) {
        const data = await res.json();
        setAvailableFoods(data || []);
      }
    } catch (err) {
      console.error('Error fetching food catalog:', err);
    }
  };

  // Fetch customers from backend
  const fetchLiveCustomers = async (search = searchQuery, status = selectedStatusFilter) => {
    setLoadingCustomers(true);
    try {
      let url = `${API_BASE}/customers`;
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append('q', search.trim());
      }
      if (status && status !== 'All') {
        params.append('status', status);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomersList(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch dynamic count directly from DB endpoint
  const fetchCustomerCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers/count`);
      if (res.ok) {
        const data = await res.json();
        setTotalCustomerCount(data.total_customers || 0);
        setActiveCustomerCount(data.active_customers || 0);
      }
    } catch (err) {
      console.error('Error fetching customer count:', err);
    }
  };

  // Customer Insights (K-Means Clustering) state
  const [insightsData, setInsightsData] = useState(null);
  const [insightsK, setInsightsK] = useState(3);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsSearch, setInsightsSearch] = useState('');

  // Data Warehouse & Association Rules state
  const [warehouseStats, setWarehouseStats] = useState(null);
  const [warehouseAnalytics, setWarehouseAnalytics] = useState(null);
  const [associationRules, setAssociationRules] = useState([]);
  const [loadingWarehouse, setLoadingWarehouse] = useState(false);
  const [refreshingWarehouse, setRefreshingWarehouse] = useState(false);

  // Fetch customer segmentation clusters via K-Means
  const fetchCustomerInsights = async (k = insightsK) => {
    setLoadingInsights(true);
    try {
      const res = await fetch(`${API_BASE}/admin/customer-insights?k=${k}`);
      if (res.ok) {
        const data = await res.json();
        setInsightsData(data);
      }
    } catch (err) {
      console.error('Error fetching customer insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Fetch Star Schema stats, analytical aggregates, and mined Apriori rules
  const fetchWarehouseData = async () => {
    setLoadingWarehouse(true);
    try {
      const [statsRes, analyticsRes, rulesRes] = await Promise.all([
        fetch(`${API_BASE}/admin/warehouse/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/admin/warehouse/analytics`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/admin/association-rules?limit=25`).then(r => r.json()).catch(() => null)
      ]);
      setWarehouseStats(statsRes);
      setWarehouseAnalytics(analyticsRes);
      setAssociationRules((rulesRes && rulesRes.rules) || []);
    } catch (err) {
      console.error('Error fetching warehouse data:', err);
    } finally {
      setLoadingWarehouse(false);
    }
  };

  // Trigger idempotent Star Schema ETL refresh
  const handleTriggerWarehouseRefresh = async () => {
    setRefreshingWarehouse(true);
    try {
      const res = await fetch(`${API_BASE}/admin/warehouse/refresh`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Star Schema ETL refresh completed without duplicates!', 'success');
        await fetchWarehouseData();
      } else {
        showToast('Warehouse refresh encountered an error.', 'error');
      }
    } catch (err) {
      console.error('Error triggering ETL refresh:', err);
      showToast('Error connecting to warehouse ETL endpoint.', 'error');
    } finally {
      setRefreshingWarehouse(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLiveCustomers();
    fetchCustomerCount();
    fetchAvailableFoods();
  }, []);

  // Lazy load sub-tab data on tab activation
  useEffect(() => {
    if (adminTab === 'insights' && !insightsData) {
      fetchCustomerInsights();
    }
    if (adminTab === 'warehouse' && (!warehouseStats || !warehouseAnalytics)) {
      fetchWarehouseData();
    }
  }, [adminTab]);

  const showToast = (message, type = 'success') => {
    setFeedbackMsg({ message, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // Search input handler with debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchLiveCustomers(val, selectedStatusFilter);
  };

  // Status filter handler
  const handleStatusFilterChange = (status) => {
    setSelectedStatusFilter(status);
    fetchLiveCustomers(searchQuery, status);
  };

  // Reload everything
  const handleRefresh = async () => {
    await Promise.all([fetchLiveCustomers(), fetchCustomerCount()]);
    if (onRefreshGlobal) onRefreshGlobal();
    showToast('Customer data refreshed from database.', 'success');
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

  // Submit Add Customer (Requirements 1, 2, 3, 15)
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!custForm.name || !custForm.name.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    const ageNum = parseInt(custForm.age);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setFormError('Please enter a valid age between 1 and 120.');
      return;
    }
    if (!custForm.phone || !custForm.phone.trim()) {
      setFormError('Mobile number is required to uniquely identify the customer account.');
      return;
    }
    if (!custForm.email || !custForm.email.trim()) {
      setFormError('Email address is required for account notifications.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        name: custForm.name.trim(),
        age: ageNum,
        gender: custForm.gender,
        location: custForm.location,
        preferences: custForm.preferences,
        email: custForm.email.trim(),
        phone: custForm.phone.trim(),
        status: custForm.status || 'Active'
      };

      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to add customer');
      }

      const createdCustomer = await res.json();

      // Reset form & close modal
      setCustForm({
        name: '',
        age: '',
        gender: 'Male',
        location: 'Hyderabad',
        preferences: 'Indian',
        email: '',
        phone: '',
        status: 'Active'
      });
      setIsAddCustomerOpen(false);

      // Refresh list, count, and global application state
      await Promise.all([fetchLiveCustomers(), fetchCustomerCount()]);
      if (onRefreshGlobal) onRefreshGlobal();

      const emStatus = createdCustomer.email_status || '';
      if (emStatus.includes('could not be sent') || emStatus.includes('not configured')) {
        showToast(
          `Customer created successfully, but confirmation email could not be sent.`,
          'warning'
        );
      } else {
        showToast(
          `Customer "${createdCustomer.name}" (ID #${createdCustomer.customer_id}) stored permanently in database! Confirmation email sent to ${createdCustomer.email}.`,
          'success'
        );
      }
    } catch (err) {
      setFormError(err.message || 'Error creating customer.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Add Previous Order (Requirement 7)
  const handleAddOrderSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');

    if (!orderForm.customer_id) {
      setOrderError('Please select a customer.');
      return;
    }
    const qty = parseInt(orderForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      setOrderError('Please enter a valid positive quantity.');
      return;
    }

    setOrderSubmitting(true);
    try {
      const payload = {
        customer_id: parseInt(orderForm.customer_id),
        food_id: orderForm.food_id ? parseInt(orderForm.food_id) : undefined,
        food_name: orderForm.food_name || undefined,
        order_date: orderForm.order_date || new Date().toISOString().split('T')[0],
        quantity: qty,
        price: orderForm.price ? parseFloat(orderForm.price) : undefined,
        order_source: orderForm.order_source || 'Swiggy',
        rating: 4.5,
        payment_method: 'UPI',
        order_status: 'Completed'
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save historical order');
      }

      const createdOrder = await res.json();
      setIsAddOrderOpen(false);

      setOrderForm({
        customer_id: '',
        food_id: '',
        food_name: '',
        order_date: new Date().toISOString().split('T')[0],
        quantity: 1,
        price: '',
        order_source: 'Swiggy'
      });

      // Refresh customers list and stats
      await Promise.all([fetchLiveCustomers(), fetchCustomerCount()]);
      if (selectedCustomerDetails && selectedCustomerDetails.customer.customer_id === parseInt(payload.customer_id)) {
        await handleViewCustomer(payload.customer_id);
      }
      if (onRefreshGlobal) onRefreshGlobal();

      showToast(
        `Previous order #${createdOrder.order_id} for "${createdOrder.food_name}" (${createdOrder.order_source}) saved to database!`,
        'success'
      );
    } catch (err) {
      setOrderError(err.message || 'Error creating order.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // View Customer Full Profile & Order History
  const handleViewCustomer = async (customerId) => {
    setLoadingDetails(true);
    setSelectedCustomerDetails(null);
    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}`);
      if (!res.ok) throw new Error('Failed to fetch customer profile');
      const data = await res.json();
      setSelectedCustomerDetails(data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      showToast('Could not load customer profile details.', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Delete customer from database
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeletingCustomer(true);
    try {
      const res = await fetch(`${API_BASE}/customers/${customerToDelete.customer_id}?permanent=true`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete customer');

      const deletedId = customerToDelete.customer_id;
      setCustomerToDelete(null);

      // Refresh list, count, and global application state
      await Promise.all([fetchLiveCustomers(), fetchCustomerCount()]);
      if (onRefreshGlobal) onRefreshGlobal();

      showToast(`Customer #${deletedId} was permanently deleted from database.`, 'success');
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Failed to delete customer from database.', 'error');
    } finally {
      setDeletingCustomer(false);
    }
  };

  // Add Food Item Submit (retained functionality)
  const handleAddFoodSubmit = async (e) => {
    e.preventDefault();
    if (!foodForm.food_name || !foodForm.price) return;
    setFoodSubmitting(true);
    try {
      if (onAddFood) {
        await onAddFood({ ...foodForm, price: parseFloat(foodForm.price) });
      } else {
        await fetch(`${API_BASE}/admin/food`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...foodForm, price: parseFloat(foodForm.price) })
        });
      }
      setFoodForm({ food_name: '', category: 'Main Course', cuisine: 'Indian', price: '', image_url: '' });
      showToast(`Food item "${foodForm.food_name}" successfully added to catalog!`, 'success');
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (err) {
      console.error('Error adding food:', err);
      showToast('Failed to add food item.', 'error');
    } finally {
      setFoodSubmitting(false);
    }
  };

  // Filter customers by selected cuisine on frontend as well
  const displayedCustomers = customersList.filter((c) => {
    if (selectedCuisineFilter !== 'All') {
      return (c.preferences || '').toLowerCase() === selectedCuisineFilter.toLowerCase();
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-warning" style={{ marginBottom: '6px' }}>
            System Administrator Control
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={26} color="#f59e0b" /> Admin Control & Management Panel
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Manage registered customer accounts, view detailed order history, and maintain the food menu catalog.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', background: '#1e293b', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setAdminTab('customers')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: adminTab === 'customers' ? '#f97316' : 'transparent',
              color: adminTab === 'customers' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={16} /> Customer Management
          </button>
          <button
            onClick={() => setAdminTab('menu')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: adminTab === 'menu' ? '#f97316' : 'transparent',
              color: adminTab === 'menu' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <UtensilsCrossed size={16} /> Menu Catalog
          </button>
          <button
            id="tab-insights-btn"
            onClick={() => setAdminTab('insights')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: adminTab === 'insights' ? '#f97316' : 'transparent',
              color: adminTab === 'insights' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={16} /> Customer Insights (K-Means)
          </button>
          <button
            id="tab-warehouse-btn"
            onClick={() => setAdminTab('warehouse')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: adminTab === 'warehouse' ? '#f97316' : 'transparent',
              color: adminTab === 'warehouse' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Database size={16} /> Data Warehouse & Rules
          </button>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {feedbackMsg && (
        <div style={{
          background: feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${feedbackMsg.type === 'error' ? '#ef4444' : '#10b981'}`,
          color: feedbackMsg.type === 'error' ? '#fca5a5' : '#34d399',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedbackMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{feedbackMsg.message}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CUSTOMER MANAGEMENT SECTION                                       */}
      {/* ========================================================================= */}
      {adminTab === 'customers' && (
        <>
          {/* Section Summary Card with Dynamic Count */}
          <div className="glass-card" style={{
            padding: '24px 28px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
            borderLeft: '5px solid #f97316',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                CUSTOMER MANAGEMENT
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <h3 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Total Customers: <span style={{ color: '#f97316' }}>{totalCustomerCount}</span>
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                  ({activeCustomerCount} Active in Database)
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
                Live count calculated dynamically from project database records. New additions & deletions update immediately.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                id="admin-add-customer-btn"
                className="btn btn-primary"
                onClick={() => setIsAddCustomerOpen(true)}
                style={{ padding: '10px 18px', fontSize: '0.88rem' }}
              >
                <Plus size={18} /> Add Customer
              </button>
              <button
                id="admin-add-order-btn"
                className="btn btn-secondary"
                onClick={() => {
                  setOrderForm({
                    customer_id: customersList.length > 0 ? String(customersList[0].customer_id) : '',
                    food_id: availableFoods.length > 0 ? String(availableFoods[0].food_id) : '',
                    food_name: availableFoods.length > 0 ? availableFoods[0].food_name : 'Biryani',
                    order_date: new Date().toISOString().split('T')[0],
                    quantity: 1,
                    price: availableFoods.length > 0 ? String(availableFoods[0].price) : '280',
                    order_source: 'Swiggy'
                  });
                  setIsAddOrderOpen(true);
                }}
                style={{ padding: '10px 18px', fontSize: '0.88rem', background: 'rgba(99, 102, 241, 0.18)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.35)' }}
              >
                <ShoppingBag size={18} color="#818cf8" /> Add Previous Order
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRefresh}
                title="Refresh customer database records"
                style={{ padding: '10px 14px' }}
              >
                <RefreshCw size={17} color="#94a3b8" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-card" style={{ padding: '18px 22px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {/* Search Input Box */}
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by ID, name, location, cuisine, email..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: '100%',
                  background: '#151c2e',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '10px 14px 10px 38px',
                  color: '#f8fafc',
                  fontSize: '0.86rem',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    fetchLiveCustomers('', selectedStatusFilter);
                  }}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Cuisine Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Cuisine:</span>
                <select
                  value={selectedCuisineFilter}
                  onChange={(e) => setSelectedCuisineFilter(e.target.value)}
                  style={{
                    background: '#151c2e',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  <option value="All">All Cuisines</option>
                  {CUISINE_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Status:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['All', 'Active', 'Inactive'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusFilterChange(st)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: selectedStatusFilter === st ? '#f97316' : '#1e293b',
                        color: selectedStatusFilter === st ? '#ffffff' : '#94a3b8',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details Table */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                Registered Customers ({displayedCustomers.length} displayed)
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                Stored in database table: <code style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>dim_customer</code>
              </div>
            </div>

            {loadingCustomers ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="animate-spin" color="#f97316" style={{ margin: '0 auto 12px' }} />
                <div>Loading customer records from database...</div>
              </div>
            ) : displayedCustomers.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                <User size={32} color="#64748b" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>No customers match your search</div>
                <div style={{ fontSize: '0.82rem' }}>Try clearing the search term or filters to view all records.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 18px', width: '60px' }}>ID</th>
                      <th style={{ padding: '12px 18px' }}>Customer Name</th>
                      <th style={{ padding: '12px 18px' }}>Age / Gender</th>
                      <th style={{ padding: '12px 18px' }}>Location</th>
                      <th style={{ padding: '12px 18px' }}>Preference</th>
                      <th style={{ padding: '12px 18px' }}>Total Orders</th>
                      <th style={{ padding: '12px 18px' }}>Last Order</th>
                      <th style={{ padding: '12px 18px' }}>Status</th>
                      <th style={{ padding: '12px 18px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCustomers.map((cust, idx) => (
                      <tr
                        key={cust.customer_id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* ID */}
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#f97316' }}>
                          #{cust.customer_id}
                        </td>

                        {/* Name & Contact */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{cust.name}</span>
                          </div>
                          {(cust.email || cust.phone) && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                              {cust.email || cust.phone}
                            </div>
                          )}
                        </td>

                        {/* Age / Gender */}
                        <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                          {cust.age} yrs • {cust.gender}
                        </td>

                        {/* Location */}
                        <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="#94a3b8" /> {cust.location}
                          </span>
                        </td>

                        {/* Preference */}
                        <td style={{ padding: '14px 18px' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.74rem' }}>
                            {cust.preferences}
                          </span>
                        </td>

                        {/* Total Orders & Spend */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                            {cust.total_orders || 0} orders
                          </div>
                          {cust.total_spent > 0 && (
                            <div style={{ fontSize: '0.74rem', color: '#10b981' }}>
                              ₹{cust.total_spent.toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Last Order Date */}
                        <td style={{ padding: '14px 18px', color: '#94a3b8', fontSize: '0.8rem' }}>
                          {cust.last_order_date || 'N/A'}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: cust.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                            color: cust.status === 'Active' ? '#34d399' : '#94a3b8',
                            border: `1px solid ${cust.status === 'Active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`
                          }}>
                            {cust.status || 'Active'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            {/* View Profile / Order History */}
                            <button
                              onClick={() => handleViewCustomer(cust.customer_id)}
                              className="btn btn-secondary"
                              title="View complete customer profile and order history"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={14} color="#38bdf8" />
                              <span>Details</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setCustomerToDelete(cust)}
                              className="btn btn-secondary"
                              title="Delete customer permanently from database"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MENU CATALOG MANAGEMENT (RETAINED)                                */}
      {/* ========================================================================= */}
      {adminTab === 'menu' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Add Food Item Form */}
          <div className="glass-card" style={{ padding: '26px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="#f97316" /> Add New Food Item
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '20px' }}>
              Add a new dish to the food catalog. Newly added foods become instantly eligible for customer ordering and AI recommendations.
            </p>

            <form onSubmit={handleAddFoodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Food Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Masala Dosa, Butter Chicken"
                  value={foodForm.food_name}
                  onChange={(e) => setFoodForm({ ...foodForm, food_name: e.target.value })}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Category *</label>
                  <select
                    value={foodForm.category}
                    onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="Main Course">Main Course</option>
                    <option value="Starter">Starter</option>
                    <option value="Side Dish">Side Dish</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Cuisine *</label>
                  <select
                    value={foodForm.cuisine}
                    onChange={(e) => setFoodForm({ ...foodForm, cuisine: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                  >
                    <option value="Indian">Indian</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Price (₹) *</label>
                <input
                  type="number"
                  placeholder="250"
                  value={foodForm.price}
                  onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })}
                  required
                  min="1"
                  step="0.5"
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={foodForm.image_url}
                  onChange={(e) => setFoodForm({ ...foodForm, image_url: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={foodSubmitting}
                className="btn btn-primary"
                style={{ marginTop: '8px', padding: '12px' }}
              >
                {foodSubmitting ? 'Saving to Database...' : 'Save Food Item to Database'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CUSTOMER INSIGHTS & SEGMENTATION (K-MEANS CLUSTERING)              */}
      {/* ========================================================================= */}
      {adminTab === 'insights' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header Banner */}
          <div className="glass-card" style={{
            padding: '24px 28px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
            borderLeft: '5px solid #8b5cf6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                MACHINE LEARNING CUSTOMER SEGMENTATION
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                Customer Insights (K-Means Clustering)
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
                Customers clustered using multi-dimensional behavioral features: completed order frequency, average order value, recency, cuisine affinity, and category distribution.
              </p>
            </div>

            {/* Re-cluster Controller */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Clusters (k):</span>
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    setInsightsK(num);
                    fetchCustomerInsights(num);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: insightsK === num ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
                    color: insightsK === num ? '#ffffff' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  k={num}
                </button>
              ))}
              <button
                onClick={() => fetchCustomerInsights(insightsK)}
                className="btn btn-secondary"
                style={{ padding: '6px', marginLeft: '6px' }}
                title="Re-run clustering"
              >
                <RefreshCw size={14} className={loadingInsights ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loadingInsights ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>
                Computing K-Means Clustering on Customer Profiles...
              </div>
              <div>Standardizing feature spaces and optimizing cluster centroids</div>
            </div>
          ) : insightsData && insightsData.success ? (
            <>
              {/* Summary Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #8b5cf6' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Total Customers Clustered</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {insightsData.total_customers}
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Active Clusters</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {insightsData.k} Segments
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f97316' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Cluster Inertia</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {insightsData.inertia}
                  </div>
                </div>
                <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #38bdf8' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Initialization Algorithm</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', marginTop: '8px' }}>
                    K-Means++ (Standard Scaled)
                  </div>
                </div>
              </div>

              {/* Cluster Detail Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {insightsData.clusters.map(cluster => (
                  <div
                    key={cluster.cluster_id}
                    className="glass-card"
                    style={{
                      padding: '22px',
                      borderRadius: '16px',
                      border: `1px solid ${cluster.tag_color || '#8b5cf6'}40`,
                      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: `${cluster.tag_color || '#8b5cf6'}20`,
                          color: cluster.tag_color || '#a78bfa',
                          border: `1px solid ${cluster.tag_color || '#8b5cf6'}40`
                        }}>
                          Segment #{cluster.cluster_id + 1}
                        </span>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '8px 0 0 0' }}>
                          {cluster.name}
                        </h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: cluster.tag_color || '#a78bfa' }}>
                          {cluster.customer_count}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          ({cluster.pct_of_customers}%)
                        </span>
                      </div>
                    </div>

                    {/* Cluster Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#0f172a', padding: '12px', borderRadius: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Avg Orders:</span>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                          {cluster.avg_orders} orders
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Avg Spend:</span>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                          ₹{cluster.avg_order_value}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Dominant Cuisine:</span>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f97316' }}>
                          {cluster.dominant_cuisine}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Avg Recency:</span>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                          {cluster.avg_recency_days} days ago
                        </div>
                      </div>
                    </div>

                    {/* Cuisine Affinity Bars */}
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                        Cuisine Affinity Distribution
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {Object.entries(cluster.cuisine_affinity || {}).map(([cName, cPct]) => (
                          <div key={cName}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '2px' }}>
                              <span>{cName}</span>
                              <span style={{ fontWeight: 700 }}>{cPct}%</span>
                            </div>
                            <div style={{ height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(100, cPct)}%`,
                                height: '100%',
                                background: cluster.tag_color || '#8b5cf6',
                                borderRadius: '9999px'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sample Members */}
                    {cluster.sample_customers && cluster.sample_customers.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <strong style={{ color: '#cbd5e1' }}>Sample Members: </strong>
                        {cluster.sample_customers.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Segmented Customers Table */}
              <div className="glass-card" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="#8b5cf6" /> Customer Segment Assignments
                  </h4>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search customer or segment..."
                      value={insightsSearch}
                      onChange={(e) => setInsightsSearch(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        padding: '8px 12px 8px 32px',
                        fontSize: '0.8rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                        <th style={{ padding: '10px 12px' }}>ID</th>
                        <th style={{ padding: '10px 12px' }}>Customer Name</th>
                        <th style={{ padding: '10px 12px' }}>Location</th>
                        <th style={{ padding: '10px 12px' }}>Stated Preference</th>
                        <th style={{ padding: '10px 12px' }}>Orders</th>
                        <th style={{ padding: '10px 12px' }}>Total Spend</th>
                        <th style={{ padding: '10px 12px' }}>Avg Value</th>
                        <th style={{ padding: '10px 12px' }}>Assigned Segment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insightsData.customers
                        .filter(c => {
                          if (!insightsSearch) return true;
                          const term = insightsSearch.toLowerCase();
                          return (
                            c.name.toLowerCase().includes(term) ||
                            (c.cluster_name && c.cluster_name.toLowerCase().includes(term)) ||
                            (c.location && c.location.toLowerCase().includes(term))
                          );
                        })
                        .map(cust => (
                          <tr key={cust.customer_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '10px 12px', color: '#f97316', fontWeight: 700 }}>#{cust.customer_id}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f8fafc' }}>{cust.name}</td>
                            <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{cust.location}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                                {cust.stated_preference}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f8fafc' }}>{cust.order_count}</td>
                            <td style={{ padding: '10px 12px', color: '#f8fafc' }}>₹{cust.total_spend}</td>
                            <td style={{ padding: '10px 12px', color: '#34d399' }}>₹{cust.avg_order_value}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(139, 92, 246, 0.15)',
                                color: '#c4b5fd',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                              }}>
                                {cust.cluster_name}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              No clustering data available. Ensure customers exist in database.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DATA WAREHOUSE & ASSOCIATION RULES (STAR SCHEMA OLAP)              */}
      {/* ========================================================================= */}
      {adminTab === 'warehouse' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header Banner */}
          <div className="glass-card" style={{
            padding: '24px 28px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
            borderLeft: '5px solid #0284c7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                DIMENSIONAL MODELING & BUSINESS INTELLIGENCE
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                Data Warehouse & Association Rules Mart
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
                Analytical Star Schema (Kimball Methodology) with surrogate keys and idempotent fact refreshes. Powers global food analytics and Apriori complementary pairing rules.
              </p>
            </div>

            {/* ETL Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="dwh-refresh-btn"
                onClick={handleTriggerWarehouseRefresh}
                disabled={refreshingWarehouse}
                className="btn btn-primary"
                style={{
                  padding: '10px 18px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  cursor: refreshingWarehouse ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={15} className={refreshingWarehouse ? 'animate-spin' : ''} />
                <span>{refreshingWarehouse ? 'Refreshing ETL...' : 'Trigger Warehouse Refresh'}</span>
              </button>
            </div>
          </div>

          {loadingWarehouse ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
                Querying Analytical Star Schema & Association Rules...
              </div>
              <div>Aggregating dimensional cubes and mining transaction pairings</div>
            </div>
          ) : (
            <>
              {/* Star Schema Architecture Cards */}
              {warehouseStats && warehouseStats.tables && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {Object.entries(warehouseStats.tables).map(([tableName, info]) => (
                    <div
                      key={tableName}
                      className="glass-card"
                      style={{
                        padding: '18px',
                        borderRadius: '12px',
                        borderLeft: tableName.includes('fact') ? '4px solid #f97316' : '4px solid #38bdf8',
                        background: '#1e293b'
                      }}
                    >
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: tableName.includes('fact') ? '#f97316' : '#38bdf8'
                      }}>
                        {tableName.includes('fact') ? 'Fact Table' : 'Dimension Table'}
                      </span>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
                        {tableName}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Analytical Rows:</span>
                        <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>{info.count}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>Operational Source:</span>
                        <span>{info.operational_source} ({info.source_count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Analytical Aggregates Section */}
              {warehouseAnalytics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                  
                  {/* Mart 1: Cuisine Performance */}
                  <div className="glass-card" style={{ padding: '22px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PieChart size={17} color="#f97316" /> Revenue & Orders by Cuisine
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {warehouseAnalytics.by_cuisine && warehouseAnalytics.by_cuisine.map((c, i) => (
                        <div key={i} style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                            <span>{c.cuisine}</span>
                            <span style={{ color: '#f97316' }}>₹{c.revenue} ({c.pct_of_revenue}%)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                            <span>{c.orders_count} item orders</span>
                            <span>{c.units_sold} units sold</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', marginTop: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${c.pct_of_revenue}%`, height: '100%', background: '#f97316', borderRadius: '9999px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mart 2: Temporal Analysis (Weekend vs Weekday & Time of Day) */}
                  <div className="glass-card" style={{ padding: '22px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={17} color="#38bdf8" /> Day of Week & Time of Day Trends
                    </h4>

                    {/* Weekend vs Weekday Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      {Object.entries(warehouseAnalytics.weekend_analysis || {}).map(([dayType, d]) => (
                        <div key={dayType} style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                            {dayType} Sales
                          </span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                            ₹{d.revenue}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{d.orders_count} line orders</span>
                        </div>
                      ))}
                    </div>

                    {/* Time of Day Bars */}
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                      Orders by Meal Time (Time of Day):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {warehouseAnalytics.by_time_of_day && warehouseAnalytics.by_time_of_day.map((tod, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem' }}>
                          <span style={{ color: '#f8fafc', fontWeight: 600 }}>{tod.time_of_day}</span>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <span style={{ color: '#94a3b8' }}>{tod.orders_count} orders</span>
                            <span style={{ fontWeight: 700, color: '#34d399' }}>₹{tod.revenue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mart 3: Top Performing Food Items */}
                  <div className="glass-card" style={{ padding: '22px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={17} color="#10b981" /> Top Selling Dishes in Warehouse
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                            <th style={{ padding: '8px' }}>Dish Name</th>
                            <th style={{ padding: '8px' }}>Cuisine</th>
                            <th style={{ padding: '8px' }}>Units Sold</th>
                            <th style={{ padding: '8px' }}>Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {warehouseAnalytics.top_dishes && warehouseAnalytics.top_dishes.map((dish, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '8px', color: '#f8fafc', fontWeight: 700 }}>{dish.food_name}</td>
                              <td style={{ padding: '8px', color: '#94a3b8' }}>{dish.cuisine}</td>
                              <td style={{ padding: '8px', color: '#f8fafc', fontWeight: 600 }}>{dish.units_sold}</td>
                              <td style={{ padding: '8px', color: '#10b981', fontWeight: 700 }}>₹{dish.total_revenue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mart 4: Customer RFM Segments */}
                  <div className="glass-card" style={{ padding: '22px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={17} color="#ec4899" /> Customer RFM Lifecycle Segments
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {warehouseAnalytics.rfm_segments && warehouseAnalytics.rfm_segments.map((rfm, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px 14px', borderRadius: '8px' }}>
                          <div>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', display: 'block' }}>
                              {rfm.segment}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {rfm.customer_count} customers
                            </span>
                          </div>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ec4899' }}>
                            ₹{rfm.total_spend}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Mined Association Rules Section */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} color="#f97316" /> Learned Association Rules (Apriori Engine)
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Mined from real historical completed multi-item order transactions. Powers the "Goes Well With Your Order" basket recommendations.
                    </span>
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: '0.74rem' }}>
                    {associationRules.length} Learned Rules
                  </span>
                </div>

                {associationRules && associationRules.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                          <th style={{ padding: '10px 12px' }}>Antecedent (Ordered)</th>
                          <th style={{ padding: '10px 12px' }}></th>
                          <th style={{ padding: '10px 12px' }}>Consequent (Recommended)</th>
                          <th style={{ padding: '10px 12px' }}>Support</th>
                          <th style={{ padding: '10px 12px' }}>Confidence</th>
                          <th style={{ padding: '10px 12px' }}>Lift</th>
                          <th style={{ padding: '10px 12px' }}>Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {associationRules.map((rule, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f8fafc' }}>
                              {rule.antecedent_name}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#f97316' }}>
                              <ArrowRight size={14} />
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#38bdf8' }}>
                              {rule.consequent_name}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                              {(rule.support * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#34d399' }}>
                              {(rule.confidence * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#f97316' }}>
                              {rule.lift}x
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>
                              {rule.transaction_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No association rules found. Check minimum support or transaction records.
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOMER MODAL                                                */}
      {/* ========================================================================= */}
      {isAddCustomerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card animate-scale-up" style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} color="#f97316" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Add New Customer</h3>
                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Stored permanently in project database</span>
                </div>
              </div>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <form onSubmit={handleAddCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                />
              </div>

              {/* Age & Gender */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Age *</label>
                  <input
                    type="number"
                    placeholder="26"
                    value={custForm.age}
                    onChange={(e) => setCustForm({ ...custForm, age: e.target.value })}
                    required
                    min="1"
                    max="120"
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Gender *</label>
                  <select
                    value={custForm.gender}
                    onChange={(e) => setCustForm({ ...custForm, gender: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Location & Food Preference */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Location / City *</label>
                  <select
                    value={custForm.location}
                    onChange={(e) => setCustForm({ ...custForm, location: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                  >
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cuisine Preference *</label>
                  <select
                    value={custForm.preferences}
                    onChange={(e) => setCustForm({ ...custForm, preferences: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                  >
                    {CUISINE_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mobile Number (Unique Login Identifier) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Mobile Number (Login Identifier) *
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={custForm.phone}
                  onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                  Used by customer to authenticate into Customer Portal. Must be unique.
                </span>
              </div>

              {/* Email Address (Account Notifications) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Email Address (Account Notifications) *
                </label>
                <input
                  type="email"
                  placeholder="ramesh.chandra@example.com"
                  value={custForm.email}
                  onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                  Welcome confirmation email will be dispatched to this address upon account creation.
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px' }}
                >
                  {formSubmitting ? 'Saving to Database...' : 'Save Customer to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD PREVIOUS ORDER MODAL (Requirement 7)                          */}
      {/* ========================================================================= */}
      {isAddOrderOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div className="glass-card animate-scale-up" style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={20} color="#818cf8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Add Previous Order</h3>
                  <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Link historical orders (Swiggy, Zomato, Project App)</span>
                </div>
              </div>
              <button
                onClick={() => setIsAddOrderOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {orderError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {orderError}
              </div>
            )}

            <form onSubmit={handleAddOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Customer Selector */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Customer *</label>
                <select
                  value={orderForm.customer_id}
                  onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                >
                  <option value="">-- Select Customer --</option>
                  {customersList.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      #{c.customer_id} - {c.name} ({c.phone || c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Food Item Selector */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Food Item *</label>
                <select
                  value={orderForm.food_id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const f = availableFoods.find(item => String(item.food_id) === String(selectedId));
                    setOrderForm({
                      ...orderForm,
                      food_id: selectedId,
                      food_name: f ? f.food_name : orderForm.food_name,
                      price: f ? String(f.price) : orderForm.price
                    });
                  }}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                >
                  <option value="">-- Select Catalog Dish --</option>
                  {availableFoods.map((f) => (
                    <option key={f.food_id} value={f.food_id}>
                      {f.food_name} ({f.cuisine} - ₹{f.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Source Dropdown (Swiggy, Zomato, Project App) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Order Source *</label>
                <select
                  value={orderForm.order_source}
                  onChange={(e) => setOrderForm({ ...orderForm, order_source: e.target.value })}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                >
                  <option value="Swiggy">Swiggy</option>
                  <option value="Zomato">Zomato</option>
                  <option value="Project App">Project App</option>
                </select>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Indicates whether this historical record originated from Swiggy, Zomato, or the Project App.
                </span>
              </div>

              {/* Quantity and Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    required
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    placeholder="250"
                    value={orderForm.price}
                    onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                    required
                    style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              {/* Order Date */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Order Date *</label>
                <input
                  type="date"
                  value={orderForm.order_date}
                  onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })}
                  required
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.86rem' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddOrderOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px' }}
                >
                  {orderSubmitting ? 'Saving Order...' : 'Save Historical Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CUSTOMER PROFILE & PROJECT ORDER HISTORY                          */}
      {/* ========================================================================= */}
      {selectedCustomerDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card animate-scale-up" style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: '#ffffff'
                }}>
                  {selectedCustomerDetails.customer.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedCustomerDetails.customer.name}
                    <span className="badge badge-primary">{selectedCustomerDetails.customer.preferences}</span>
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Customer ID #{selectedCustomerDetails.customer.customer_id} • Status: {selectedCustomerDetails.customer.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerDetails(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
              >
                <X size={22} />
              </button>
            </div>

            {loadingDetails ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="animate-spin" color="#f97316" style={{ margin: '0 auto 12px' }} />
                <div>Loading customer profile and order history...</div>
              </div>
            ) : (
              <>
                {/* Profile Info Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  marginBottom: '20px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Email Address</span>
                    <span style={{ fontSize: '0.84rem', color: '#f8fafc', fontWeight: 600 }}>{selectedCustomerDetails.customer.email || 'None registered'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Phone Number</span>
                    <span style={{ fontSize: '0.84rem', color: '#f8fafc', fontWeight: 600 }}>{selectedCustomerDetails.customer.phone || 'None registered'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Age / Gender</span>
                    <span style={{ fontSize: '0.84rem', color: '#f8fafc', fontWeight: 600 }}>{selectedCustomerDetails.customer.age} yrs • {selectedCustomerDetails.customer.gender}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Location</span>
                    <span style={{ fontSize: '0.84rem', color: '#f8fafc', fontWeight: 600 }}>{selectedCustomerDetails.customer.location}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Registration Date</span>
                    <span style={{ fontSize: '0.84rem', color: '#f8fafc', fontWeight: 600 }}>{selectedCustomerDetails.customer.registration_date || 'N/A'}</span>
                  </div>
                </div>

                {/* Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Orders</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f97316' }}>{selectedCustomerDetails.stats.total_orders}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Spent</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>₹{selectedCustomerDetails.stats.total_spending.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Avg Order Value</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>₹{selectedCustomerDetails.stats.avg_order_value}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Avg Rating</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>★ {selectedCustomerDetails.stats.avg_rating}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Favorite Dish</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedCustomerDetails.stats.most_ordered_food}
                    </div>
                  </div>
                </div>

                {/* Project Order History Table */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <ShoppingBag size={18} color="#f97316" /> Customer Order History in Database
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {selectedCustomerDetails.order_history.length} database records
                      </span>
                      <button
                        onClick={() => {
                          setOrderForm({
                            customer_id: String(selectedCustomerDetails.customer.customer_id),
                            food_id: availableFoods.length > 0 ? String(availableFoods[0].food_id) : '',
                            food_name: availableFoods.length > 0 ? availableFoods[0].food_name : 'Biryani',
                            order_date: new Date().toISOString().split('T')[0],
                            quantity: 1,
                            price: availableFoods.length > 0 ? String(availableFoods[0].price) : '280',
                            order_source: 'Swiggy'
                          });
                          setIsAddOrderOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.76rem', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', gap: '4px' }}
                      >
                        <Plus size={14} /> Add Order for this Customer
                      </button>
                    </div>
                  </div>

                  {selectedCustomerDetails.order_history.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '10px' }}>
                      No orders recorded yet for this customer in the project database.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
                          <tr style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '10px 14px' }}>Order ID</th>
                            <th style={{ padding: '10px 14px' }}>Date</th>
                            <th style={{ padding: '10px 14px' }}>Item Ordered</th>
                            <th style={{ padding: '10px 14px' }}>Source</th>
                            <th style={{ padding: '10px 14px' }}>Qty</th>
                            <th style={{ padding: '10px 14px' }}>Total</th>
                            <th style={{ padding: '10px 14px' }}>Rating</th>
                            <th style={{ padding: '10px 14px' }}>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomerDetails.order_history.map((order, i) => (
                            <tr key={order.order_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f97316' }}>#{order.order_id}</td>
                              <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>{order.date} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({order.time_of_day})</span></td>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f8fafc' }}>
                                {order.food_name}
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{order.cuisine} • {order.category}</span>
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                {renderSourceBadge(order.order_source)}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>{order.quantity}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#10b981' }}>₹{order.total_price}</td>
                              <td style={{ padding: '10px 14px', color: '#fbbf24' }}>★ {order.rating}</td>
                              <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.76rem' }}>{order.payment_method}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Close Button */}
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedCustomerDetails(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION MODAL                                         */}
      {/* ========================================================================= */}
      {customerToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card animate-scale-up" style={{
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Confirm Permanent Deletion</h3>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>This action cannot be undone</span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Are you sure you want to permanently delete customer <strong>#{customerToDelete.customer_id} ({customerToDelete.name})</strong> from the database?
              The total customer count will decrease immediately.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                disabled={deletingCustomer}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {deletingCustomer ? 'Deleting...' : 'Yes, Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
