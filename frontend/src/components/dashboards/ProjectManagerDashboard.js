import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Import jspdf-autotable as side effect - it extends jsPDF prototype
import 'jspdf-autotable';

// Company branding for PDF reports (YACHIN COMPANY LTD logo)
const PDF_COMPANY = {
  name: 'YACHIN COMPANY LTD',
  tel: 'Tel: +250 788346572',
  email: 'Email: muyombanoemanuel88@gmail.com'
};

const loadLogoDataUrl = () =>
  fetch((process.env.PUBLIC_URL || '') + '/logo.jpg')
    .then((res) => (res.ok ? res.blob() : Promise.reject()))
    .then((blob) =>
      new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.onerror = () => resolve(null);
        r.readAsDataURL(blob);
      })
    )
    .catch(() => null);

const ProjectManagerDashboard = ({ activeTab: propActiveTab, onTabChange, onRefreshNotifications }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [projects, setProjects] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [equipmentRequests, setEquipmentRequests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteSupervisors, setSiteSupervisors] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [workforceSummary, setWorkforceSummary] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalBudget: 0,
    spentAmount: 0,
    pendingRequests: 0,
    completedProjects: 0,
    totalSites: 0
  });

  // Sync with prop changes from parent (sidebar clicks)
  useEffect(() => {
    if (propActiveTab !== undefined && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab, activeTab]);

  // Update parent when tab changes internally
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
    // We intentionally exclude fetchData from deps to avoid recreating the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let projectsData = [];
      let expensesData = [];
      let mrData = [];
      let erData = [];
      let sitesData = [];

      // Fetch projects
      try {
        const projectsRes = await fetch('http://localhost:5000/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (projectsRes.ok) {
          projectsData = await projectsRes.json();
          setProjects(projectsData);
        }
      } catch (e) {
        console.log('Error fetching projects:', e);
      }

      // Fetch expenses
      try {
            const expensesRes = await fetch('http://localhost:5000/api/expenses', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
        if (expensesRes.ok) {
          expensesData = await expensesRes.json();
          setExpenses(expensesData);
        }
      } catch (e) {
        console.log('Error fetching expenses:', e);
      }

      // Fetch material requests
      try {
        const mrRes = await fetch('http://localhost:5000/api/material-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (mrRes.ok) {
          mrData = await mrRes.json();
          setMaterialRequests(mrData);
        }
      } catch (e) {
        // Material requests endpoint may not exist - that's okay
        console.log('Material requests endpoint not available');
      }

      // Fetch equipment requests
      try {
        const erRes = await fetch('http://localhost:5000/api/equipment-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (erRes.ok) {
          erData = await erRes.json();
          setEquipmentRequests(Array.isArray(erData) ? erData : []);
        }
      } catch (e) {
        console.log('Equipment requests endpoint not available');
      }

      // Fetch purchase orders (read-only)
      try {
        const poRes = await fetch('http://localhost:5000/api/procurement/purchase-orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (poRes.ok) {
          const poData = await poRes.json();
          setPurchaseOrders(poData);
        }
      } catch (e) {
        console.log('Purchase orders endpoint not available');
      }

      // Fetch quotations (for approve/reject)
      try {
        const qRes = await fetch('http://localhost:5000/api/procurement/quotations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuotations(Array.isArray(qData) ? qData : []);
        }
      } catch (e) {
        console.log('Quotations endpoint not available');
      }

      // Fetch tasks
      try {
        const tasksRes = await fetch('http://localhost:5000/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData);
        }
      } catch (e) {
        console.log('Error fetching tasks:', e);
      }

      // Fetch employees for workforce monitoring
      try {
        const employeesRes = await fetch('http://localhost:5000/api/employees', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          setEmployees(employeesData);
        }
      } catch (e) {
        console.log('Error fetching employees:', e);
      }

      // Fetch workforce summary (attendance aggregated by employee) for Workforce Monitoring
      try {
        const wsRes = await fetch('http://localhost:5000/api/employees/workforce-summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          setWorkforceSummary(Array.isArray(wsData) ? wsData : []);
        }
      } catch (e) {
        console.log('Error fetching workforce summary:', e);
      }

      // Fetch equipment for monitoring (read-only)
      try {
        const equipmentRes = await fetch('http://localhost:5000/api/equipment', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (equipmentRes.ok) {
          const equipmentData = await equipmentRes.json();
          setEquipment(Array.isArray(equipmentData) ? equipmentData : []);
        }
      } catch (e) {
        console.log('Error fetching equipment:', e);
      }

      // Fetch sites (for this project manager)
      try {
        const sitesRes = await fetch('http://localhost:5000/api/sites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (sitesRes.ok) {
          sitesData = await sitesRes.json();
          setSites(sitesData);
        }
      } catch (e) {
        console.log('Error fetching sites:', e);
      }

      // Calculate stats using the data we already fetched
      const totalBudget = projectsData.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
      const spentAmount = expensesData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      // Active = PLANNING, IN_PROGRESS, ON_HOLD (DB schema has no 'ACTIVE')
      const activeProjectStatuses = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD'];
      const activeCount = projectsData.filter(p => activeProjectStatuses.includes(p.status)).length;
      const pendingMaterial = (Array.isArray(mrData) ? mrData : []).filter(r => r.status === 'PENDING').length;
      const pendingEquipment = (Array.isArray(erData) ? erData : []).filter(r => r.status === 'PENDING').length;

      setStats({
        totalProjects: projectsData.length,
        activeProjects: activeCount,
        completedProjects: projectsData.filter(p => p.status === 'COMPLETED').length,
        totalBudget,
        spentAmount,
        pendingRequests: pendingMaterial + pendingEquipment,
        totalSites: sitesData.length || projectsData.reduce((sum, p) => sum + (parseInt(p.site_count) || 0), 0)
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleCreateSite = () => {
    setShowSiteModal(true);
  };

  const handleSaveSite = async (siteData) => {
    try {
      const response = await fetch('http://localhost:5000/api/sites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteData)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setShowSiteModal(false);
        fetchData();
        alert('Site created successfully');
      } else {
        alert(data.message || 'Failed to create site');
      }
    } catch (error) {
      console.error('Error creating site:', error);
      alert('Error creating site');
    }
  };

  const handleSaveProject = async (projectData) => {
    try {
      const url = editingProject
        ? `http://localhost:5000/api/projects/${editingProject.id}`
        : 'http://localhost:5000/api/projects';
      
      const method = editingProject ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      const data = await response.json();

      if (response.ok) {
        setShowProjectModal(false);
        setEditingProject(null);
        fetchData();
        alert(editingProject ? 'Project updated successfully' : 'Project created successfully');
      } else {
        alert(data.message || 'Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project');
    }
  };

  const handleApproveMaterialRequest = async (requestId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/material-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'APPROVED' })
      });

      if (response.ok) {
        fetchData();
        onRefreshNotifications?.();
        alert('Material request approved successfully');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request');
    }
  };

  const handleApproveQuotation = async (quotationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/procurement/quotations/${quotationId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchData();
        onRefreshNotifications?.();
        alert('Quotation approved successfully');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to approve quotation');
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
      alert('Error approving quotation');
    }
  };

  const handleRejectQuotation = async (quotationId) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return; // User cancelled

    try {
      const response = await fetch(`http://localhost:5000/api/procurement/quotations/${quotationId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejection_reason: reason || undefined })
      });

      if (response.ok) {
        fetchData();
        onRefreshNotifications?.();
        alert('Quotation rejected');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to reject quotation');
      }
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      alert('Error rejecting quotation');
    }
  };

  const handleRejectMaterialRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this material request?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/material-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'REJECTED' })
      });

      if (response.ok) {
        fetchData();
        onRefreshNotifications?.();
        alert('Material request rejected');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request');
    }
  };

  const handleAssignTask = async (project) => {
    setSelectedProject(project);
    // Fetch site supervisors for this project
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/site-supervisors/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const supervisors = await res.json();
        setSiteSupervisors(supervisors);
        setShowTaskModal(true);
      } else {
        alert('Failed to load site supervisors');
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      alert('Error loading site supervisors');
    }
  };

  const handleGenerateReport = (reportType) => {
    setSelectedReportType(reportType);
    setShowReportModal(true);
  };

  const handleGenerateReportSubmit = async (filters) => {
    try {
      // Backend expects /api/reports?type=... not /api/reports/<type>
      let url = `http://localhost:5000/api/reports?type=${encodeURIComponent(selectedReportType || '')}`;
      if (filters.startDate) url += `&startDate=${encodeURIComponent(filters.startDate)}`;
      if (filters.endDate) url += `&endDate=${encodeURIComponent(filters.endDate)}`;
      if (filters.projectId) url += `&projectId=${encodeURIComponent(filters.projectId)}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        // Try to read JSON error; fall back to text to avoid JSON parse crash
        let message = 'Failed to generate report';
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            message = errorData.message;
          }
        } catch (_) {
          try {
            const text = await response.text();
            console.error('Report error response:', text);
          } catch (e) {
            // ignore
          }
        }
        alert(message);
        return;
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    }
  };

  const getBudgetPercentage = (project) => {
    const projectExpenses = expenses.filter(e => e.project_id === project.id);
    const spent = projectExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const budget = parseFloat(project.budget || 0);
    return budget > 0 ? (spent / budget * 100) : 0;
  };

  const equipmentSummary = useMemo(() => {
    if (!Array.isArray(equipment) || equipment.length === 0) {
      return { total: 0, inUse: 0, maintenance: 0 };
    }
    const total = equipment.length;
    const inUse = equipment.filter(e => e.status === 'IN_USE' || e.status === 'IN USE').length;
    const maintenance = equipment.filter(e => e.status === 'MAINTENANCE').length;
    return { total, inUse, maintenance };
  }, [equipment]);

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid responsive-container">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">
                <i className="fas fa-project-diagram mr-2"></i>
                Project Manager Dashboard
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
          {/* Stat Boxes */}
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{stats.totalProjects}</h3>
                  <p>Total Projects</p>
              </div>
                <div className="icon">
                  <i className="fas fa-project-diagram"></i>
              </div>
                <button
                  type="button"
                  className="small-box-footer btn btn-link p-0 border-0"
                  onClick={() => handleTabChange('projects')}
                >
                  More info <i className="fas fa-arrow-circle-right"></i>
                </button>
              </div>
              </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{stats.activeProjects}</h3>
                  <p>Active Projects</p>
            </div>
                <div className="icon">
                  <i className="fas fa-tasks"></i>
          </div>
                <button
                  type="button"
                  className="small-box-footer btn btn-link p-0 border-0"
                  onClick={() => handleTabChange('projects')}
                >
                  More info <i className="fas fa-arrow-circle-right"></i>
                </button>
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
                <button
                  type="button"
                  className="small-box-footer btn btn-link p-0 border-0"
                  onClick={() => handleTabChange('projects')}
                >
                  More info <i className="fas fa-arrow-circle-right"></i>
                </button>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger">
                <div className="inner">
                  <h3>{stats.pendingRequests}</h3>
                  <p>Pending Requests</p>
                </div>
                <div className="icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <button
                  type="button"
                  className="small-box-footer btn btn-link p-0 border-0"
                  onClick={() => handleTabChange('material-requests')}
                >
                  More info <i className="fas fa-arrow-circle-right"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Budget Overview */}
          <div className="row">
            <div className="col-md-6">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-chart-pie mr-2"></i>
                    Budget Overview
                  </h3>
                </div>
                <div className="card-body">
                  <div className="progress-group">
                    <span>Total Budget</span>
                    <span className="float-right"><b>${stats.totalBudget.toLocaleString()}</b></span>
                  </div>
                  <div className="progress progress-lg">
                    <div 
                      className={`progress-bar ${(stats.spentAmount / stats.totalBudget * 100) > 100 ? 'bg-danger' : 'bg-success'} progress-bar-striped`}
                      role="progressbar"
                      style={{ width: `${Math.min(100, (stats.spentAmount / stats.totalBudget * 100))}%` }}
                    >
                      {stats.totalBudget > 0 ? ((stats.spentAmount / stats.totalBudget * 100).toFixed(1)) : 0}%
                    </div>
                  </div>
                  <div className="mt-3">
                    <small className="text-muted">
                      Spent: ${stats.spentAmount.toLocaleString()} | 
                      Remaining: ${(stats.totalBudget - stats.spentAmount).toLocaleString()}
                    </small>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card card-success card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-chart-line mr-2"></i>
                    Project Status
                  </h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6">
                      <div className="description-block border-right">
                        <span className="description-percentage text-success">
                          <i className="fas fa-check-circle"></i> {stats.activeProjects}
                        </span>
                        <h5 className="description-header">Active</h5>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="description-block">
                        <span className="description-percentage text-info">
                          <i className="fas fa-check-double"></i> {stats.completedProjects}
                        </span>
                        <h5 className="description-header">Completed</h5>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="row">
            <div className="col-12">
              <div className="card card-info card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-list mr-2"></i>
                    Recent Projects
                  </h3>
                  <div className="card-tools">
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateProject}>
                      <i className="fas fa-plus mr-1"></i> New Project
        </button>
      </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover">
              <thead>
                <tr>
                          <th>Project Name</th>
                  <th>Budget</th>
                          <th>Spent</th>
                          <th>Progress</th>
                  <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.slice(0, 5).map(project => {
                          const percentage = getBudgetPercentage(project);
                          const projectExpenses = expenses.filter(e => e.project_id === project.id);
                          const spent = projectExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                          
                          return (
                            <tr key={project.id}>
                              <td><strong>{project.name || 'N/A'}</strong></td>
                              <td>${parseFloat(project.budget || 0).toLocaleString()}</td>
                              <td>${spent.toLocaleString()}</td>
                              <td>
                                <div className="progress progress-sm">
                                  <div 
                                    className={`progress-bar ${percentage > 100 ? 'bg-danger' : percentage > 80 ? 'bg-warning' : 'bg-success'}`}
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                  ></div>
              </div>
                                <small>{percentage.toFixed(1)}%</small>
                              </td>
                              <td>
                                <span className={`badge badge-${project.status === 'ACTIVE' ? 'success' : project.status === 'COMPLETED' ? 'info' : 'secondary'}`}>
                                  {project.status || 'N/A'}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-info mr-1"
                                  onClick={() => handleEditProject(project)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleAssignTask(project)}
                                >
                                  <i className="fas fa-tasks"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
              </div>
              </div>
              </div>
            </div>
          </div>
        </>
        )}

      {/* Projects Tab */}
        {activeTab === 'projects' && (
        <div className="card card-primary card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-project-diagram mr-2"></i>
              My Projects
            </h3>
            <div className="card-tools">
              <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateProject}>
                <i className="fas fa-plus mr-1"></i> Create New Project
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Project Name</th>
                    <th>Description</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                  <th>Budget</th>
                    <th>Spent</th>
                    <th>Progress</th>
                  <th>Sites</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                  {projects.length > 0 ? projects.map(project => {
                    const percentage = getBudgetPercentage(project);
                    const projectExpenses = expenses.filter(e => e.project_id === project.id);
                    const spent = projectExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                    
                    return (
                  <tr key={project.id}>
                        <td><strong>{project.name || 'N/A'}</strong></td>
                        <td>{project.description || 'N/A'}</td>
                        <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</td>
                        <td>{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}</td>
                    <td>${parseFloat(project.budget || 0).toLocaleString()}</td>
                        <td>${spent.toLocaleString()}</td>
                        <td>
                          <div className="progress-group">
                            <div className="progress progress-sm">
                              <div 
                                className={`progress-bar ${percentage > 100 ? 'bg-danger' : percentage > 80 ? 'bg-warning' : 'bg-success'}`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              ></div>
                            </div>
                            <span className="progress-text">{percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                    <td>{project.site_count || 0}</td>
                    <td>
                          <span className={`badge badge-${project.status === 'ACTIVE' ? 'success' : project.status === 'COMPLETED' ? 'info' : 'secondary'}`}>
                            {project.status || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button 
                              className="btn btn-sm btn-info"
                              onClick={() => handleEditProject(project)}
                              title="Edit Project"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAssignTask(project)}
                              title="Assign Tasks"
                            >
                              <i className="fas fa-tasks"></i>
                            </button>
                          </div>
                    </td>
                  </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="10" className="text-center py-5">
                        <i className="fas fa-project-diagram fa-3x text-muted mb-3"></i>
                        <p className="text-muted">No projects found. Create your first project!</p>
                        <button className="btn btn-primary" onClick={handleCreateProject}>
                          <i className="fas fa-plus mr-1"></i> Create Project
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

      {/* Material Requests Tab */}
        {activeTab === 'material-requests' && (
        <>
          <div className="card card-warning card-outline">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-clipboard-list mr-2"></i>
                Material Requests - Pending Approval
              </h3>
              <div className="card-tools">
                <span className="badge badge-warning">
                  {materialRequests.filter(r => r.status === 'PENDING').length} Pending
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Site</th>
                      <th>Requested By</th>
                      <th>Request Date</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialRequests.filter(r => r.status === 'PENDING').length > 0 ? (
                      materialRequests
                        .filter(r => r.status === 'PENDING')
                        .map(request => (
                          <tr key={request.id}>
                            <td><strong>{request.material_name || 'N/A'}</strong></td>
                            <td>{request.quantity || 'N/A'}</td>
                            <td>{request.unit || 'N/A'}</td>
                            <td>{request.site_name || 'N/A'}</td>
                            <td>{request.requested_by_name || 'N/A'}</td>
                            <td>{request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}</td>
                            <td>
                              <span className={`badge badge-${request.priority === 'HIGH' ? 'danger' : request.priority === 'MEDIUM' ? 'warning' : 'info'}`}>
                                {request.priority || 'LOW'}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-warning">{request.status}</span>
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleApproveMaterialRequest(request.id)}
                                  title="Approve"
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleRejectMaterialRequest(request.id)}
                                  title="Reject"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-5">
                          <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                          <p className="text-muted">No pending material requests</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card card-info card-outline mt-3">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-truck-moving mr-2"></i>
                Equipment Requests - Pending Approval
              </h3>
              <div className="card-tools">
                <span className="badge badge-info">
                  {equipmentRequests.filter(r => r.status === 'PENDING').length} Pending
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-striped table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th>Site</th>
                      <th>Project</th>
                      <th>Description</th>
                      <th>Requested By</th>
                      <th>Request Date</th>
                      <th>Needed From</th>
                      <th>Needed Until</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentRequests.filter(r => r.status === 'PENDING').length > 0 ? (
                      equipmentRequests
                        .filter(r => r.status === 'PENDING')
                        .map(request => (
                          <tr key={request.id}>
                            <td>{request.site_name || 'N/A'}</td>
                            <td>{request.project_name || 'N/A'}</td>
                            <td><strong>{request.description || 'N/A'}</strong></td>
                            <td>
                              {(request.requested_by_first_name || '')} {(request.requested_by_last_name || '')}
                            </td>
                            <td>{request.request_date ? new Date(request.request_date).toLocaleDateString() : 'N/A'}</td>
                            <td>{request.needed_from ? new Date(request.needed_from).toLocaleDateString() : 'N/A'}</td>
                            <td>{request.needed_until ? new Date(request.needed_until).toLocaleDateString() : 'N/A'}</td>
                            <td>
                              <span className="badge badge-info">{request.status}</span>
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`http://localhost:5000/api/equipment-requests/${request.id}/approve`, {
                                        method: 'PUT',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      });
                                      const data = await res.json().catch(() => ({}));
                                      if (res.ok) {
                                        await fetchData();
                                        onRefreshNotifications?.();
                                        alert('Equipment request approved successfully');
                                      } else {
                                        alert(data.message || 'Failed to approve equipment request');
                                      }
                                    } catch (err) {
                                      console.error('Error approving equipment request:', err);
                                      alert('Error approving equipment request');
                                    }
                                  }}
                                  title="Approve"
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={async () => {
                                    if (!window.confirm('Are you sure you want to reject this equipment request?')) return;
                                    try {
                                      const res = await fetch(`http://localhost:5000/api/equipment-requests/${request.id}/reject`, {
                                        method: 'PUT',
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ reason: 'Rejected by Project Manager' })
                                      });
                                      const data = await res.json().catch(() => ({}));
                                      if (res.ok) {
                                        await fetchData();
                                        onRefreshNotifications?.();
                                        alert('Equipment request rejected');
                                      } else {
                                        alert(data.message || 'Failed to reject equipment request');
                                      }
                                    } catch (err) {
                                      console.error('Error rejecting equipment request:', err);
                                      alert('Error rejecting equipment request');
                                    }
                                  }}
                                  title="Reject"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-5">
                          <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                          <p className="text-muted">No pending equipment requests</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Procurement & Financial Tab */}
      {activeTab === 'procurement' && (
        <>
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-secondary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-shopping-cart mr-2"></i>
                    Procurement & Financial Updates
                  </h3>
                  <div className="card-tools">
                    <small className="text-muted mr-3">
                      You can request payments; Finance Officer approves and pays.
                    </small>
                    {/* A payment request flow/modal could be added here in the future */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Approvals - Project Manager approves/rejects quotations created by Procurement */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-warning card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-file-signature mr-2"></i>
                    Supplier Quotation Approvals
                  </h3>
                  <div className="card-tools">
                    <span className="badge badge-light border">
                      Pending: <strong>{(Array.isArray(quotations) ? quotations.filter(q => (q.status || '').toUpperCase() === 'PENDING') : []).length}</strong>
                    </span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover table-sm mb-0">
                      <thead className="thead-light">
                        <tr>
                          <th>ID</th>
                          <th>Supplier</th>
                          <th>Material</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th>Date</th>
                          <th>Validity (days)</th>
                          <th>Notes</th>
                          <th>Status</th>
                          <th style={{ minWidth: 160 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(quotations) ? quotations : []).map(q => {
                          const status = (q.status || 'PENDING').toUpperCase();
                          const isPending = status === 'PENDING';
                          const statusClass = status === 'ACCEPTED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning';
                          const amount = parseFloat(q.total || 0);
                          const unitPrice = parseFloat(q.unit_price || 0);
                          return (
                            <tr key={q.id}>
                              <td>{q.id}</td>
                              <td>{q.supplier_name || 'N/A'}</td>
                              <td>{q.material_name || 'N/A'}</td>
                              <td>{q.quantity ?? '—'}</td>
                              <td>${Number.isFinite(unitPrice) ? unitPrice.toLocaleString() : '0'}</td>
                              <td>${Number.isFinite(amount) ? amount.toLocaleString() : '0'}</td>
                              <td>{q.quotation_date ? new Date(q.quotation_date).toLocaleDateString() : '—'}</td>
                              <td>{q.validity_period ?? '—'}</td>
                              <td style={{ maxWidth: 150 }} className="text-truncate" title={q.notes || ''}>{q.notes || '—'}</td>
                              <td>
                                <span className={`badge badge-${statusClass}`}>{status}</span>
                              </td>
                              <td>
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success mr-1"
                                      onClick={() => handleApproveQuotation(q.id)}
                                    >
                                      <i className="fas fa-check"></i> Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleRejectQuotation(q.id)}
                                    >
                                      <i className="fas fa-times"></i> Reject
                                    </button>
                                  </>
                                )}
                                {!isPending && <span className="text-muted small">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {(!Array.isArray(quotations) || quotations.length === 0) && (
                          <tr>
                            <td colSpan="11" className="text-center py-4 text-muted">
                              No supplier quotations found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="card card-info card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-file-invoice-dollar mr-2"></i>
                    Purchase Orders
                  </h3>
                </div>
                <div className="card-body p-0">
                  <div className="p-3 border-bottom d-flex align-items-center justify-content-between" style={{ gap: 12 }}>
                    <div className="d-flex align-items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-light border">
                        Total: <strong>{Array.isArray(purchaseOrders) ? purchaseOrders.length : 0}</strong>
                      </span>
                      <span className="badge badge-light border">
                        Delivered: <strong>{Array.isArray(purchaseOrders) ? purchaseOrders.filter(p => p.status === 'DELIVERED').length : 0}</strong>
                      </span>
                      <span className="badge badge-light border">
                        Pending: <strong>{Array.isArray(purchaseOrders) ? purchaseOrders.filter(p => p.status === 'PENDING').length : 0}</strong>
                      </span>
                    </div>
                    <small className="text-muted">
                      Showing latest 5. Scroll to see all columns.
                    </small>
                  </div>

                  <div className="table-responsive" style={{ maxHeight: 340 }}>
                    <table className="table table-hover table-sm mb-0">
                      <thead className="thead-light" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th style={{ whiteSpace: 'nowrap' }}>PO #</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Supplier</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Order date</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Expected delivery</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Total</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                          <th style={{ minWidth: 220 }}>Notes</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Created by</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Created at</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Updated at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(purchaseOrders) ? purchaseOrders.slice(0, 5) : []).map(po => {
                          const creatorName = `${po.creator_first_name || ''} ${po.creator_last_name || ''}`.trim() || 'N/A';
                          const amount = parseFloat(po.total_amount || 0);
                          const status = po.status || 'N/A';
                          const statusClass =
                            status === 'APPROVED' ? 'success'
                              : status === 'DELIVERED' ? 'primary'
                              : status === 'PENDING' ? 'warning'
                              : status === 'REJECTED' ? 'danger'
                              : 'secondary';

                          return (
                            <tr key={po.id}>
                              <td style={{ whiteSpace: 'nowrap' }}><strong>{po.po_number || 'N/A'}</strong></td>
                              <td style={{ whiteSpace: 'nowrap' }}>{po.supplier_name || 'N/A'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{po.order_date ? new Date(po.order_date).toLocaleDateString() : 'N/A'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>${Number.isFinite(amount) ? amount.toLocaleString() : '0'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <span className={`badge badge-${statusClass}`}>{status}</span>
                              </td>
                              <td style={{ minWidth: 220 }}>{po.notes || '—'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{creatorName}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{po.created_at ? new Date(po.created_at).toLocaleString() : 'N/A'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{po.updated_at ? new Date(po.updated_at).toLocaleString() : 'N/A'}</td>
                            </tr>
                          );
                        })}

                        {(!Array.isArray(purchaseOrders) || purchaseOrders.length === 0) && (
                          <tr>
                            <td colSpan="10" className="text-center py-4 text-muted">
                              No purchase orders found
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
              <div className="card card-success card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-money-bill-wave mr-2"></i>
                    Recent Expenses
                  </h3>
                </div>
                <div className="card-body p-0">
                  <div className="p-3 border-bottom d-flex align-items-center justify-content-between" style={{ gap: 12 }}>
                    <div className="d-flex align-items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-light border">
                        Total: <strong>{Array.isArray(expenses) ? expenses.length : 0}</strong>
                      </span>
                      <span className="badge badge-light border">
                        Paid: <strong>{Array.isArray(expenses) ? expenses.filter(e => e.payment_status === 'PAID').length : 0}</strong>
                      </span>
                      <span className="badge badge-light border">
                        Pending: <strong>{Array.isArray(expenses) ? expenses.filter(e => e.payment_status === 'PENDING').length : 0}</strong>
                      </span>
                    </div>
                    <small className="text-muted">
                      Showing latest 5. Scroll to see all columns.
                    </small>
                  </div>

                  <div className="table-responsive" style={{ maxHeight: 340 }}>
                    <table className="table table-hover table-sm mb-0">
                      <thead className="thead-light" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th style={{ whiteSpace: 'nowrap' }}>Project</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Category</th>
                          <th style={{ minWidth: 260 }}>Description</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Amount</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Invoice #</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Created by</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Approved by</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Created at</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Updated at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(expenses) ? expenses.slice(0, 5) : []).map(expense => {
                          const creatorName = `${expense.creator_first_name || ''} ${expense.creator_last_name || ''}`.trim() || 'N/A';
                          const approverName = `${expense.approver_first_name || ''} ${expense.approver_last_name || ''}`.trim() || '—';
                          const amount = parseFloat(expense.amount || 0);
                          const status = expense.payment_status || 'N/A';
                          const statusClass =
                            status === 'PAID' ? 'success'
                              : status === 'APPROVED' ? 'primary'
                              : status === 'PENDING' ? 'warning'
                              : status === 'REJECTED' ? 'danger'
                              : 'secondary';

                          return (
                            <tr key={expense.id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{expense.project_name || `#${expense.project_id || 'N/A'}`}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{expense.category || 'N/A'}</td>
                              <td style={{ minWidth: 260 }}>{expense.description || '—'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>${Number.isFinite(amount) ? amount.toLocaleString() : '0'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : 'N/A'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{expense.invoice_number || '—'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <span className={`badge badge-${statusClass}`}>{status}</span>
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>{creatorName}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{approverName}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{expense.created_at ? new Date(expense.created_at).toLocaleString() : 'N/A'}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{expense.updated_at ? new Date(expense.updated_at).toLocaleString() : 'N/A'}</td>
                            </tr>
                          );
                        })}

                        {(!Array.isArray(expenses) || expenses.length === 0) && (
                          <tr>
                            <td colSpan="11" className="text-center py-4 text-muted">
                              No expenses found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
        )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <>
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-chart-line mr-2"></i>
                    Project Monitoring Dashboard
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Monitoring */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-info card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-boxes mr-2"></i>
                    Materials Monitoring
                  </h3>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Total Requested</th>
                          <th>Approved</th>
                          <th>Pending</th>
                          <th>Project</th>
                          <th>Site</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialRequests.length > 0 ? (
                          Object.entries(
                            materialRequests.reduce((acc, mr) => {
                              const key = `${mr.material_name}-${mr.project_name}`;
                              if (!acc[key]) {
                                acc[key] = {
                                  material_name: mr.material_name,
                                  project_name: mr.project_name,
                                  site_name: mr.site_name,
                                  total: 0,
                                  approved: 0,
                                  pending: 0
                                };
                              }
                              acc[key].total += parseFloat(mr.quantity || 0);
                              if (mr.status === 'APPROVED') acc[key].approved += parseFloat(mr.quantity || 0);
                              if (mr.status === 'PENDING') acc[key].pending += parseFloat(mr.quantity || 0);
                              return acc;
                            }, {})
                          ).map(([key, data]) => (
                            <tr key={key}>
                              <td><strong>{data.material_name}</strong></td>
                              <td>{data.total.toFixed(2)}</td>
                              <td><span className="badge badge-success">{data.approved.toFixed(2)}</span></td>
                              <td><span className="badge badge-warning">{data.pending.toFixed(2)}</span></td>
                              <td>{data.project_name}</td>
                              <td>{data.site_name}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center py-3 text-muted">No material data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Monitoring */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="card card-warning card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-tools mr-2"></i>
                    Equipment Monitoring
                  </h3>
                </div>
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <div className="info-box">
                        <span className="info-box-icon bg-warning">
                          <i className="fas fa-tools"></i>
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text">Total Equipment</span>
                          <span className="info-box-number">
                            {equipmentSummary.total}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-box">
                        <span className="info-box-icon bg-success">
                          <i className="fas fa-check-circle"></i>
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text">In Use</span>
                          <span className="info-box-number">
                            {equipmentSummary.inUse}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-box">
                        <span className="info-box-icon bg-info">
                          <i className="fas fa-wrench"></i>
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text">Maintenance</span>
                          <span className="info-box-number">
                            {equipmentSummary.maintenance}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>Equipment</th>
                          <th>Type</th>
                          <th>Site</th>
                          <th>Project</th>
                          <th>Status</th>
                          <th>Last Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipment && equipment.length > 0 ? (
                          equipment.map(item => (
                            <tr key={item.id}>
                              <td><strong>{item.name || 'N/A'}</strong></td>
                              <td>{item.type || 'N/A'}</td>
                              <td>{item.site_name || 'N/A'}</td>
                              <td>{item.project_name || 'N/A'}</td>
                              <td>
                                <span className={`badge badge-${
                                  item.status === 'IN_USE' || item.status === 'IN USE'
                                    ? 'success'
                                    : item.status === 'MAINTENANCE'
                                    ? 'warning'
                                    : 'secondary'
                                }`}>
                                  {item.status || 'N/A'}
                                </span>
                              </td>
                              <td>
                                {item.last_used
                                  ? new Date(item.last_used).toLocaleDateString()
                                  : 'N/A'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center text-muted">
                              No equipment configured yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workforce Monitoring */}
          <div className="row">
            <div className="col-12">
              <div className="card card-success card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-users mr-2"></i>
                    Workforce Monitoring
                  </h3>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Project</th>
                          <th>Site</th>
                          <th>Days Worked</th>
                          <th>Total Hours</th>
                          <th>Avg Hours/Day</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workforceSummary.length > 0 ? (
                          workforceSummary.slice(0, 20).map((row, idx) => (
                            <tr key={row.id || idx}>
                              <td><strong>{(row.first_name || '')} {(row.last_name || '')}</strong>{!row.first_name && !row.last_name && row.employee_id ? ` (${row.employee_id})` : ''}</td>
                              <td>{row.project_name || '-'}</td>
                              <td>{row.site_name || '-'}</td>
                              <td>{row.days_worked ?? '-'}</td>
                              <td>{row.total_hours != null ? parseFloat(row.total_hours).toFixed(1) : '-'}</td>
                              <td>{row.avg_hours_per_day != null ? parseFloat(row.avg_hours_per_day).toFixed(1) : '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center py-3 text-muted">No workforce data available. Record attendance to see metrics.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
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
                    Project Manager Reports
                  </h3>
              </div>
              </div>
              </div>
              </div>
          <div className="row">
            <div className="col-md-4">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-clipboard-list mr-2"></i>
                    Project Summary Report
                  </h3>
              </div>
                <div className="card-body">
                  <p>Comprehensive overview of all your projects including budget, expenses, and status.</p>
                  <button className="btn btn-primary btn-block" onClick={() => handleGenerateReport('project-summary')}>
                    <i className="fas fa-download mr-1"></i> Generate Report
                  </button>
            </div>
          </div>
            </div>
            <div className="col-md-4">
              <div className="card card-success card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-chart-line mr-2"></i>
                    Project Progress Report
                  </h3>
                </div>
                <div className="card-body">
                  <p>Track project progress, milestones, and completion status across all projects.</p>
                  <button className="btn btn-success btn-block" onClick={() => handleGenerateReport('project-progress')}>
                    <i className="fas fa-download mr-1"></i> Generate Report
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card card-warning card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-balance-scale mr-2"></i>
                    Budget vs Actual Cost
                  </h3>
                </div>
                <div className="card-body">
                  <p>Compare budgeted vs actual spending to identify variances and cost overruns.</p>
                  <button className="btn btn-warning btn-block" onClick={() => handleGenerateReport('budget-vs-actual')}>
                    <i className="fas fa-download mr-1"></i> Generate Report
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card card-info card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-boxes mr-2"></i>
                    Material Usage Report
                  </h3>
                </div>
                <div className="card-body">
                  <p>Analyze material consumption, usage patterns, and inventory levels.</p>
                  <button className="btn btn-info btn-block" onClick={() => handleGenerateReport('material-usage')}>
                    <i className="fas fa-download mr-1"></i> Generate Report
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card card-danger card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-users mr-2"></i>
                    Workforce Productivity
                  </h3>
                </div>
                <div className="card-body">
                  <p>Monitor workforce performance, attendance, and productivity metrics.</p>
                  <button className="btn btn-danger btn-block" onClick={() => handleGenerateReport('workforce-productivity')}>
                    <i className="fas fa-download mr-1"></i> Generate Report
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card card-secondary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-building mr-2"></i>
                    Site Activity Report
                  </h3>
                </div>
                <div className="card-body">
                  <p>View daily site activities, progress updates, and site supervisor reports (read-only).</p>
                  <button className="btn btn-secondary btn-block" onClick={() => handleGenerateReport('site-activity')}>
                    <i className="fas fa-download mr-1"></i> Generate Report
                  </button>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-shopping-cart mr-2"></i>
                    Procurement Status Report
                  </h3>
                </div>
                <div className="card-body">
                  <p>Track purchase orders, supplier performance, and procurement workflow status.</p>
                  <button className="btn btn-primary btn-block" onClick={() => handleGenerateReport('procurement-status')}>
                    <i className="fas fa-download mr-1"></i> Generate Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sites Tab */}
      {activeTab === 'sites' && (
        <div className="card card-info card-outline">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-building mr-2"></i>
              Sites
            </h3>
            <div className="card-tools">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCreateSite}
              >
                <i className="fas fa-plus mr-1"></i> Create Site
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Site Name</th>
                    <th>Project</th>
                    <th>Location</th>
                    <th>Supervisor</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.length > 0 ? (
                    sites.map(site => (
                      <tr key={site.id}>
                        <td><strong>{site.name || 'N/A'}</strong></td>
                        <td>{site.project_name || 'N/A'}</td>
                        <td>{site.location || 'N/A'}</td>
                        <td>
                          {site.supervisor_first_name
                            ? `${site.supervisor_first_name} ${site.supervisor_last_name || ''}`
                            : 'Unassigned'}
                        </td>
                        <td>
                          <span className={`badge badge-${site.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                            {site.status || 'N/A'}
                          </span>
                        </td>
                        <td>
                          {site.created_at
                            ? new Date(site.created_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <i className="fas fa-building fa-3x text-muted mb-3"></i>
                        <p className="text-muted mb-2">No sites found for your projects.</p>
                        <button className="btn btn-primary btn-sm" onClick={handleCreateSite}>
                          <i className="fas fa-plus mr-1"></i> Create Site
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

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
        />
      )}

      {/* Task Assignment Modal */}
      {showTaskModal && selectedProject && (
        <TaskAssignmentModal
          project={selectedProject}
          siteSupervisors={siteSupervisors}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedProject(null);
            setSiteSupervisors([]);
          }}
          token={token}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          reportType={selectedReportType}
          projects={projects}
          reportData={reportData}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReportType(null);
            setReportData(null);
          }}
          onSubmit={handleGenerateReportSubmit}
        />
        )}

      {/* Site Modal */}
      {showSiteModal && (
        <SiteModal
          projects={projects}
          token={token}
          onClose={() => setShowSiteModal(false)}
          onSave={handleSaveSite}
        />
      )}
      </div>
      </section>
    </div>
  );
};

// Site Modal Component
const SiteModal = ({ projects, token, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    project_id: '',
    name: '',
    location: '',
    supervisor_id: '',
    status: 'ACTIVE'
  });
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  const handleProjectChange = async (e) => {
    const projectId = e.target.value;
    setFormData(prev => ({ ...prev, project_id: projectId, supervisor_id: '' }));

    if (!projectId) {
      setSupervisors([]);
      return;
    }

    try {
      setLoadingSupervisors(true);
      const res = await fetch(`http://localhost:5000/api/tasks/site-supervisors/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupervisors(Array.isArray(data) ? data : []);
      } else {
        setSupervisors([]);
      }
    } catch (error) {
      console.error('Error loading site supervisors:', error);
      setSupervisors([]);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.project_id || !formData.name.trim()) {
      alert('Project and site name are required');
      return;
    }
    onSave(formData);
  };

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
          style={{ margin: '30px auto', maxWidth: '600px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header bg-info">
              <h4 className="modal-title text-white">
                <i className="fas fa-building mr-2"></i>
                Create Site
              </h4>
              <button type="button" className="close text-white" onClick={onClose}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Project *</label>
                  <select
                    className="form-control"
                    value={formData.project_id}
                    onChange={handleProjectChange}
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Site Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., District / Sector / Village"
                  />
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Supervisor (optional)</label>
                      <select
                        className="form-control"
                        value={formData.supervisor_id}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, supervisor_id: e.target.value }))
                        }
                        disabled={loadingSupervisors || !formData.project_id}
                      >
                        <option value="">
                          {formData.project_id
                            ? loadingSupervisors
                              ? 'Loading supervisors...'
                              : 'Select Supervisor'
                            : 'Select a project first'}
                        </option>
                        {supervisors.map(sup => (
                          <option key={sup.id} value={sup.id}>
                            {sup.first_name} {sup.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        className="form-control"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, status: e.target.value }))
                        }
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
                  Cancel
                </button>
                <button type="submit" className="btn btn-info">
                  <i className="fas fa-save mr-1"></i>
                  Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// Project Modal Component
const ProjectModal = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    start_date: project?.start_date ? project.start_date.split('T')[0] : '',
    end_date: project?.end_date ? project.end_date.split('T')[0] : '',
    budget: project?.budget || '',
    status: project?.status || 'ACTIVE'
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        end_date: project.end_date ? project.end_date.split('T')[0] : '',
        budget: project.budget || '',
        status: project.status || 'ACTIVE'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        budget: '',
        status: 'ACTIVE'
      });
    }
  }, [project]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.budget) {
      alert('Name and budget are required');
      return;
    }
    onSave(formData);
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}></div>
      <div className="modal fade show" style={{ display: 'block', zIndex: 1050, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }} tabIndex="-1" role="dialog" onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}>
        <div className="modal-dialog modal-lg" role="document" style={{ margin: '30px auto', maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header bg-primary">
              <h4 className="modal-title text-white">
                <i className={`fas fa-${project ? 'edit' : 'plus'} mr-2`}></i>
                {project ? 'Edit Project' : 'Create New Project'}
              </h4>
              <button type="button" className="close text-white" onClick={onClose}>
                <span>&times;</span>
              </button>
    </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Start Date *</label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>End Date *</label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Budget *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        className="form-control"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      />
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
                        <option value="COMPLETED">Completed</option>
                        <option value="ON_HOLD">On Hold</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {project ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// Task Assignment Modal Component
const TaskAssignmentModal = ({ project, siteSupervisors, onClose, token }) => {
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor || !taskDescription) {
      alert('Please select a supervisor and enter task description');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: project.id,
          assigned_to: selectedSupervisor,
          title: taskDescription.substring(0, 100),
          description: taskDescription,
          due_date: dueDate || null,
          priority: 'MEDIUM'
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Task assigned successfully');
        onClose();
        // Refresh would be handled by parent component
        window.location.reload();
      } else {
        alert(data.message || 'Failed to assign task');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('Error assigning task');
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}></div>
      <div className="modal fade show" style={{ display: 'block', zIndex: 1050, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }} tabIndex="-1" role="dialog" onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}>
        <div className="modal-dialog" role="document" style={{ margin: '30px auto', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header bg-primary">
              <h4 className="modal-title text-white">
                <i className="fas fa-tasks mr-2"></i>
                Assign Task - {project.name}
              </h4>
              <button type="button" className="close text-white" onClick={onClose}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Site Supervisor *</label>
                  <select
                    required
                    className="form-control"
                    value={selectedSupervisor}
                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                  >
                    <option value="">Select Supervisor</option>
                    {siteSupervisors.map(supervisor => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.first_name} {supervisor.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Task Description *</label>
                  <textarea
                    required
                    className="form-control"
                    rows="4"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Enter task details..."
                  />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// Report Modal Component
const ReportModal = ({ reportType, projects, reportData, onClose, onSubmit }) => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    projectId: ''
  });

  const reportNames = {
    'project-summary': 'Project Summary Report',
    'project-progress': 'Project Progress Report',
    'budget-vs-actual': 'Budget vs Actual Cost Report',
    'material-usage': 'Material Usage Report',
    'workforce-productivity': 'Workforce Productivity Report',
    'site-activity': 'Site Activity Report',
    'procurement-status': 'Procurement Status Report'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(filters);
  };

  const handleExport = async (format) => {
    if (!reportData) {
      alert('Please generate the report first');
      return;
    }

    if (!Array.isArray(reportData) || reportData.length === 0) {
      alert('No data available to export');
      return;
    }

    const reportTitle = reportNames[reportType] || 'Report';
    const fileName = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'PDF') {
      await exportToPDF(reportData, reportTitle, fileName);
    } else if (format === 'Excel') {
      exportToExcel(reportData, reportTitle, fileName);
    }
  };

  const exportToPDF = async (data, title, fileName) => {
    let logoDataUrl = null;
    try {
      logoDataUrl = await loadLogoDataUrl();
    } catch (e) {
      console.warn('Logo load failed', e);
    }

    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;
      
      // Check if autoTable is available
      // With jspdf 2.x, autoTable should be available directly on the instance
      if (typeof doc.autoTable !== 'function') {
        console.error('autoTable not available. Make sure jspdf-autotable is imported.');
        alert('PDF export plugin not loaded. Please refresh the page.\n\nIf the issue persists, check the browser console.');
        return;
      }

      // Draw PDF header with logo and company branding
      const drawPdfHeader = (reportTitle, genDate, headerHeight = 48) => {
        doc.setFillColor(66, 139, 202);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        const logoW = 38;
        const logoH = 38;
        const logoX = margin;
        const logoY = (headerHeight - logoH) / 2;
        if (logoDataUrl) {
          try {
            doc.setFillColor(255, 255, 255);
            doc.rect(logoX, logoY, logoW, logoH, 'F');
            doc.addImage(logoDataUrl, 'JPEG', logoX, logoY, logoW, logoH);
          } catch (e) {
            console.warn('addImage failed', e);
          }
        }
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(PDF_COMPANY.name, logoX + logoW + 8, logoY + 12);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`${PDF_COMPANY.tel} | ${PDF_COMPANY.email}`, logoX + logoW + 8, logoY + 22);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(reportTitle, margin, headerHeight - 10);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        if (genDate) {
          const gw = doc.getTextWidth(genDate);
          doc.text(genDate, pageWidth - margin - gw, headerHeight - 10);
        }
        doc.setTextColor(0, 0, 0);
      };

      // Helper function to format values
      const formatValue = (val, key = '') => {
        if (val === null || val === undefined) return 'N/A';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (typeof val === 'string' && val.includes('T') && val.includes('Z')) {
          try {
            return new Date(val).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          } catch (e) {
            return val;
          }
        }
        if (typeof val === 'number') {
          // Format currency for budget/amount fields
          if (key.toLowerCase().includes('budget') || key.toLowerCase().includes('amount') || 
              key.toLowerCase().includes('spent') || key.toLowerCase().includes('expense')) {
            return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
        }
        return String(val);
      };

      // Special handling for Project Summary Report
      if (reportType === 'project-summary' && data.length > 0) {
        data.forEach((project, index) => {
          if (index > 0) {
            doc.addPage();
            yPos = margin;
          }

          const genDate = `Generated: ${new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`;
          drawPdfHeader('PROJECT SUMMARY REPORT', genDate, 48);
          yPos = 58;

          // Project Information Card
          doc.setFillColor(245, 245, 245);
          // Use rect instead of roundedRect for compatibility
          doc.rect(margin, yPos, pageWidth - (margin * 2), 60, 'F');
          
          // Project Name
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(66, 139, 202);
          doc.text('Project Information', margin + 5, yPos + 10);
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(project.name || 'N/A', margin + 5, yPos + 20);
          
          // Project Details in two columns
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          const leftCol = margin + 5;
          const rightCol = pageWidth / 2 + 5;
          let detailY = yPos + 30;
          
          // Left Column
          doc.setFont(undefined, 'bold');
          doc.text('Project ID:', leftCol, detailY);
          doc.setFont(undefined, 'normal');
          doc.text(String(project.id || 'N/A'), leftCol + 25, detailY);
          
          doc.setFont(undefined, 'bold');
          doc.text('Description:', leftCol, detailY + 6);
          doc.setFont(undefined, 'normal');
          const desc = (project.description || 'N/A').substring(0, 50);
          doc.text(desc, leftCol + 25, detailY + 6);
          
          doc.setFont(undefined, 'bold');
          doc.text('Status:', leftCol, detailY + 12);
          doc.setFont(undefined, 'normal');
          const status = project.status || 'N/A';
          const statusColor = status === 'ACTIVE' ? [40, 167, 69] : 
                             status === 'COMPLETED' ? [23, 162, 184] : 
                             [108, 117, 125];
          doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.rect(leftCol + 25, detailY + 8, 20, 5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          // Center text manually
          const statusTextWidth = doc.getTextWidth(status);
          doc.text(status, leftCol + 25 + (20 - statusTextWidth) / 2, detailY + 11);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          
          // Right Column
          doc.setFont(undefined, 'bold');
          doc.text('Start Date:', rightCol, detailY);
          doc.setFont(undefined, 'normal');
          doc.text(formatValue(project.start_date), rightCol + 25, detailY);
          
          doc.setFont(undefined, 'bold');
          doc.text('End Date:', rightCol, detailY + 6);
          doc.setFont(undefined, 'normal');
          doc.text(formatValue(project.end_date), rightCol + 25, detailY + 6);
          
          doc.setFont(undefined, 'bold');
          doc.text('Sites:', rightCol, detailY + 12);
          doc.setFont(undefined, 'normal');
          doc.text(String(project.site_count || 0), rightCol + 25, detailY + 12);
          
          yPos += 70;

          // Financial Summary Card
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos, pageWidth - (margin * 2), 50, 'F');
          
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(66, 139, 202);
          doc.text('Financial Summary', margin + 5, yPos + 10);
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          
          const budget = parseFloat(project.budget || 0);
          const totalExpenses = parseFloat(project.total_expenses || 0);
          const paidExpenses = parseFloat(project.paid_expenses || 0);
          const remaining = budget - paidExpenses;
          const budgetUsage = budget > 0 ? (paidExpenses / budget * 100) : 0;
          
          // Financial metrics in grid
          const metrics = [
            { label: 'Total Budget', value: formatValue(budget, 'budget'), color: [40, 167, 69] },
            { label: 'Total Expenses', value: formatValue(totalExpenses, 'amount'), color: [255, 193, 7] },
            { label: 'Paid Amount', value: formatValue(paidExpenses, 'amount'), color: [23, 162, 184] },
            { label: 'Remaining Budget', value: formatValue(remaining, 'budget'), color: remaining < 0 ? [220, 53, 69] : [40, 167, 69] },
            { label: 'Budget Usage', value: budgetUsage.toFixed(1) + '%', color: budgetUsage > 100 ? [220, 53, 69] : budgetUsage > 80 ? [255, 193, 7] : [40, 167, 69] }
          ];
          
          let metricY = yPos + 20;
          const metricWidth = (pageWidth - (margin * 2) - 20) / 3;
          metrics.forEach((metric, idx) => {
            const x = margin + 5 + (idx % 3) * (metricWidth + 5);
            const row = Math.floor(idx / 3);
            const currentY = metricY + row * 12;
            
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text(metric.label + ':', x, currentY);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
            doc.text(metric.value, x, currentY + 6);
            doc.setTextColor(0, 0, 0);
          });
          
          yPos += 60;

          // Budget Progress Bar
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.text('Budget Progress', margin, yPos);
          yPos += 8;
          
          // Progress bar background
          doc.setFillColor(230, 230, 230);
          doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
          
          // Progress bar fill
          const progressWidth = Math.min(100, Math.max(0, budgetUsage)) / 100 * (pageWidth - (margin * 2));
          const progressColor = budgetUsage > 100 ? [220, 53, 69] : budgetUsage > 80 ? [255, 193, 7] : [40, 167, 69];
          doc.setFillColor(progressColor[0], progressColor[1], progressColor[2]);
          doc.rect(margin, yPos, progressWidth, 8, 'F');
          
          // Progress percentage text
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          const progressText = budgetUsage.toFixed(1) + '%';
          const progressTextWidth = doc.getTextWidth(progressText);
          doc.text(
            progressText,
            margin + progressWidth / 2 - progressTextWidth / 2,
            yPos + 5
          );
          doc.setTextColor(0, 0, 0);
          
          yPos += 20;

          // Additional Details Table (if available)
          const additionalFields = Object.keys(project).filter(key => 
            !['id', 'name', 'description', 'start_date', 'end_date', 'budget', 
              'status', 'site_count', 'total_expenses', 'paid_expenses', 
              'project_manager_id', 'created_at', 'updated_at'].includes(key.toLowerCase())
          );
          
          if (additionalFields.length > 0) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Additional Information', margin, yPos);
            yPos += 8;
            
            const additionalData = additionalFields.map(key => [
              key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              formatValue(project[key], key)
            ]);
            
            doc.autoTable({
              startY: yPos,
              head: [['Field', 'Value']],
              body: additionalData,
              theme: 'striped',
              headStyles: { 
                fillColor: [66, 139, 202], 
                textColor: 255, 
                fontStyle: 'bold' 
              },
              styles: { fontSize: 9, cellPadding: 3 },
              margin: { left: margin, right: margin },
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
          }

          // Footer
          const footerY = pageHeight - 15;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, footerY, pageWidth - margin, footerY);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          const footerText = `${PDF_COMPANY.name} | ${PDF_COMPANY.tel} | ${PDF_COMPANY.email} | Page ${doc.internal.getNumberOfPages()}`;
          const footerTextWidth = doc.getTextWidth(footerText);
          doc.text(
            footerText,
            pageWidth / 2 - footerTextWidth / 2,
            footerY + 5
          );
        });
      } else {
        // Generic report format for other report types
        const genDateGeneric = `Generated: ${new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
        drawPdfHeader(title, genDateGeneric, 42);
        let yPos = 52;
        
        // Report info
        if (filters.startDate || filters.endDate) {
          doc.setFontSize(9);
          let dateRange = 'Date Range: ';
          if (filters.startDate) dateRange += filters.startDate;
          if (filters.endDate) dateRange += ` to ${filters.endDate}`;
          doc.text(dateRange, margin, yPos);
          yPos += 6;
        }
        
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
        yPos += 10;
        
        // Table
        const tableData = data.map(row => 
          Object.keys(row).map(key => formatValue(row[key], key))
        );
        
        const headers = Object.keys(data[0]).map(key => 
          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        );
        
        doc.autoTable({
          startY: yPos,
          head: [headers],
          body: tableData,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { 
            fillColor: [66, 139, 202], 
            textColor: 255, 
            fontStyle: 'bold' 
          },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { left: margin, right: margin },
        });
      }
      
      // Add page numbers to all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const pageText = `Page ${i} of ${pageCount}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        doc.text(
          pageText,
          pageWidth / 2 - pageTextWidth / 2,
          pageHeight - 5
        );
      }
      
      // Save PDF
      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF: ' + error.message);
    }
  };

  const exportToExcel = (data, title, fileName) => {
    try {
      // Prepare worksheet data
      const headers = Object.keys(data[0]).map(key => 
        key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      );
      
      // Create data rows
      const dataRows = data.map(row => 
        Object.values(row).map(val => {
          if (val === null || val === undefined) return 'N/A';
          if (typeof val === 'object') return JSON.stringify(val);
          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
          return val;
        })
      );
      
      // Combine headers and data
      const worksheetData = [headers, ...dataRows];
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths (auto-size based on content)
      const maxWidth = 50;
      const minWidth = 10;
      const colWidths = headers.map((header, idx) => {
        const headerLength = header.length;
        const maxDataLength = Math.max(
          ...dataRows.map(row => String(row[idx] || '').length)
        );
        const width = Math.min(maxWidth, Math.max(minWidth, Math.max(headerLength, maxDataLength) + 2));
        return { wch: width };
      });
      ws['!cols'] = colWidths;
      
      // Freeze header row
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
      
      // Add metadata sheet
      const metaData = [
        ['Report Title', title],
        ['Generated Date', new Date().toLocaleString()],
        ['Date Range', filters.startDate && filters.endDate 
          ? `${filters.startDate} to ${filters.endDate}`
          : filters.startDate ? `From ${filters.startDate}` 
          : filters.endDate ? `Until ${filters.endDate}`
          : 'All Time'],
        ['Total Records', data.length]
      ];
      const metaWs = XLSX.utils.aoa_to_sheet(metaData);
      XLSX.utils.book_append_sheet(wb, metaWs, 'Report Info');
      
      // Save file
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1040, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}></div>
      <div className="modal fade show" style={{ display: 'block', zIndex: 1050, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }} tabIndex="-1" role="dialog" onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}>
        <div className="modal-dialog modal-xl" role="document" style={{ margin: '30px auto', maxWidth: '90%' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header bg-primary">
              <h4 className="modal-title text-white">
                <i className="fas fa-file-alt mr-2"></i>
                {reportNames[reportType] || 'Generate Report'}
              </h4>
              <button type="button" className="close text-white" onClick={onClose}>
                <span>&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Project (Optional)</label>
                      <select
                        className="form-control"
                        value={filters.projectId}
                        onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                      >
                        <option value="">All Projects</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {reportData && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5>Report Results</h5>
                      <div>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-success mr-2" 
                          onClick={() => handleExport('PDF')}
                          disabled={!Array.isArray(reportData) || reportData.length === 0}
                          title={!Array.isArray(reportData) || reportData.length === 0 ? 'No data to export' : 'Export to PDF'}
                        >
                          <i className="fas fa-file-pdf mr-1"></i> Export PDF
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-info" 
                          onClick={() => handleExport('Excel')}
                          disabled={!Array.isArray(reportData) || reportData.length === 0}
                          title={!Array.isArray(reportData) || reportData.length === 0 ? 'No data to export' : 'Export to Excel'}
                        >
                          <i className="fas fa-file-excel mr-1"></i> Export Excel
                        </button>
                      </div>
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {Array.isArray(reportData) && reportData.length > 0 ? (
                        <>
                          <div className="alert alert-success mb-2">
                            <i className="fas fa-check-circle mr-2"></i>
                            Found {reportData.length} record{reportData.length !== 1 ? 's' : ''}
                          </div>
                          <table className="table table-bordered table-striped table-sm">
                            <thead className="thead-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                              <tr>
                                {Object.keys(reportData[0]).map(key => (
                                  <th key={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.map((row, idx) => (
                                <tr key={idx}>
                                  {Object.values(row).map((val, i) => {
                                    // Format dates
                                    let displayValue = val;
                                    if (val !== null && val !== undefined) {
                                      if (typeof val === 'string' && val.includes('T') && val.includes('Z')) {
                                        try {
                                          displayValue = new Date(val).toLocaleString();
                                        } catch (e) {
                                          displayValue = val;
                                        }
                                      } else if (typeof val === 'number') {
                                        displayValue = val.toLocaleString('en-US', { maximumFractionDigits: 2 });
                                      } else {
                                        displayValue = String(val);
                                      }
                                    } else {
                                      displayValue = 'N/A';
                                    }
                                    return <td key={i}>{displayValue}</td>;
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <div className="alert alert-info">
                          <i className="fas fa-info-circle mr-2"></i>
                          {reportData.message || 'No data found for the selected criteria'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-search mr-1"></i> Generate Report
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectManagerDashboard;
