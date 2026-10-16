import React, { useState } from 'react';
import { 
  Sparkles, 
  Phone, 
  UserPlus, 
  LogIn, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Lock,
  Mail,
  MapPin,
  Utensils,
  Heart,
  User,
  KeyRound,
  RefreshCw,
  Info
} from 'lucide-react';
import { API_BASE } from '../config';

const CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata'];
const CUISINES = ['Indian', 'South Indian', 'Fast Food', 'Chinese', 'Continental'];
const DIETARY_OPTIONS = ['Standard', 'Vegetarian', 'Non-Vegetarian', 'Vegan', 'Halal', 'Eggetarian', 'Jain'];

export default function AuthView({ onLoginSuccess, onAdminLoginSuccess }) {
  // Modes: 'signin' | 'register' | 'admin'
  const [authMode, setAuthMode] = useState('signin');

  // Customer Sign-In State
  const [signInStep, setSignInStep] = useState(1); // 1: Enter mobile, 2: Enter OTP
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoOtpNotice, setDemoOtpNotice] = useState(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Customer Self-Registration Form State
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: 'Male',
    location: 'Hyderabad',
    preferences: 'Indian',
    food_tastes: 'Biryani, Spicy, Curries',
    dietary_preferences: 'Standard'
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccessData, setRegSuccessData] = useState(null);

  // Admin Sign-In State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Helper: Extract only digits from phone
  const getDigits = (str) => (str || '').replace(/\D/g, '');

  // =========================================================================
  // HANDLER: REQUEST OTP / SIGN IN STEP 1
  // =========================================================================
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setSignInError('');
    const digits = getDigits(mobileNumber);

    if (digits.length < 10) {
      setSignInError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSignInLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: digits })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`No customer account found with mobile number "${digits}". Please click "Create Account" above to register.`);
        }
        throw new Error(data.detail || 'Failed to request verification code.');
      }

      // If demo mode (real SMS not configured), capture demo OTP
      if (data.is_demo_mode && data.demo_otp) {
        setDemoOtpNotice({
          code: data.demo_otp,
          notice: data.notice || 'Development / Demo Verification Mode: Real SMS provider not configured. Use the verification code shown below.'
        });
        setOtpCode(data.demo_otp); // Pre-fill for convenience while keeping input editable
      } else {
        setDemoOtpNotice(null);
      }

      setSignInStep(2);
    } catch (err) {
      setSignInError(err.message || 'Error communicating with server.');
    } finally {
      setSignInLoading(false);
    }
  };

  // =========================================================================
  // HANDLER: VERIFY OTP / SIGN IN STEP 2
  // =========================================================================
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setSignInError('');

    const cleanOtp = (otpCode || '').trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setSignInError('Please enter the 6-digit verification code.');
      return;
    }

    setSignInLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: getDigits(mobileNumber),
          otp: cleanOtp
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid or expired verification code.');
      }

      // Store session token and customer in localStorage
      if (data.token) {
        localStorage.setItem('foodai_token', data.token);
      }
      if (data.customer) {
        localStorage.setItem('foodai_customer', JSON.stringify(data.customer));
      }

      // Notify parent App
      if (onLoginSuccess) {
        onLoginSuccess(data.customer, data.token);
      }
    } catch (err) {
      setSignInError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setSignInLoading(false);
    }
  };

  // =========================================================================
  // HANDLER: CUSTOMER SELF-REGISTRATION
  // =========================================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    // Validations
    if (!regForm.name || !regForm.name.trim()) {
      setRegError('Please enter your full name.');
      return;
    }

    const phoneDigits = getDigits(regForm.phone);
    if (phoneDigits.length < 10) {
      setRegError('Please provide a valid 10-digit mobile number.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regForm.email || !emailRegex.test(regForm.email.trim())) {
      setRegError('Please provide a valid email address (e.g. name@example.com).');
      return;
    }

    const ageNum = parseInt(regForm.age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setRegError('Please enter a valid age between 1 and 120.');
      return;
    }

    setRegLoading(true);
    try {
      const payload = {
        name: regForm.name.trim(),
        phone: phoneDigits,
        email: regForm.email.trim().toLowerCase(),
        age: ageNum,
        gender: regForm.gender,
        location: regForm.location,
        preferences: regForm.preferences,
        dietary_preferences: regForm.dietary_preferences
      };

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed.');
      }

      setRegSuccessData(data);
    } catch (err) {
      setRegError(err.message || 'Unable to register. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // =========================================================================
  // HANDLER: ADMIN SIGN IN
  // =========================================================================
  const handleAdminSignIn = async (e) => {
    e.preventDefault();
    setAdminError('');

    if (!adminUsername || !adminPassword) {
      setAdminError('Please enter administrator username and password.');
      return;
    }

    setAdminLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid administrator credentials.');
      }

      if (data.token) {
        localStorage.setItem('foodai_token', data.token);
        localStorage.setItem('foodai_role', 'admin');
      }

      if (onAdminLoginSuccess) {
        onAdminLoginSuccess(data.token);
      }
    } catch (err) {
      setAdminError(err.message || 'Admin sign in failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1e293b 0%, #0b0f19 80%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      color: '#f8fafc'
    }}>
      {/* Brand Hero Heading */}
      <div style={{ textAlign: 'center', marginBottom: '28px', maxWidth: '640px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
          boxShadow: '0 8px 25px rgba(249, 115, 22, 0.45)'
        }}>
          <Sparkles size={28} color="#ffffff" />
        </div>

        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Welcome to FoodAI
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          AI-Based Personalized Food Recommendation & Dining Intelligence System
        </p>

        {/* Value Prop Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.74rem', padding: '4px 10px' }}>
            🎯 Personalized Dishes
          </span>
          <span className="badge badge-success" style={{ fontSize: '0.74rem', padding: '4px 10px' }}>
            ⚡ Likely Next-Order Prediction
          </span>
          <span style={{
            fontSize: '0.74rem',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            fontWeight: 700
          }}>
            🛒 Self-Ordering & Basket
          </span>
        </div>
      </div>

      {/* Main Authentication Container Card */}
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: authMode === 'register' ? '620px' : '460px',
        padding: '32px 30px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        transition: 'all 0.3s ease'
      }}>

        {/* Tab Buttons: Sign In vs Create Account */}
        {authMode !== 'admin' && (
          <div style={{
            display: 'flex',
            background: '#0f172a',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '26px'
          }}>
            <button
              id="tab-sign-in-btn"
              onClick={() => {
                setAuthMode('signin');
                setSignInStep(1);
                setSignInError('');
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'signin' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'transparent',
                color: authMode === 'signin' ? '#ffffff' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <LogIn size={16} /> Sign In
            </button>

            <button
              id="tab-create-account-btn"
              onClick={() => {
                setAuthMode('register');
                setRegSuccessData(null);
                setRegError('');
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'register' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'transparent',
                color: authMode === 'register' ? '#ffffff' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <UserPlus size={16} /> Create Account
            </button>
          </div>
        )}

        {/* =========================================================================
            VIEW 1: SIGN IN (MOBILE + OTP VERIFICATION)
            ========================================================================= */}
        {authMode === 'signin' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                {signInStep === 1 ? 'Customer Sign In' : 'Verify Mobile Number'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                {signInStep === 1 
                  ? 'Enter your registered mobile number to receive your verification code.' 
                  : `Enter the 6-digit verification code sent for +91 ${getDigits(mobileNumber)}.`}
              </p>
            </div>

            {/* Error Banner */}
            {signInError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, lineHeight: 1.4 }}>
                  {signInError}
                  {signInError.includes('Create Account') && (
                    <button
                      onClick={() => {
                        setAuthMode('register');
                        setRegForm(prev => ({ ...prev, phone: getDigits(mobileNumber) }));
                      }}
                      style={{
                        display: 'block',
                        marginTop: '8px',
                        background: '#f97316',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Register Now &rarr;
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: Enter Mobile Number */}
            {signInStep === 1 ? (
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Registered Mobile Number
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <span style={{
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#f97316',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      +91
                    </span>
                    <input
                      id="signin-mobile-input"
                      type="tel"
                      placeholder="98765 43210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      autoFocus
                      required
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#f8fafc',
                        padding: '12px 14px',
                        fontSize: '0.92rem',
                        outline: 'none',
                        fontWeight: 600,
                        letterSpacing: '0.04em'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Enter 10-digit registered Indian mobile number
                  </span>
                </div>

                <button
                  id="request-otp-btn"
                  type="submit"
                  disabled={signInLoading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '12px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: signInLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {signInLoading ? 'Verifying Account...' : (
                    <>
                      <span>Continue with Mobile</span> <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: Enter Verification Code (OTP) */
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Clearly Labeled Development / Demo Mode Verification Notice */}
                {demoOtpNotice && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '12px',
                    padding: '14px',
                    color: '#fef3c7'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Info size={18} color="#f59e0b" />
                      <strong style={{ fontSize: '0.84rem', color: '#fbbf24' }}>Development / Demo Mode Verification</strong>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#fde68a', lineHeight: 1.4 }}>
                      Real SMS gateway not configured. Use the verification code below:
                    </p>
                    <div style={{
                      background: '#0f172a',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px dashed #f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>Demo Verification Code:</span>
                      <strong style={{ fontSize: '1.2rem', color: '#f97316', letterSpacing: '0.2em', fontFamily: 'monospace' }}>
                        {demoOtpNotice.code}
                      </strong>
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                      6-Digit Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setSignInStep(1)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f97316',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Change Number
                    </button>
                  </div>

                  <input
                    id="signin-otp-input"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      padding: '12px',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: '0.3em',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  id="verify-otp-btn"
                  type="submit"
                  disabled={signInLoading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '12px',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: signInLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {signInLoading ? 'Verifying Code...' : (
                    <>
                      <CheckCircle2 size={16} /> Complete Sign In
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    Didn't receive code? Resend
                  </button>
                </div>
              </form>
            )}

            {/* Quick Switch to Register */}
            <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                New customer?{' '}
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setRegSuccessData(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f97316',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Create an account here
                </button>
              </span>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: CUSTOMER SELF-REGISTRATION
            ========================================================================= */}
        {authMode === 'register' && (
          <div>
            {regSuccessData ? (
              /* Registration Success State */
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)'
                }}>
                  <CheckCircle2 size={36} color="#10b981" />
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                  Account Created Successfully!
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: '0 0 20px 0' }}>
                  Welcome to FoodAI, <strong>{regSuccessData.customer?.name}</strong>! Your customer account has been registered in the database.
                </p>

                {/* Account Details Box */}
                <div style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'left',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.82rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Customer ID:</span>
                    <strong style={{ color: '#f97316' }}>#{regSuccessData.customer?.customer_id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Mobile Number:</span>
                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>+91 {regSuccessData.customer?.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Email Address:</span>
                    <span style={{ color: '#f8fafc' }}>{regSuccessData.customer?.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Preferred Cuisine:</span>
                    <span style={{ color: '#f8fafc' }}>{regSuccessData.customer?.preferences}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Dietary Preference:</span>
                    <span style={{ color: '#f8fafc' }}>{regSuccessData.customer?.dietary_preferences || 'Standard'}</span>
                  </div>
                </div>

                {/* Email Delivery Status Notice (Explicit & Transparent) */}
                <div style={{
                  background: regSuccessData.email_status && regSuccessData.email_status.includes('successfully') && !regSuccessData.email_status.includes('not configured')
                    ? 'rgba(16, 185, 129, 0.12)' 
                    : 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  marginBottom: '22px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '0.78rem'
                }}>
                  <Mail size={16} color="#fbbf24" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', color: '#f8fafc', marginBottom: '2px' }}>
                      Email Notification Status:
                    </strong>
                    <span style={{ color: '#cbd5e1' }}>
                      {regSuccessData.email_status || 'Email delivery is pending configuration (SMTP credentials not configured on server).'}
                    </span>
                  </div>
                </div>

                {/* Direct Action: Proceed to Sign In */}
                <button
                  id="reg-proceed-to-signin-btn"
                  onClick={() => {
                    setMobileNumber(regSuccessData.customer?.phone || '');
                    setAuthMode('signin');
                    setSignInStep(1);
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontWeight: 800 }}
                >
                  Sign In with Your New Account <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              /* Self-Registration Form */
              <div>
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>
                    Create Customer Account
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    Register your details to receive personalized food recommendations and order history tracking.
                  </p>
                </div>

                {/* Error Banner */}
                {regError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Row 1: Full Name */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                      Full Name *
                    </label>
                    <input
                      id="reg-name-input"
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Row 2: Mobile Number & Email Address */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Mobile Number *
                      </label>
                      <input
                        id="reg-phone-input"
                        type="tel"
                        placeholder="10-digit number"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Email Address *
                      </label>
                      <input
                        id="reg-email-input"
                        type="email"
                        placeholder="name@example.com"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 3: Age & Gender & City */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Age *
                      </label>
                      <input
                        id="reg-age-input"
                        type="number"
                        min="1"
                        max="120"
                        placeholder="25"
                        value={regForm.age}
                        onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '10px 12px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Gender *
                      </label>
                      <select
                        value={regForm.gender}
                        onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '10px 8px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Location / City *
                      </label>
                      <select
                        value={regForm.location}
                        onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '10px 8px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Preferred Cuisine & Dietary Preference */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Preferred Cuisine *
                      </label>
                      <select
                        value={regForm.preferences}
                        onChange={(e) => setRegForm({ ...regForm, preferences: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '10px 8px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {CUISINES.map(cuis => <option key={cuis} value={cuis}>{cuis}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Dietary Preference
                      </label>
                      <select
                        value={regForm.dietary_preferences}
                        onChange={(e) => setRegForm({ ...regForm, dietary_preferences: e.target.value })}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          padding: '10px 8px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {DIETARY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="submit-register-btn"
                    type="submit"
                    disabled={regLoading}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '12px',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      marginTop: '6px',
                      cursor: regLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {regLoading ? 'Creating Profile...' : (
                      <>
                        <UserPlus size={16} /> Register & Create Account
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Sign In */}
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Already have an account?{' '}
                    <button
                      onClick={() => setAuthMode('signin')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f97316',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Sign In here
                    </button>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 3: ADMIN PORTAL SIGN IN
            ========================================================================= */}
        {authMode === 'admin' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <ShieldCheck size={26} color="#38bdf8" />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                System Administrator Sign In
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Sign in with administrative credentials to access customer management, food catalog, and order analytics.
              </p>
            </div>

            {/* Admin Error Banner */}
            {adminError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Admin Username
                </label>
                <input
                  id="admin-username-input"
                  type="text"
                  placeholder="admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    padding: '11px 14px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Admin Password
                </label>
                <input
                  id="admin-password-input"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    padding: '11px 14px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Default development password: <code>admin123</code>
                </span>
              </div>

              <button
                id="admin-signin-btn"
                type="submit"
                disabled={adminLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  cursor: adminLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {adminLoading ? 'Authenticating...' : (
                  <>
                    <ShieldCheck size={16} /> Sign In to Admin Panel
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                &larr; Return to Customer Sign In
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Footer Switch to Admin Portal (when on customer views) */}
      {authMode !== 'admin' && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            id="switch-to-admin-portal-btn"
            onClick={() => {
              setAuthMode('admin');
              setAdminError('');
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: '#94a3b8',
              fontSize: '0.76rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={14} color="#38bdf8" />
            <span>Administrator Access</span>
          </button>
        </div>
      )}
    </div>
  );
}
