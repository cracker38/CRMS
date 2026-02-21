import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SystemAdminDashboard from './SystemAdminDashboard';
import ProjectManagerDashboard from './ProjectManagerDashboard';
import SiteSupervisorDashboard from './SiteSupervisorDashboard';
import ProcurementOfficerDashboard from './ProcurementOfficerDashboard';
import FinanceOfficerDashboard from './FinanceOfficerDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const wrapperRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    if (notificationsOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [notificationsOpen]);

  const fetchNotifications = useCallback(async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        setNotifications([]);
        return;
      }
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        const unread = list.filter(n => !n.read && !n.is_read);
        setNotifications(unread);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      setNotifications([]);
    }
  }, [token]);

  const handleMarkAsRead = useCallback(async (notifId) => {
    try {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) return;
      await fetch(`http://localhost:5000/api/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      fetchNotifications();
    } catch (e) { /* ignore */ }
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (token || user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token, user?.id, fetchNotifications]);

  const handleSidebarClick = (tab) => {
    setActiveSidebarTab(tab);
  };

  const renderDashboard = () => {
    switch (user?.role) {
      case 'SYSTEM_ADMIN':
        return <SystemAdminDashboard activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} onRefreshNotifications={fetchNotifications} />;
      case 'PROJECT_MANAGER':
        return <ProjectManagerDashboard activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} onRefreshNotifications={fetchNotifications} />;
      case 'SITE_SUPERVISOR':
        return <SiteSupervisorDashboard activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} onRefreshNotifications={fetchNotifications} />;
      case 'PROCUREMENT_OFFICER':
        return <ProcurementOfficerDashboard activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} onRefreshNotifications={fetchNotifications} />;
      case 'FINANCE_OFFICER':
        return <FinanceOfficerDashboard activeTab={activeSidebarTab} onTabChange={setActiveSidebarTab} onRefreshNotifications={fetchNotifications} />;
      default:
        return (
          <div className="alert alert-warning">
            <h5><i className="icon fas fa-exclamation-triangle"></i> Unknown Role</h5>
            Your role is not recognized. Please contact system administrator.
          </div>
        );
    }
  };

  const getRoleName = (role) => {
    if (!role) return '';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleLogout = (e) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      // Redirect will be handled by ProtectedRoute when user becomes null
      navigate('/login', { replace: true });
    }
  };

  // Get sidebar menu items based on role
  const getSidebarMenuItems = () => {
    const items = [
      { id: 'overview', icon: 'fa-tachometer-alt', label: 'Dashboard' }
    ];

    if (user?.role === 'SYSTEM_ADMIN') {
      items.push(
        { id: 'users', icon: 'fa-users', label: 'User Management' },
        { id: 'projects', icon: 'fa-project-diagram', label: 'Projects' },
        { id: 'employees', icon: 'fa-user-friends', label: 'Employees' },
        { id: 'equipment', icon: 'fa-tools', label: 'Equipment' },
        { id: 'audit-logs', icon: 'fa-clipboard-list', label: 'Audit Logs' },
        { id: 'procurement', icon: 'fa-shopping-cart', label: 'Procurement' },
        { id: 'reports', icon: 'fa-file-alt', label: 'Reports' },
        { id: 'settings', icon: 'fa-cog', label: 'Settings' },
        { id: 'auditor', icon: 'fa-shield-alt', label: 'Virtual Auditor' }
      );
    } else if (user?.role === 'PROJECT_MANAGER') {
      items.push(
        { id: 'projects', icon: 'fa-project-diagram', label: 'Projects' },
        { id: 'sites', icon: 'fa-building', label: 'Sites' },
        { id: 'material-requests', icon: 'fa-clipboard-list', label: 'Material Requests' },
        { id: 'monitoring', icon: 'fa-chart-line', label: 'Monitoring' },
        { id: 'procurement', icon: 'fa-shopping-cart', label: 'Procurement & Financial' },
        { id: 'reports', icon: 'fa-file-alt', label: 'Reports' }
      );
    } else if (user?.role === 'SITE_SUPERVISOR') {
      items.push(
        { id: 'material-requests', icon: 'fa-clipboard-list', label: 'Material Requests' },
        { id: 'daily-activity', icon: 'fa-calendar-day', label: 'Daily Activity' },
        { id: 'attendance', icon: 'fa-user-check', label: 'Attendance' },
        { id: 'equipment', icon: 'fa-tools', label: 'Equipment' },
        { id: 'reports', icon: 'fa-file-alt', label: 'Reports' }
      );
    } else if (user?.role === 'FINANCE_OFFICER') {
      items.push(
        { id: 'payments', icon: 'fa-money-check-alt', label: 'Payments' },
        { id: 'purchase-orders', icon: 'fa-shopping-cart', label: 'Purchase Orders' },
        { id: 'invoices', icon: 'fa-file-invoice', label: 'Invoices & Receipts' },
        { id: 'budgets', icon: 'fa-chart-pie', label: 'Budgets' },
        { id: 'reports', icon: 'fa-file-alt', label: 'Reports' }
      );
    } else if (user?.role === 'PROCUREMENT_OFFICER') {
      items.push(
        { id: 'purchase-orders', icon: 'fa-shopping-cart', label: 'Purchase Orders' },
        { id: 'quotations', icon: 'fa-file-alt', label: 'Quotations' },
        { id: 'suppliers', icon: 'fa-truck', label: 'Suppliers' },
        { id: 'materials', icon: 'fa-boxes', label: 'Materials' },
        { id: 'reports', icon: 'fa-chart-bar', label: 'Reports' }
      );
    } else {
      // For other roles, show common menu items
      items.push(
        { id: 'projects', icon: 'fa-project-diagram', label: 'Projects' },
        { id: 'reports', icon: 'fa-file-alt', label: 'Reports' },
        { id: 'settings', icon: 'fa-cog', label: 'Settings' }
      );
    }

    return items;
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div
      className={`wrapper ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}
      ref={wrapperRef}
    >
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light border-bottom">
        {/* Left navbar links */}
        <ul className="navbar-nav">
          <li className="nav-item">
            <a
              className={`nav-link sidebar-toggle ${isSidebarOpen ? 'active' : ''}`}
              href="#"
              role="button"
              aria-label="Toggle sidebar navigation"
              aria-expanded={isSidebarOpen}
              onClick={(e) => {
                e.preventDefault();
                toggleSidebar();
              }}
            >
              <i className="fas fa-bars"></i>
            </a>
          </li>
        </ul>

        {/* Right navbar links */}
        <ul className="navbar-nav ml-auto">
          {/* Notifications Dropdown Menu */}
          <li ref={notificationsRef} className={`nav-item dropdown ${notificationsOpen ? 'show' : ''}`}>
            <a
              className="nav-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setNotificationsOpen(prev => !prev);
                if (!notificationsOpen) fetchNotifications();
              }}
              aria-expanded={notificationsOpen}
              aria-haspopup="true"
            >
              <i className="far fa-bell"></i>
              {notifications.length > 0 && (
                <span className="badge badge-warning navbar-badge">{notifications.length}</span>
              )}
            </a>
            <div
              className={`dropdown-menu dropdown-menu-lg dropdown-menu-right notifications-dropdown ${notificationsOpen ? 'show' : ''}`}
              style={{
                maxWidth: 'min(400px, calc(100vw - 2rem))',
                maxHeight: 'min(400px, 70vh)',
                overflowY: 'auto'
              }}
            >
              <span className="dropdown-item dropdown-header text-wrap">
                {notifications.length} Unread {notifications.length === 1 ? 'Notification' : 'Notifications'}
              </span>
              <div className="dropdown-divider"></div>
              {notifications.length === 0 ? (
                <div className="dropdown-item text-center py-4 text-muted">
                  <i className="fas fa-bell-slash fa-2x mb-2 d-block opacity-50"></i>
                  <small>No new notifications</small>
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.slice(0, 10).map((notif, idx) => (
                      <a
                        key={notif.id || idx}
                        href="#"
                        className="dropdown-item py-2 text-wrap"
                        style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                        onClick={(e) => {
                          e.preventDefault();
                          if (notif.id) handleMarkAsRead(notif.id);
                        }}
                      >
                        <i className="fas fa-circle text-primary mr-2 flex-shrink-0" style={{ fontSize: '6px', verticalAlign: 'middle' }}></i>
                        <span>{notif.message || notif.title || 'New notification'}</span>
                      </a>
                    ))}
                  </div>
                  {notifications.length > 10 && (
                    <a href="#" className="dropdown-item dropdown-footer text-center text-muted py-2" onClick={(e) => e.preventDefault()}>
                      <small>And {notifications.length - 10} more</small>
                    </a>
                  )}
                </>
              )}
            </div>
          </li>
          
          {/* User Dropdown Menu */}
          <li className="nav-item dropdown">
            <a 
              className="nav-link" 
              data-toggle="dropdown" 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (window.$ && window.$.fn.dropdown) {
                  window.$(e.currentTarget).dropdown('toggle');
                } else {
                  // Fallback if Bootstrap dropdown not initialized
                  const dropdown = e.currentTarget.nextElementSibling;
                  if (dropdown) {
                    dropdown.classList.toggle('show');
                  }
                }
              }}
            >
              <i className="far fa-user"></i>
              <span className="ml-2 d-none d-md-inline">{user?.first_name} {user?.last_name}</span>
            </a>
            <div className="dropdown-menu dropdown-menu-lg dropdown-menu-right">
              <span className="dropdown-item dropdown-header">
                {getRoleName(user?.role)}
              </span>
              <div className="dropdown-divider"></div>
              <a href="#" className="dropdown-item" onClick={(e) => e.preventDefault()}>
                <i className="fas fa-user mr-2"></i> Profile
              </a>
              <a href="#" className="dropdown-item" onClick={(e) => e.preventDefault()}>
                <i className="fas fa-cog mr-2"></i> Settings
              </a>
              <div className="dropdown-divider"></div>
              <a href="#" className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2"></i> Logout
              </a>
            </div>
          </li>
        </ul>
      </nav>

      {/* Main Sidebar Container */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        {/* Brand Logo */}
        <a href="#" className="brand-link" onClick={(e) => e.preventDefault()}>
          <span className="brand-text font-weight-light">
            <i className="fas fa-building mr-2"></i>
            <strong>CRMS</strong>
          </span>
        </a>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Sidebar user panel */}
          <div className="user-panel mt-3 pb-3 mb-3 d-flex">
            <div className="image">
              <div 
                className="img-circle elevation-2 bg-primary d-flex align-items-center justify-content-center" 
                style={{
                  width: '40px', 
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#007bff'
                }}
              >
                <span style={{color: 'white', fontWeight: 'bold', fontSize: '14px'}}>
                  {user?.first_name?.[0] || 'U'}{user?.last_name?.[0] || ''}
                </span>
              </div>
            </div>
            <div className="info">
              <a href="#" className="d-block" onClick={(e) => e.preventDefault()}>
                {user?.first_name || 'User'} {user?.last_name || ''}
              </a>
              <small className="text-muted">{getRoleName(user?.role)}</small>
            </div>
          </div>

          {/* Sidebar Menu */}
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
              {getSidebarMenuItems().map((item) => (
                <li key={item.id} className="nav-item">
                  <a 
                    href="#" 
                    className={`nav-link ${activeSidebarTab === item.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSidebarClick(item.id);
                    }}
                  >
                    <i className={`nav-icon fas ${item.icon}`}></i>
                    <p>{item.label}</p>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Backdrop for sidebar on smaller screens */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Content Wrapper */}
      <div className="content-wrapper">
        {/* Content Header */}
        <div className="content-header">
          <div className="container-fluid responsive-container">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Dashboard</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><a href="#" onClick={(e) => e.preventDefault()}>Home</a></li>
                  <li className="breadcrumb-item active">Dashboard</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <section className="content">
          {renderDashboard()}
        </section>
      </div>

      {/* Footer */}
      <footer className="main-footer">
        <strong>Copyright &copy; 2024 <a href="#" onClick={(e) => e.preventDefault()}>CRMS</a>.</strong>
        All rights reserved.
        <div className="float-right d-none d-sm-inline-block">
          <b>Version</b> 1.0.0
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
