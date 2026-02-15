import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Import jspdf-autotable as side effect - it extends jsPDF prototype
import 'jspdf-autotable';

const SystemAdminDashboard = ({ activeTab: propActiveTab, onTabChange, onRefreshNotifications }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    activeProjects: 0,
    totalExpenses: 0,
    totalBudget: 0,
    systemHealth: 100
  });

  const roles = ['SYSTEM_ADMIN', 'PROJECT_MANAGER', 'SITE_SUPERVISOR', 'PROCUREMENT_OFFICER', 'FINANCE_OFFICER'];

  // Sync with prop changes from parent (sidebar clicks)
  useEffect(() => {
    if (propActiveTab !== undefined && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  // Update parent when tab changes internally (from tab navigation)
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const response = await fetch('http://localhost:5000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } else if (activeTab === 'employees') {
        const [employeesRes, usersRes] = await Promise.all([
          fetch('http://localhost:5000/api/employees', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:5000/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (employeesRes.ok) {
          const empData = await employeesRes.json();
          setEmployees(Array.isArray(empData) ? empData : []);
        } else {
          setEmployees([]);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(Array.isArray(usersData) ? usersData : []);
        }
      } else if (activeTab === 'equipment') {
        const response = await fetch('http://localhost:5000/api/equipment', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setEquipment(Array.isArray(data) ? data : []);
        } else {
          setEquipment([]);
        }
      } else if (activeTab === 'projects') {
        const response = await fetch('http://localhost:5000/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } else if (activeTab === 'audit-logs') {
        try {
          const response = await fetch('http://localhost:5000/api/reports/user-activity?startDate=&endDate=', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setAuditLogs(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          setAuditLogs([]);
        }
      } else if (activeTab === 'procurement') {
        const response = await fetch('http://localhost:5000/api/procurement/purchase-orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPurchaseOrders(Array.isArray(data) ? data : []);
        }
      } else if (activeTab === 'materials') {
        const response = await fetch('http://localhost:5000/api/materials', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMaterials(Array.isArray(data) ? data : []);
        }
      } else {
        // Fetch overview stats
        const [usersRes, projectsRes, expensesRes, posRes] = await Promise.all([
          fetch('http://localhost:5000/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false })),
          fetch('http://localhost:5000/api/projects', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false })),
          fetch('http://localhost:5000/api/expenses', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false })),
          fetch('http://localhost:5000/api/procurement/purchase-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => ({ ok: false }))
        ]);

        const usersData = usersRes.ok ? await usersRes.json().catch(() => []) : [];
        const projectsData = projectsRes.ok ? await projectsRes.json().catch(() => []) : [];
        const expensesData = expensesRes.ok ? await expensesRes.json().catch(() => []) : [];
        const posData = posRes.ok ? await posRes.json().catch(() => []) : [];

        setUsers(Array.isArray(usersData) ? usersData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
        setPurchaseOrders(Array.isArray(posData) ? posData : []);

        const totalBudget = (Array.isArray(projectsData) ? projectsData : []).reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
        const totalExpenses = (Array.isArray(expensesData) ? expensesData : []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // Active projects = PLANNING, IN_PROGRESS, ON_HOLD (projects table has no 'ACTIVE')
        const activeProjectStatuses = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD'];
        const activeProjectsCount = (Array.isArray(projectsData) ? projectsData : []).filter(p => activeProjectStatuses.includes(p.status)).length;

        setStats({
          totalUsers: (Array.isArray(usersData) ? usersData : []).length,
          activeUsers: (Array.isArray(usersData) ? usersData : []).filter(u => u.status === 'ACTIVE').length,
          activeProjects: activeProjectsCount,
          totalExpenses: totalExpenses,
          totalBudget: totalBudget,
          systemHealth: calculateSystemHealth(usersData, projectsData, expensesData)
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/virtual-auditor/alerts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(() => null);

      if (!response || !response.ok) {
        setAlerts([]);
        return;
      }

      const rawData = await response.json().catch(() => []);
      if (!Array.isArray(rawData)) {
        setAlerts([]);
        return;
      }

      // Normalize backend data shape to what the UI expects
      const normalized = rawData.map((alert, index) => ({
        id:
          alert.id ||
          alert.userId ||
          alert.projectId ||
          `${alert.type || 'INFO'}-${index}`,
        type: alert.type || 'LOW',
        category: alert.category || 'GENERAL',
        title: alert.title || 'System Alert',
        message: alert.message || alert.description || '',
        timestamp: alert.timestamp || alert.created_at || new Date(),
        userId: alert.userId,
        projectId: alert.projectId
      }));

      setAlerts(normalized);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    }
  };

  const handleDismissAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const handleInvestigateAlert = (alert) => {
    setSelectedAlert(alert);
    setShowAlertModal(true);
  };

  const calculateSystemHealth = (users, projects, expenses) => {
    let health = 100;
    const usersArray = Array.isArray(users) ? users : [];
    const projectsArray = Array.isArray(projects) ? projects : [];
    const expensesArray = Array.isArray(expenses) ? expenses : [];
    
    const inactiveUsers = usersArray.filter(u => u.status === 'INACTIVE').length;
    if (inactiveUsers > usersArray.length * 0.2 && usersArray.length > 0) health -= 10;
    
    return Math.max(0, Math.min(100, health));
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (userData) => {
    try {
      // Validate required fields
      if (!userData.first_name || !userData.last_name || !userData.email || !userData.role) {
        alert('Please fill in all required fields');
        return;
      }

      // For new users, password is required
      if (!editingUser && !userData.password) {
        alert('Password is required for new users');
        return;
      }

      const url = editingUser 
        ? `http://localhost:5000/api/users/${editingUser.id}`
        : 'http://localhost:5000/api/auth/register';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      // Prepare payload - don't send password if editing and password is empty
      const payload = { ...userData };
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const currentEditingUser = editingUser;
        setShowUserModal(false);
        setEditingUser(null);
        fetchData();
        if (!currentEditingUser) onRefreshNotifications?.();
        alert(currentEditingUser ? 'User updated successfully' : 'User created successfully');
      } else {
        alert(data.message || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + (error.message || 'Network error'));
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Reset password to default? User will need to change it on next login.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Password reset successfully. Default password: ${data.defaultPassword}`);
        fetchData();
      } else {
        alert('Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password');
    }
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...user, status })
      });

      if (response.ok) {
        fetchData();
        alert(`User ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
      } else {
        alert('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const handleCreateMaterial = async (formData) => {
    try {
      const response = await fetch('http://localhost:5000/api/materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        await fetchData();
        setShowMaterialModal(false);
        alert('Material created successfully');
      } else {
        const errorMessage = data.message || data.error || 'Failed to create material';
        console.error('Material creation error:', data);
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating material:', error);
      alert(`Error creating material: ${error.message || 'Network error'}`);
    }
  };

  const handleGenerateReport = async (reportType, filters = {}) => {
    try {
      let url = `http://localhost:5000/api/reports?type=${reportType}`;
      if (filters.startDate) url += `&startDate=${filters.startDate}`;
      if (filters.endDate) url += `&endDate=${filters.endDate}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        setSelectedReportType(reportType);
        setShowReportModal(true);
      } else {
        alert('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    }
  };

  const exportToPDF = () => {
    if (!reportData || !selectedReportType) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const title = getReportTitle(selectedReportType);
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, yPos);
      yPos += 15;

      // Date range
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateRange = `Generated on: ${new Date().toLocaleDateString()}`;
      const dateWidth = doc.getTextWidth(dateRange);
      doc.text(dateRange, (pageWidth - dateWidth) / 2, yPos);
      yPos += 10;

      // Table data
      const tableData = formatReportDataForPDF(selectedReportType, reportData);
      
      if (typeof doc.autoTable !== 'function') {
        alert('PDF export plugin not loaded. Please refresh the page.');
        return;
      }

      doc.autoTable({
        head: [tableData.headers],
        body: tableData.rows,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [70, 130, 180], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.save(`${selectedReportType}-report.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF: ' + error.message);
    }
  };

  const exportToExcel = () => {
    if (!reportData || !selectedReportType) return;

    try {
      const tableData = formatReportDataForExcel(selectedReportType, reportData);
      const ws = XLSX.utils.aoa_to_sheet([tableData.headers, ...tableData.rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${selectedReportType}-report.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel');
    }
  };

  const getReportTitle = (reportType) => {
    const titles = {
      'user-activity': 'User Activity Report',
      'audit-log': 'System Audit Log Report',
      'procurement-summary': 'Procurement Summary Report',
      'project-financial-summary': 'Full Project Financial Summary Report',
      'budget-vs-actual': 'Budget vs Actual Report',
      'system-health': 'System Health Report',
      'virtual-auditor-alerts': 'Virtual Auditor Alerts Report'
    };
    return titles[reportType] || 'Report';
  };

  const formatReportDataForPDF = (reportType, data) => {
    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return { headers: ['No Data'], rows: [['No records found']] };
    }

    switch (reportType) {
      case 'user-activity':
      case 'audit-log':
        if (!Array.isArray(data)) return { headers: ['No Data'], rows: [['No records found']] };
        return {
          headers: ['Timestamp', 'User', 'Action', 'Table', 'Record ID'],
          rows: data.map(item => [
            new Date(item.created_at).toLocaleString(),
            `${item.first_name || ''} ${item.last_name || ''} (${item.email || 'N/A'})`,
            item.action || 'N/A',
            item.table_name || 'N/A',
            item.record_id || 'N/A'
          ])
        };
      case 'procurement-summary':
        if (!Array.isArray(data)) return { headers: ['No Data'], rows: [['No records found']] };
        return {
          headers: ['PO Number', 'Supplier', 'Order Date', 'Total Amount', 'Status'],
          rows: data.map(item => [
            item.po_number || 'N/A',
            item.supplier_name || 'N/A',
            new Date(item.order_date).toLocaleDateString(),
            `$${parseFloat(item.total_amount || 0).toFixed(2)}`,
            item.status || 'N/A'
          ])
        };
      case 'project-financial-summary':
        if (!Array.isArray(data)) return { headers: ['No Data'], rows: [['No records found']] };
        return {
          headers: ['Project', 'Budget', 'Spent', 'Approved Pending', 'Pending', 'Remaining'],
          rows: data.map(item => [
            item.name || 'N/A',
            `$${parseFloat(item.budget || 0).toFixed(2)}`,
            `$${parseFloat(item.total_spent || 0).toFixed(2)}`,
            `$${parseFloat(item.approved_pending || 0).toFixed(2)}`,
            `$${parseFloat(item.pending || 0).toFixed(2)}`,
            `$${parseFloat(item.remaining_budget || 0).toFixed(2)}`
          ])
        };
      case 'budget-vs-actual':
        if (!Array.isArray(data)) return { headers: ['No Data'], rows: [['No records found']] };
        return {
          headers: ['Project', 'Budget', 'Actual Spent', 'Variance', 'Percentage Used'],
          rows: data.map(item => [
            item.name || 'N/A',
            `$${parseFloat(item.budget || 0).toFixed(2)}`,
            `$${parseFloat(item.actual_spent || 0).toFixed(2)}`,
            `$${parseFloat(item.variance || 0).toFixed(2)}`,
            `${item.percentage_used || 0}%`
          ])
        };
      case 'system-health':
        if (typeof data !== 'object') return { headers: ['No Data'], rows: [['No records found']] };
        return {
          headers: ['Metric', 'Value'],
          rows: [
            ['Total Users', data.users?.total || 0],
            ['Active Users', data.users?.active || 0],
            ['Total Projects', data.projects?.total || 0],
            ['Active Projects', data.projects?.active || 0],
            ['Total Expenses', `$${parseFloat(data.expenses?.total_amount || 0).toFixed(2)}`],
            ['Recent Activity (24h)', data.recentActivity?.total || 0]
          ]
        };
      case 'virtual-auditor-alerts':
        if (typeof data !== 'object') return { headers: ['No Data'], rows: [['No records found']] };
        const rows = [];
        if (data.failedLogins && data.failedLogins.length > 0) {
          rows.push(['FAILED LOGIN ATTEMPTS', '', '', '', '']);
          data.failedLogins.forEach(item => {
            rows.push([
              item.email || 'N/A',
              `${item.first_name || ''} ${item.last_name || ''}`,
              item.failed_attempts || 0,
              new Date(item.last_attempt).toLocaleString(),
              'HIGH RISK'
            ]);
          });
        }
        if (data.budgetOverruns && data.budgetOverruns.length > 0) {
          rows.push(['BUDGET OVERRUNS', '', '', '', '']);
          data.budgetOverruns.forEach(item => {
            rows.push([
              item.name || 'N/A',
              `$${parseFloat(item.budget || 0).toFixed(2)}`,
              `$${parseFloat(item.total_spent || 0).toFixed(2)}`,
              `$${parseFloat(item.overrun_amount || 0).toFixed(2)}`,
              `${item.percentage_used || 0}%`
            ]);
          });
        }
        if (rows.length === 0) {
          return { headers: ['No Alerts'], rows: [['No suspicious activity detected']] };
        }
        return {
          headers: ['Item', 'Details 1', 'Details 2', 'Details 3', 'Risk Level'],
          rows: rows
        };
      default:
        return { headers: ['Data'], rows: [[JSON.stringify(data)]] };
    }
  };

  const formatReportDataForExcel = (reportType, data) => {
    return formatReportDataForPDF(reportType, data);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getHealthColor = (health) => {
    if (health >= 80) return 'success';
    if (health >= 60) return 'warning';
    return 'danger';
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid responsive-container">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">
                <i className="fas fa-user-shield mr-2"></i>
                System Administrator Dashboard
                <small className="text-muted ml-2">- CRMS</small>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid responsive-container">
      {loading && (
        <div className="overlay-wrapper">
          <div className="overlay">
            <i className="fas fa-3x fa-sync-alt fa-spin"></i>
            <div className="text-bold pt-2">Loading...</div>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Small boxes (Stat boxes) */}
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{stats.totalUsers}</h3>
                  <p>Total Users</p>
                </div>
                <div className="icon">
                  <i className="fas fa-users"></i>
                </div>
                <a href="#" className="small-box-footer" onClick={(e) => { e.preventDefault(); handleTabChange('users'); }}>
                  More info <i className="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{stats.activeProjects}</h3>
                  <p>Active Projects</p>
                </div>
                <div className="icon">
                  <i className="fas fa-project-diagram"></i>
                </div>
                <a href="#" className="small-box-footer" onClick={(e) => { e.preventDefault(); handleTabChange('projects'); }}>
                  More info <i className="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>${(stats.totalBudget / 1000000).toFixed(1)}M</h3>
                  <p>Total Budget</p>
                </div>
                <div className="icon">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <a href="#" className="small-box-footer" onClick={(e) => { e.preventDefault(); handleTabChange('projects'); }}>
                  More info <i className="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="row">
            <div className="col-md-12">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-heartbeat mr-2"></i>
                    System Health
                  </h3>
                  <div className="card-tools">
                    <span className={`badge badge-${getHealthColor(stats.systemHealth)}`}>
                      {stats.systemHealth}% Healthy
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="progress-group">
                    <span>System Health Status</span>
                    <span className="float-right"><b>{stats.systemHealth}%</b></span>
                  </div>
                  <div className="progress progress-lg">
                    <div 
                      className={`progress-bar bg-${getHealthColor(stats.systemHealth)} progress-bar-striped progress-bar-animated`}
                      role="progressbar"
                      style={{ width: `${stats.systemHealth}%` }}
                      aria-valuenow={stats.systemHealth}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {stats.systemHealth}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </div>

          {/* Recent Activity & Alerts */}
          <div className="row">
            <div className="col-md-6">
              <div className="card card-info card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-history mr-2"></i>
                    Recent Activity
                  </h3>
                  <div className="card-tools">
                    <button type="button" className="btn btn-tool" onClick={() => handleTabChange('audit-logs')}>
                      <i className="fas fa-external-link-alt"></i>
        </button>
      </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover m-0">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>User</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.length > 0 ? auditLogs.slice(0, 5).map((log, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className={`badge badge-${(log.action || '').includes('CREATE') ? 'success' : (log.action || '').includes('UPDATE') ? 'warning' : 'info'}`}>
                                {log.action || 'Activity'}
                              </span>
                            </td>
                            <td>{(log.first_name || '')} {(log.last_name || '')}</td>
                            <td><small>{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</small></td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="3" className="text-center py-4">
                              <i className="fas fa-info-circle text-muted mr-2"></i>
                              No recent activity
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card card-warning card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-bell mr-2"></i>
                    System Alerts
                  </h3>
                  <div className="card-tools">
                    <span className="badge badge-warning">{alerts.length}</span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <ul className="products-list product-list-in-card pl-2 pr-2">
                    {alerts.length > 0 ? alerts.slice(0, 3).map(alert => (
                      <li key={alert.id} className="item">
                        <div className="product-info">
                          <a 
                            href="#" 
                            className="product-title" 
                            onClick={(e) => {
                              e.preventDefault();
                              handleTabChange('auditor');
                            }}
                          >
                            {alert.title}
                            <span className={`badge badge-${alert.type === 'HIGH' ? 'danger' : alert.type === 'MEDIUM' ? 'warning' : 'info'} float-right`}>
                              {alert.type}
                            </span>
                          </a>
                          <span className="product-description">
                            {alert.message}
                          </span>
                          <small className="text-muted">
                            {new Date(alert.timestamp).toLocaleString()}
                          </small>
                        </div>
                      </li>
                    )) : (
                      <li className="item">
                        <div className="product-info">
                          <span className="product-description">
                            <i className="fas fa-check-circle text-success mr-2"></i>
                            No active alerts. System operating normally.
                          </span>
                        </div>
                      </li>
                    )}
                  </ul>
            </div>
                {alerts.length > 3 && (
                  <div className="card-footer text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleTabChange('auditor'); }} className="uppercase">
                      View All Alerts
                    </a>
            </div>
                )}
            </div>
            </div>
          </div>
        </>
        )}

      {/* User Management Tab */}
        {activeTab === 'users' && (
        <div className="card card-primary card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-users mr-2"></i>
          User Management
            </h3>
            <div className="card-tools">
              <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateUser}>
                <i className="fas fa-plus mr-1"></i> Create New User
        </button>
              <button type="button" className="btn btn-tool" data-card-widget="collapse">
                <i className="fas fa-minus"></i>
        </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select 
                  className="form-control"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="ALL">All Roles</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <select 
                  className="form-control"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th style={{width: '20%'}}>Name</th>
                    <th style={{width: '20%'}}>Email</th>
                    <th style={{width: '15%'}}>Role</th>
                    <th style={{width: '12%'}}>Status</th>
                    <th style={{width: '13%'}}>Created</th>
                    <th style={{width: '20%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {filteredUsers.length > 0 ? filteredUsers.map(user => (
                  <tr key={user.id}>
                      <td>
                        <strong>{user.first_name || ''} {user.last_name || ''}</strong>
                      </td>
                      <td>
                        <i className="fas fa-envelope text-muted mr-1"></i>
                        {user.email || ''}
                      </td>
                      <td>
                        <span className={`badge badge-${user.role === 'SYSTEM_ADMIN' ? 'danger' : user.role === 'PROJECT_MANAGER' ? 'primary' : user.role === 'SITE_SUPERVISOR' ? 'success' : user.role === 'PROCUREMENT_OFFICER' ? 'warning' : 'info'}`}>
                          {(user.role || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                    <td>
                      <select
                          className={`form-control form-control-sm ${user.status === 'ACTIVE' ? 'bg-success text-white' : 'bg-danger text-white'}`}
                          value={user.status || 'INACTIVE'}
                          onChange={(e) => handleUpdateUserStatus(user.id, e.target.value)}
                          style={{fontWeight: 'bold'}}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </td>
                    <td>
                        <small>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</small>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
        <button 
                            className="btn btn-sm btn-info" 
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                            data-toggle="tooltip"
                          >
                            <i className="fas fa-edit"></i>
        </button>
        <button 
                            className="btn btn-sm btn-warning" 
                        onClick={() => handleResetPassword(user.id)}
                            title="Reset Password"
                            data-toggle="tooltip"
                          >
                            <i className="fas fa-key"></i>
        </button>
        <button 
                            className={`btn btn-sm ${user.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleUpdateUserStatus(
                              user.id, 
                              user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                            )}
                            title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            data-toggle="tooltip"
                          >
                            <i className={`fas fa-${user.status === 'ACTIVE' ? 'ban' : 'check'}`}></i>
        </button>
      </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <i className="fas fa-users fa-3x text-muted mb-3"></i>
                        <p className="text-muted">No users found matching your criteria</p>
                    </td>
                  </tr>
                  )}
              </tbody>
            </table>
            </div>
            {filteredUsers.length > 0 && (
              <div className="card-footer clearfix">
                <div className="float-left">
                  <strong>Total: {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</strong>
            </div>
            </div>
            )}
            </div>
          </div>
        )}

      {/* Projects Tab */}
        {activeTab === 'projects' && (
        <div className="card card-success card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-project-diagram mr-2"></i>
              All Projects
            </h3>
            <div className="card-tools">
              <button type="button" className="btn btn-tool" data-card-widget="collapse">
                <i className="fas fa-minus"></i>
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
              <thead>
                <tr>
                    <th>Project Name</th>
                  <th>Manager</th>
                  <th>Budget</th>
                    <th>Spent</th>
                  <th>Status</th>
                  <th>Sites</th>
                </tr>
              </thead>
              <tbody>
                  {projects.length > 0 ? projects.map(project => {
                    const projectExpenses = expenses.filter(e => e.project_id === project.id);
                    const spent = projectExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                    const budget = parseFloat(project.budget || 0);
                    const percentage = budget > 0 ? (spent / budget * 100) : 0;
                    
                    return (
                  <tr key={project.id}>
                        <td><strong>{project.name || 'N/A'}</strong></td>
                        <td>{(project.pm_first_name || '')} {(project.pm_last_name || '')}</td>
                        <td>${budget.toLocaleString()}</td>
                        <td>
                          <div className="progress-group">
                            ${spent.toLocaleString()}
                            <span className="float-right"><b>{percentage.toFixed(1)}%</b></span>
                          </div>
                          <div className="progress progress-sm">
                            <div 
                              className={`progress-bar ${percentage > 100 ? 'bg-danger' : 'bg-success'}`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            ></div>
                          </div>
                    </td>
                    <td>
                          <span className={`badge badge-${project.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                            {project.status || 'N/A'}
                          </span>
                        </td>
                    <td>{project.site_count || 0}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" className="text-center">No projects found</td>
                  </tr>
                  )}
              </tbody>
            </table>
            </div>
          </div>
          </div>
        )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit-logs' && (
        <div className="card card-info card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-clipboard-list mr-2"></i>
              System Audit Logs
            </h3>
            <div className="card-tools">
              <span className="badge badge-info">{auditLogs.length} Total Logs</span>
              <button type="button" className="btn btn-tool" data-card-widget="collapse">
                <i className="fas fa-minus"></i>
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Table</th>
                    <th>Record ID</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length > 0 ? auditLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
                      <td>{(log.first_name || '')} {(log.last_name || '')} ({log.email || 'N/A'})</td>
                      <td>
                        <span className={`badge badge-${(log.action || '').includes('CREATE') ? 'success' : (log.action || '').includes('UPDATE') ? 'warning' : 'info'}`}>
                          {log.action || 'N/A'}
                        </span>
                      </td>
                      <td>{log.table_name || 'N/A'}</td>
                      <td>{log.record_id || 'N/A'}</td>
                      <td>
                        {log.new_values && (
                      <button 
                            className="btn btn-sm btn-info"
                            onClick={() => {
                              try {
                                const values = typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values;
                                alert(JSON.stringify(values, null, 2));
                              } catch {
                                alert(log.new_values);
                              }
                            }}
                          >
                            View Details
                      </button>
                        )}
                    </td>
                  </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center">No audit logs found</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
              </div>
          </div>
        )}

      {/* Procurement Tab */}
      {activeTab === 'procurement' && (
        <div className="card card-warning card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-shopping-cart mr-2"></i>
              Procurement Summary
            </h3>
            <div className="card-tools">
              <span className="badge badge-warning">{purchaseOrders.length} Purchase Orders</span>
              <button type="button" className="btn btn-tool" data-card-widget="collapse">
                <i className="fas fa-minus"></i>
              </button>
              </div>
              </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
              <thead>
                <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Total Amount</th>
                  <th>Status</th>
                    <th>Order Date</th>
                    <th>Expected Delivery</th>
                </tr>
              </thead>
              <tbody>
                  {purchaseOrders.length > 0 ? purchaseOrders.map(po => (
                    <tr key={po.id}>
                      <td><strong>{po.po_number || 'N/A'}</strong></td>
                      <td>{po.supplier_name || 'N/A'}</td>
                      <td>${parseFloat(po.total_amount || 0).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${po.status === 'APPROVED' ? 'success' : po.status === 'PENDING' ? 'warning' : 'secondary'}`}>
                          {po.status || 'N/A'}
                        </span>
                      </td>
                      <td>{po.order_date ? new Date(po.order_date).toLocaleDateString() : 'N/A'}</td>
                      <td>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center">No purchase orders found</td>
                  </tr>
                  )}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="card card-info card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-boxes mr-2"></i>
              Materials Management
            </h3>
            <div className="card-tools">
              <button className="btn btn-primary btn-sm" onClick={() => setShowMaterialModal(true)}>
                <i className="fas fa-plus mr-1"></i> Add Material
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Min Stock Level</th>
                  <th>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                  {materials.length > 0 ? materials.map(material => (
                    <tr key={material.id}>
                      <td><strong>{material.name}</strong></td>
                      <td>{material.category || 'N/A'}</td>
                      <td>{material.unit || 'N/A'}</td>
                      <td>{parseFloat(material.current_stock || 0).toFixed(2)}</td>
                      <td>{parseFloat(material.min_stock_level || 0).toFixed(2)}</td>
                      <td>{material.unit_price ? `$${parseFloat(material.unit_price).toFixed(2)}` : 'N/A'}</td>
                  </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center">No materials found</td>
                  </tr>
                  )}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        )}

      {/* Reports Tab */}
        {activeTab === 'reports' && (
        <>
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-secondary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-file-alt mr-2"></i>
                    System Reports
                  </h3>
              </div>
              </div>
              </div>
              </div>
          <div className="row">
            <div className="col-md-4">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title"><i className="fas fa-users mr-2"></i>User Activity Report</h3>
              </div>
              <div className="card-body">
                <p>Track all user activities and login sessions</p>
                <button className="btn btn-primary" onClick={() => handleGenerateReport('user-activity', {})}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card-success">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-clipboard-list mr-2"></i>System Audit Log</h3>
              </div>
              <div className="card-body">
                <p>Complete audit trail of all system actions</p>
                <button className="btn btn-success" onClick={() => handleGenerateReport('audit-log', {})}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card-info">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-shopping-cart mr-2"></i>Procurement Summary</h3>
              </div>
              <div className="card-body">
                <p>Overview of all purchase orders and suppliers</p>
                <button className="btn btn-info" onClick={() => handleGenerateReport('procurement-summary', {})}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card-warning">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-dollar-sign mr-2"></i>Project Financial Summary</h3>
              </div>
              <div className="card-body">
                <p>Comprehensive financial overview of all projects</p>
                <button className="btn btn-warning" onClick={() => handleGenerateReport('project-financial-summary', {})}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card-danger">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-chart-line mr-2"></i>Budget vs Actual</h3>
              </div>
              <div className="card-body">
                <p>Compare budgeted vs actual spending across projects</p>
                <button className="btn btn-danger" onClick={() => handleGenerateReport('budget-vs-actual', {})}>
                  Generate Report
                </button>
              </div>
              </div>
              </div>
          <div className="col-md-4">
            <div className="card card-secondary">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-heartbeat mr-2"></i>System Health Report</h3>
              </div>
              <div className="card-body">
                <p>System performance and health metrics</p>
                <button className="btn btn-secondary" onClick={() => handleGenerateReport('system-health', {})}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card card-danger card-outline">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-shield-alt mr-2"></i>Virtual Auditor Alerts</h3>
              </div>
              <div className="card-body">
                <p>Fraud detection and irregular access alerts</p>
                <button className="btn btn-danger" onClick={() => handleGenerateReport('virtual-auditor-alerts', {})}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Settings Tab */}
        {activeTab === 'settings' && (
        <>
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-secondary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-cog mr-2"></i>
                    System Settings
                  </h3>
              </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title"><i className="fas fa-shield-alt mr-2"></i>Access Control</h3>
              </div>
              <div className="card-body">
              <div className="form-group">
                <label>Session Timeout (minutes)</label>
                  <input type="number" className="form-control" defaultValue="30" />
              </div>
              <div className="form-group">
                  <label>Maximum Login Attempts</label>
                  <input type="number" className="form-control" defaultValue="5" />
              </div>
              <div className="form-group">
                <label>Password Policy</label>
                  <select className="form-control">
                  <option>Standard (8+ chars, mixed case, numbers, special)</option>
                  <option>High Security (12+ chars, mixed case, numbers, special)</option>
                </select>
              </div>
                <button className="btn btn-primary">Save Settings</button>
            </div>
          </div>
          </div>
          <div className="col-md-6">
            <div className="card card-success">
              <div className="card-header">
                <h3 className="card-title"><i className="fas fa-cog mr-2"></i>System Configuration</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>System Name</label>
                  <input type="text" className="form-control" defaultValue="Construction Resource Management System" />
                </div>
                <div className="form-group">
                  <label>Backup Frequency</label>
                  <select className="form-control">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <div className="custom-control custom-switch">
                    <input type="checkbox" className="custom-control-input" id="emailNotifications" defaultChecked />
                    <label className="custom-control-label" htmlFor="emailNotifications">Enable email notifications</label>
                  </div>
                </div>
                <button className="btn btn-success">Save Settings</button>
              </div>
            </div>
            </div>
          </div>
        </>
        )}

      {/* Virtual Auditor Tab */}
      {activeTab === 'auditor' && (
        <div className="card card-danger card-outline">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">
              <i className="fas fa-shield-alt mr-2"></i>
              Virtual Auditor - Fraud & Irregular Access Detection
              {alerts.filter(a => a.type === 'HIGH').length > 0 && (
                <span className="badge badge-danger ml-2">
                  {alerts.filter(a => a.type === 'HIGH').length} High Priority
                </span>
              )}
            </h3>
          </div>
          <div className="card-body">
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`alert alert-${
                    alert.type === 'HIGH' ? 'danger' : alert.type === 'MEDIUM' ? 'warning' : 'info'
                  } alert-dismissible`}
                >
                  <h5>
                    <i
                      className={`icon fas fa-${
                        alert.type === 'HIGH' ? 'exclamation-triangle' : 'info-circle'
                      }`}
                    ></i>{' '}
                    {alert.title}
                  </h5>
                  <p>{alert.message}</p>
                  <small className="text-muted d-block mb-2">
                    {new Date(alert.timestamp).toLocaleString()}
                  </small>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary mr-2"
                      onClick={() => handleInvestigateAlert(alert)}
                    >
                      Investigate
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="alert alert-info">
                <h5>
                  <i className="icon fas fa-info"></i> No Alerts
                </h5>
                <p>No security alerts at this time. System is operating normally.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="card card-success card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-user-friends mr-2"></i>
              Employees
            </h3>
            <div className="card-tools">
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => setShowEmployeeModal(true)}
              >
                <i className="fas fa-plus mr-1"></i>
                Add Employee
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Name</th>
                    <th>Employee ID</th>
                    <th>Position</th>
                    <th>Phone</th>
                    <th>Hire Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length > 0 ? (
                    employees.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <strong>{emp.first_name || ''} {emp.last_name || ''}</strong>
                          {emp.role && (
                            <div>
                              <small className="text-muted">
                                Linked user role: {(emp.role || '').replace(/_/g, ' ')}
                              </small>
                            </div>
                          )}
                        </td>
                        <td>{emp.employee_id || '-'}</td>
                        <td>{emp.position || 'N/A'}</td>
                        <td>{emp.phone || 'N/A'}</td>
                        <td>{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${emp.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                            {emp.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <i className="fas fa-user-friends fa-2x text-muted mb-2"></i>
                        <p className="text-muted mb-1">No employees found.</p>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => setShowEmployeeModal(true)}
                        >
                          <i className="fas fa-plus mr-1"></i>
                          Add First Employee
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="card card-info card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-tools mr-2"></i>
              Equipment Management
            </h3>
            <div className="card-tools">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowEquipmentModal(true)}
              >
                <i className="fas fa-plus mr-1"></i>
                Add Equipment
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Serial Number</th>
                    <th>Status</th>
                    <th>Purchase Date</th>
                    <th>Purchase Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.length > 0 ? (
                    equipment.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.name || 'N/A'}</strong></td>
                        <td>{item.type || 'N/A'}</td>
                        <td>{item.serial_number || 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${item.status === 'IN_USE' ? 'success' : item.status === 'MAINTENANCE' ? 'warning' : item.status === 'RETIRED' ? 'secondary' : 'info'}`}>
                            {item.status || 'AVAILABLE'}
                          </span>
                        </td>
                        <td>{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</td>
                        <td>{item.purchase_cost ? `$${parseFloat(item.purchase_cost).toFixed(2)}` : 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <i className="fas fa-tools fa-2x text-muted mb-2"></i>
                        <p className="text-muted mb-1">No equipment found.</p>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setShowEquipmentModal(true)}
                        >
                          <i className="fas fa-plus mr-1"></i>
                          Add First Equipment
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Alert Investigation Modal */}
      {showAlertModal && selectedAlert && (
        <AlertModal
          alert={selectedAlert}
          onClose={() => {
            setShowAlertModal(false);
            setSelectedAlert(null);
          }}
        />
      )}

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
          roles={roles}
          existingUsers={users}
        />
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <EmployeeModal
          users={users}
          onClose={() => setShowEmployeeModal(false)}
          onSave={async (payload) => {
            try {
              const response = await fetch('http://localhost:5000/api/employees', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              });

              const data = await response.json().catch(() => ({}));

              if (response.ok) {
                setShowEmployeeModal(false);
                await fetchData();
                alert('Employee created successfully');
              } else {
                alert(data.message || 'Failed to create employee');
              }
            } catch (error) {
              console.error('Error creating employee:', error);
              alert('Error creating employee: ' + (error.message || 'Network error'));
            }
          }}
        />
      )}

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <EquipmentModal
          onClose={() => setShowEquipmentModal(false)}
          onSave={async (payload) => {
            try {
              const response = await fetch('http://localhost:5000/api/equipment', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              });

              const data = await response.json().catch(() => ({}));

              if (response.ok) {
                setShowEquipmentModal(false);
                await fetchData();
                alert('Equipment created successfully');
              } else {
                alert(data.message || 'Failed to create equipment');
              }
            } catch (error) {
              console.error('Error creating equipment:', error);
              alert('Error creating equipment: ' + (error.message || 'Network error'));
            }
          }}
        />
      )}

      {/* Material Modal */}
      {showMaterialModal && (
        <MaterialModal
          onClose={() => setShowMaterialModal(false)}
          onSubmit={handleCreateMaterial}
        />
      )}

      {/* Report Modal */}
      {showReportModal && reportData && (
        <ReportModal
          reportType={selectedReportType}
          reportData={reportData}
          onClose={() => {
            setShowReportModal(false);
            setReportData(null);
          }}
          onExportPDF={exportToPDF}
          onExportExcel={exportToExcel}
        />
      )}
        </div>
      </section>
    </div>
  );
};

const AlertModal = ({ alert, onClose }) => {
  if (!alert) return null;

  const severityLabel =
    alert.type === 'HIGH' ? 'High Priority Security Alert' :
    alert.type === 'MEDIUM' ? 'Medium Risk Alert' :
    'Informational Alert';

  const severityClass =
    alert.type === 'HIGH' ? 'badge-danger' :
    alert.type === 'MEDIUM' ? 'badge-warning' :
    'badge-info';

  return (
    <>
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{
          zIndex: 1040,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}
      ></div>
      <div
        className="modal fade show"
        style={{
          display: 'block',
          zIndex: 1050,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'auto'
        }}
        tabIndex="-1"
        role="dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="modal-dialog modal-lg"
          role="document"
          style={{ margin: '30px auto', maxWidth: '700px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header bg-danger">
              <h4 className="modal-title text-white">
                <i className="fas fa-search mr-2"></i>
                Alert Investigation
              </h4>
              <button
                type="button"
                className="close text-white"
                onClick={onClose}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <h5 className="mb-2">
                {alert.title}{' '}
                <span className={`badge ${severityClass} ml-2`}>{severityLabel}</span>
              </h5>
              <p className="mb-3">{alert.message}</p>
              <p className="text-muted mb-4">
                Detected at: {new Date(alert.timestamp).toLocaleString()}
              </p>
              <h6>Recommended next steps</h6>
              <ul className="mb-0">
                {alert.category === 'SECURITY' && (
                  <>
                    <li>Review recent login activity for the involved user and IP addresses.</li>
                    <li>Temporarily lock the account if behavior appears suspicious.</li>
                    <li>Notify the user and request password reset if necessary.</li>
                  </>
                )}
                {(alert.category === 'FINANCIAL' || alert.category === 'FRAUD') && (
                  <>
                    <li>Compare flagged expenses with historical averages for this project.</li>
                    <li>Verify supporting documents (invoices, purchase orders, approvals).</li>
                    <li>Escalate to finance or compliance team if anomalies persist.</li>
                  </>
                )}
                {!alert.category && (
                  <li>Review the underlying transaction or activity associated with this alert.</li>
                )}
              </ul>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const UserModal = ({ user, onClose, onSave, roles, existingUsers = [] }) => {
  // Check if System Admin or Project Manager already exists (memoized)
  const hasSystemAdmin = useMemo(() => {
    return existingUsers.some(u => u.role === 'SYSTEM_ADMIN' && (!user || u.id !== user.id));
  }, [existingUsers, user]);

  const hasProjectManager = useMemo(() => {
    return existingUsers.some(u => u.role === 'PROJECT_MANAGER' && (!user || u.id !== user.id));
  }, [existingUsers, user]);

  // Filter available roles based on restrictions (memoized)
  const availableRoles = useMemo(() => {
    return roles.filter(role => {
      if (role === 'SYSTEM_ADMIN' && hasSystemAdmin) {
        return false; // Hide if System Admin already exists
      }
      if (role === 'PROJECT_MANAGER' && hasProjectManager) {
        return false; // Hide if Project Manager already exists
      }
      return true;
    });
  }, [roles, hasSystemAdmin, hasProjectManager]);

  // Get default role (memoized)
  const defaultRole = useMemo(() => {
    return availableRoles.length > 0 ? availableRoles[0] : 'SITE_SUPERVISOR';
  }, [availableRoles]);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    role: user?.role || defaultRole,
    status: user?.status || 'ACTIVE'
  });

  // Reset form when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || defaultRole,
        status: user.status || 'ACTIVE'
      });
    } else {
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: defaultRole,
        status: 'ACTIVE'
      });
    }
  }, [user, defaultRole]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.first_name.trim()) {
      alert('First name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      alert('Last name is required');
      return;
    }
    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }
    if (!user && !formData.password) {
      alert('Password is required for new users');
      return;
    }
    if (!user && formData.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    onSave(formData);
  };

  useEffect(() => {
    // Close modal on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}></div>
      <div className="modal fade show" style={{ display: 'block', zIndex: 1050, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }} tabIndex="-1" role="dialog" onClick={(e) => {
        // Close modal if clicking on backdrop (not on modal content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}>
        <div className="modal-dialog modal-lg" role="document" style={{ margin: '30px auto', maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header bg-primary">
              <h4 className="modal-title text-white">
                <i className={`fas fa-${user ? 'edit' : 'user-plus'} mr-2`}></i>
                {user ? 'Edit User' : 'Create New User'}
              </h4>
              <button type="button" className="close text-white" onClick={onClose} aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="Enter first name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        autoFocus
                      />
                    </div>
              </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="Enter last name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
              </div>
            </div>
          </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!user}
                    readOnly={!!user}
                  />
                  {user && (
                    <small className="form-text text-muted">
                      <i className="fas fa-info-circle mr-1"></i>
                      Email cannot be changed after user creation
                    </small>
                  )}
                </div>
                {!user && (
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      required
                      className="form-control"
                      placeholder="Enter password (min 8 characters)"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      minLength="8"
                    />
                    <small className="form-text text-muted">
                      <i className="fas fa-shield-alt mr-1"></i>
                      Password must be at least 8 characters long
                    </small>
                  </div>
                )}
                <div className="row">
                  <div className="col-md-6">
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      required
                      className="form-control"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role}>
                          {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    {hasSystemAdmin && !user && (
                      <small className="form-text text-warning">
                        <i className="fas fa-info-circle mr-1"></i>
                        System Administrator already exists. Only one is allowed.
                      </small>
                    )}
                    {hasProjectManager && !user && (
                      <small className="form-text text-warning">
                        <i className="fas fa-info-circle mr-1"></i>
                        Project Manager already exists. Only one is allowed.
                      </small>
        )}
      </div>
    </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Status *</label>
                      <select
                        required
                        className="form-control"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  <i className="fas fa-times mr-1"></i> Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className={`fas fa-${user ? 'save' : 'user-plus'} mr-1`}></i>
                  {user ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
      </div>
    </div>
    </>
  );
};

// Material Modal Component
const MaterialModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '',
    category: '',
    current_stock: 0,
    min_stock_level: 0,
    unit_price: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Material name is required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Add New Material</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Material Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter material name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Material description..."
                />
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Construction, Electrical"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., kg, pieces, m"
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Current Stock</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Min Stock Level</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || '' })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Material</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Employee Modal Component
const EmployeeModal = ({ users, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    user_id: '',
    employee_id: '',
    phone: '',
    address: '',
    position: '',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employee_id.trim()) {
      alert('Employee ID is required');
      return;
    }
    onSave(formData);
  };

  const availableUsers = Array.isArray(users) ? users : [];

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">
              <i className="fas fa-user-friends mr-2"></i>
              Add Employee
            </h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="alert alert-info">
                <i className="fas fa-info-circle mr-2"></i>
                Link this employee to an existing system user (optional), or leave it blank to create an employee record only.
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Linked User (optional)</label>
                    <select
                      className="form-control"
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    >
                      <option value="">-- No linked user --</option>
                      {availableUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Employee ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="e.g., EMP-001"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+2507..."
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Position / Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g., Mason, Foreman, Electrician"
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Hire Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Employee home address or contact location"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">
                <i className="fas fa-save mr-1"></i>
                Save Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Equipment Modal Component
const EquipmentModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    serial_number: '',
    status: 'AVAILABLE',
    purchase_date: '',
    purchase_cost: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Equipment name is required');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">
              <i className="fas fa-tools mr-2"></i>
              Add Equipment
            </h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Excavator, Crane"
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Type</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="e.g., Heavy, Light, Vehicle"
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Serial Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="Manufacturer serial / asset tag"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="IN_USE">In Use</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Purchase Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.purchase_cost}
                      onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-save mr-1"></i>
                Save Equipment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SystemAdminDashboard;

// Report Modal Component
const ReportModal = ({ reportType, reportData, onClose, onExportPDF, onExportExcel }) => {
  const getReportTitle = (type) => {
    const titles = {
      'user-activity': 'User Activity Report',
      'audit-log': 'System Audit Log Report',
      'procurement-summary': 'Procurement Summary Report',
      'project-financial-summary': 'Full Project Financial Summary Report',
      'budget-vs-actual': 'Budget vs Actual Report',
      'system-health': 'System Health Report',
      'virtual-auditor-alerts': 'Virtual Auditor Alerts Report'
    };
    return titles[type] || 'Report';
  };

  const renderReportContent = () => {
    if (!reportData) return <p>No data available</p>;

    if (reportType === 'virtual-auditor-alerts') {
      return (
        <div>
          {reportData.failedLogins && reportData.failedLogins.length > 0 && (
            <div className="mb-4">
              <h5 className="text-danger">Failed Login Attempts</h5>
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Failed Attempts</th>
                    <th>Last Attempt</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.failedLogins.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.first_name} {item.last_name}</td>
                      <td>{item.email}</td>
                      <td><span className="badge badge-danger">{item.failed_attempts}</span></td>
                      <td>{new Date(item.last_attempt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reportData.budgetOverruns && reportData.budgetOverruns.length > 0 && (
            <div className="mb-4">
              <h5 className="text-warning">Budget Overruns</h5>
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Budget</th>
                    <th>Spent</th>
                    <th>Overrun</th>
                    <th>% Used</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.budgetOverruns.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>${parseFloat(item.budget || 0).toFixed(2)}</td>
                      <td>${parseFloat(item.total_spent || 0).toFixed(2)}</td>
                      <td className="text-danger">${parseFloat(item.overrun_amount || 0).toFixed(2)}</td>
                      <td>{item.percentage_used}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(!reportData.failedLogins || reportData.failedLogins.length === 0) && 
           (!reportData.budgetOverruns || reportData.budgetOverruns.length === 0) && (
            <div className="alert alert-success">
              <h5>No Alerts</h5>
              <p>No suspicious activity detected. System is operating normally.</p>
            </div>
          )}
        </div>
      );
    }

    if (reportType === 'system-health') {
      return (
        <div>
          <table className="table table-bordered">
            <tbody>
              <tr><th>Total Users</th><td>{reportData.users?.total || 0}</td></tr>
              <tr><th>Active Users</th><td>{reportData.users?.active || 0}</td></tr>
              <tr><th>Total Projects</th><td>{reportData.projects?.total || 0}</td></tr>
              <tr><th>Active Projects</th><td>{reportData.projects?.active || 0}</td></tr>
              <tr><th>Total Expenses</th><td>${parseFloat(reportData.expenses?.total_amount || 0).toFixed(2)}</td></tr>
              <tr><th>Recent Activity (24h)</th><td>{reportData.recentActivity?.total || 0}</td></tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (!Array.isArray(reportData)) {
      return <p>No data available</p>;
    }

    // Generic table for array data
    const headers = Object.keys(reportData[0] || {});
    return (
      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            {headers.map(h => <th key={h}>{h.replace(/_/g, ' ').toUpperCase()}</th>)}
          </tr>
        </thead>
        <tbody>
          {reportData.map((item, idx) => (
            <tr key={idx}>
              {headers.map(h => (
                <td key={h}>
                  {h.includes('date') || h.includes('created_at') || h.includes('updated_at') 
                    ? new Date(item[h]).toLocaleString()
                    : h.includes('amount') || h.includes('budget') || h.includes('spent')
                    ? `$${parseFloat(item[h] || 0).toFixed(2)}`
                    : item[h] || 'N/A'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">{getReportTitle(reportType)}</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <button className="btn btn-danger mr-2" onClick={onExportPDF}>
                <i className="fas fa-file-pdf"></i> Export PDF
              </button>
              <button className="btn btn-success" onClick={onExportExcel}>
                <i className="fas fa-file-excel"></i> Export Excel
              </button>
            </div>
            <div className="table-responsive">
              {renderReportContent()}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};
