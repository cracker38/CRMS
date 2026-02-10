import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Typewriter from './Typewriter';
import './Login.css';
import './Typewriter.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Redirect to dashboard based on role
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side - Services Showcase */}
        <div className="services-side">
          <div className="services-content">
            <div className="logo-section">
                <div className="logo-container">
                <div className="logo-icon">
                  <i className="fas fa-building" style={{ fontSize: '70px', color: '#ffffff' }}></i>
                </div>
                <div className="logo-text">
                  <h1 className="system-name">
                    CRMS
                  </h1>
                  <p className="system-tagline">
                    Construction Resource Management System
                  </p>
                </div>
              </div>
            </div>

            <div className="services-description">
              <p className="description-text">
                A comprehensive web-based platform designed to automate, monitor, and optimize 
                the management of construction materials, equipment, workforce, procurement, 
                finances, and project progress.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-project-diagram" style={{ fontSize: '48px', color: '#ffffff' }}></i>
                </div>
                <h3>Project & Resource Management</h3>
                <p>Real-time project monitoring, inventory tracking, equipment management, and workforce coordination with automated alerts</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-dollar-sign" style={{ fontSize: '48px', color: '#ffffff' }}></i>
                </div>
                <h3>Financial & Reporting System</h3>
                <p>Budget management, expense tracking, procurement workflow, payment approvals, and advanced analytics with role-based reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-side">
          <div className="login-form-container">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your account</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="error-message">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span> Signing in...
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

