import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Import jspdf-autotable as side effect - it extends jsPDF prototype
import 'jspdf-autotable';

const SiteSupervisorDashboard = ({ activeTab: propActiveTab, onTabChange }) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [sites, setSites] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [siteActivities, setSiteActivities] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMaterialRequestModal, setShowMaterialRequestModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({
    totalSites: 0,
    pendingRequests: 0,
    totalActivities: 0,
    totalAttendance: 0,
    activeEquipment: 0
  });

  // Sync with prop changes from parent (sidebar clicks)
  useEffect(() => {
    if (propActiveTab !== undefined && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

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
  }, [activeTab, token]);

  // Update stats when data changes
  useEffect(() => {
    setStats({
      totalSites: sites.length,
      pendingRequests: materialRequests.filter(r => r.status === 'PENDING').length,
      totalActivities: siteActivities.length,
      totalAttendance: attendance.length,
      activeEquipment: equipment.filter(e => e.status === 'ACTIVE').length
    });
  }, [sites, materialRequests, siteActivities, attendance, equipment]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sites
      try {
        const sitesRes = await fetch('http://localhost:5000/api/site-activities/sites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          setSites(sitesData);
        }
      } catch (e) {
        console.log('Error fetching sites:', e);
      }

      // Fetch material requests
      try {
        const mrRes = await fetch('http://localhost:5000/api/material-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (mrRes.ok) {
          const mrData = await mrRes.json();
          setMaterialRequests(mrData.filter(r => r.requested_by === user.id));
        }
      } catch (e) {
        console.log('Error fetching material requests:', e);
      }

      // Fetch site activities
      try {
        const activitiesRes = await fetch('http://localhost:5000/api/site-activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setSiteActivities(activitiesData);
        }
      } catch (e) {
        console.log('Error fetching site activities:', e);
      }

      // Fetch attendance
      try {
        const attendanceRes = await fetch('http://localhost:5000/api/employees/attendance', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setAttendance(attendanceData);
        }
      } catch (e) {
        console.log('Error fetching attendance:', e);
      }

      // Fetch equipment
      try {
        const equipmentRes = await fetch('http://localhost:5000/api/equipment', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (equipmentRes.ok) {
          const equipmentData = await equipmentRes.json();
          setEquipment(equipmentData);
        }
      } catch (e) {
        console.log('Error fetching equipment:', e);
      }

      // Fetch materials for dropdown
      try {
        const materialsRes = await fetch('http://localhost:5000/api/materials', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (materialsRes.ok) {
          const materialsData = await materialsRes.json();
          setMaterials(materialsData);
        }
      } catch (e) {
        console.log('Error fetching materials:', e);
      }

      // Fetch employees for attendance
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

      // Update stats after all data is fetched - use useEffect to recalculate when state changes
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterialRequest = async (formData) => {
    try {
      const response = await fetch('http://localhost:5000/api/material-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchData();
        setShowMaterialRequestModal(false);
        alert('Material request submitted successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit material request');
      }
    } catch (error) {
      console.error('Error creating material request:', error);
      alert('Error submitting material request');
    }
  };

  const handleCreateActivity = async (formData, photos) => {
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      photos.forEach(photo => {
        formDataToSend.append('photos', photo);
      });

      const response = await fetch('http://localhost:5000/api/site-activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        await fetchData();
        setShowActivityModal(false);
        alert('Daily activity recorded successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to record activity');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      alert('Error recording activity');
    }
  };

  const handleRecordAttendance = async (attendanceData) => {
    try {
      const response = await fetch('http://localhost:5000/api/employees/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(attendanceData)
      });

      if (response.ok) {
        await fetchData();
        setShowAttendanceModal(false);
        alert('Attendance recorded successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to record attendance');
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      alert('Error recording attendance');
    }
  };

  const handleGenerateReport = async (reportType, filters) => {
    try {
      let url = `http://localhost:5000/api/reports?type=${reportType}`;
      if (filters.startDate) url += `&startDate=${filters.startDate}`;
      if (filters.endDate) url += `&endDate=${filters.endDate}`;
      if (filters.siteId) url += `&siteId=${filters.siteId}`;

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
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const title = getReportTitle(selectedReportType);
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, yPos);
      yPos += 15;

      // Date range if available
      if (reportData.length > 0 && reportData[0].activity_date) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const dateRange = `Generated on: ${new Date().toLocaleDateString()}`;
        const dateWidth = doc.getTextWidth(dateRange);
        doc.text(dateRange, (pageWidth - dateWidth) / 2, yPos);
        yPos += 10;
      }

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
      'daily-activity': 'Daily Site Activity Report',
      'site-progress': 'Site Progress Report',
      'material-requests': 'Material Request Report',
      'material-consumption': 'Material Consumption Report',
      'incident-safety': 'Incident & Safety Report'
    };
    return titles[reportType] || 'Report';
  };

  const formatReportDataForPDF = (reportType, data) => {
    if (!data || data.length === 0) {
      return { headers: ['No Data'], rows: [['No records found']] };
    }

    switch (reportType) {
      case 'daily-activity':
        return {
          headers: ['Date', 'Site', 'Project', 'Progress %', 'Workforce', 'Weather'],
          rows: data.map(item => [
            new Date(item.activity_date).toLocaleDateString(),
            item.site_name || 'N/A',
            item.project_name || 'N/A',
            `${item.progress_percentage || 0}%`,
            item.workforce_count || 0,
            item.weather_conditions || 'N/A'
          ])
        };
      case 'site-progress':
        return {
          headers: ['Site', 'Project', 'Total Reports', 'Current Progress %', 'Avg Progress %', 'Last Report'],
          rows: data.map(item => [
            item.site_name || 'N/A',
            item.project_name || 'N/A',
            item.total_reports || 0,
            `${item.current_progress || 0}%`,
            `${item.avg_progress ? parseFloat(item.avg_progress).toFixed(2) : 0}%`,
            item.last_report_date ? new Date(item.last_report_date).toLocaleDateString() : 'N/A'
          ])
        };
      case 'material-requests':
        return {
          headers: ['Date', 'Material', 'Quantity', 'Unit', 'Site', 'Status'],
          rows: data.map(item => [
            new Date(item.created_at).toLocaleDateString(),
            item.material_name || 'N/A',
            item.quantity || 0,
            item.unit || 'N/A',
            item.site_name || 'N/A',
            item.status || 'N/A'
          ])
        };
      case 'material-consumption':
        return {
          headers: ['Material', 'Unit', 'Total Requested', 'Approved', 'Pending', 'Site'],
          rows: data.map(item => [
            item.material_name || 'N/A',
            item.unit || 'N/A',
            item.total_requested || 0,
            item.approved_quantity || 0,
            item.pending_quantity || 0,
            item.site_name || 'N/A'
          ])
        };
      case 'incident-safety':
        return {
          headers: ['Date', 'Site', 'Project', 'Issues Encountered'],
          rows: data.map(item => [
            new Date(item.activity_date).toLocaleDateString(),
            item.site_name || 'N/A',
            item.project_name || 'N/A',
            (item.issues_encountered || 'N/A').substring(0, 50) + '...'
          ])
        };
      default:
        return { headers: ['Data'], rows: data.map(item => [JSON.stringify(item)]) };
    }
  };

  const formatReportDataForExcel = (reportType, data) => {
    const pdfData = formatReportDataForPDF(reportType, data);
    return pdfData;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">
                <i className="fas fa-hard-hat mr-2"></i>
                Site Supervisor Dashboard
                <small className="text-muted ml-2">- CRMS</small>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
        {activeTab === 'overview' && (
          <div>
              <div className="row">
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-info">
                    <div className="inner">
                      <h3>{stats.totalSites}</h3>
                      <p>My Sites</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-building"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-warning">
                    <div className="inner">
                      <h3>{stats.pendingRequests}</h3>
                      <p>Pending Requests</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-success">
                    <div className="inner">
                      <h3>{stats.totalActivities}</h3>
                      <p>Total Activities</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-tasks"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-danger">
                    <div className="inner">
                      <h3>{stats.activeEquipment}</h3>
                      <p>Active Equipment</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-tools"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Recent Material Requests</h3>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materialRequests.slice(0, 5).map(request => (
                            <tr key={request.id}>
                              <td>{request.material_name || 'N/A'}</td>
                              <td>{request.quantity} {request.unit || ''}</td>
                              <td>
                                <span className={`badge badge-${request.status === 'APPROVED' ? 'success' : request.status === 'PENDING' ? 'warning' : 'danger'}`}>
                                  {request.status}
                                </span>
                              </td>
                              <td>{new Date(request.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                          {materialRequests.length === 0 && (
                            <tr>
                              <td colSpan="4" className="text-center">No material requests</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Recent Site Activities</h3>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Site</th>
                            <th>Progress</th>
                            <th>Workforce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {siteActivities.slice(0, 5).map(activity => (
                            <tr key={activity.id}>
                              <td>{new Date(activity.activity_date).toLocaleDateString()}</td>
                              <td>{activity.site_name || 'N/A'}</td>
                              <td>{activity.progress_percentage || 0}%</td>
                              <td>{activity.workforce_count || 0}</td>
                            </tr>
                          ))}
                          {siteActivities.length === 0 && (
                            <tr>
                              <td colSpan="4" className="text-center">No activities recorded</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
              </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'material-requests' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Material Requests</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowMaterialRequestModal(true)}>
                    <i className="fas fa-plus"></i> Submit Request
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
              <thead>
                <tr>
                      <th>ID</th>
                  <th>Material</th>
                  <th>Quantity</th>
                      <th>Unit</th>
                  <th>Site</th>
                  <th>Status</th>
                      <th>Requested Date</th>
                </tr>
              </thead>
              <tbody>
                {materialRequests.map(request => (
                  <tr key={request.id}>
                        <td>{request.id}</td>
                        <td>{request.material_name || 'N/A'}</td>
                    <td>{request.quantity}</td>
                        <td>{request.unit || 'N/A'}</td>
                        <td>{request.site_name || 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${request.status === 'APPROVED' ? 'success' : request.status === 'PENDING' ? 'warning' : 'danger'}`}>
                            {request.status}
                          </span>
                        </td>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                    {materialRequests.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">No material requests found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'daily-activity' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Daily Site Activity</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowActivityModal(true)}>
                    <i className="fas fa-plus"></i> Record Activity
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Site</th>
                      <th>Project</th>
                      <th>Progress %</th>
                      <th>Workforce</th>
                      <th>Weather</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteActivities.map(activity => (
                      <tr key={activity.id}>
                        <td>{new Date(activity.activity_date).toLocaleDateString()}</td>
                        <td>{activity.site_name || 'N/A'}</td>
                        <td>{activity.project_name || 'N/A'}</td>
                        <td>{activity.progress_percentage || 0}%</td>
                        <td>{activity.workforce_count || 0}</td>
                        <td>{activity.weather_conditions || 'N/A'}</td>
                        <td>
                          {activity.photos && JSON.parse(activity.photos || '[]').length > 0 && (
                            <span className="badge badge-info">
                              <i className="fas fa-image"></i> {JSON.parse(activity.photos).length} photos
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {siteActivities.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">No activities recorded</td>
                      </tr>
                    )}
              </tbody>
            </table>
              </div>
          </div>
        )}

        {activeTab === 'attendance' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Labor Attendance</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAttendanceModal(true)}>
                    <i className="fas fa-plus"></i> Record Attendance
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                      <th>Hours Worked</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(record => (
                  <tr key={record.id}>
                        <td>{record.employee_name || record.employee_id}</td>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td>{record.check_in || 'N/A'}</td>
                        <td>{record.check_out || 'N/A'}</td>
                        <td>{record.hours_worked || 0}</td>
                  </tr>
                ))}
                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center">No attendance records found</td>
                      </tr>
                    )}
              </tbody>
            </table>
              </div>
          </div>
        )}

          {activeTab === 'equipment' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Equipment Usage</h3>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Site</th>
                      <th>Status</th>
                      <th>Hours Used</th>
                      <th>Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map(item => (
                      <tr key={item.id}>
                        <td>{item.name || 'N/A'}</td>
                        <td>{item.site_name || 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${item.status === 'ACTIVE' ? 'success' : item.status === 'MAINTENANCE' ? 'warning' : 'danger'}`}>
                            {item.status || 'N/A'}
                          </span>
                        </td>
                        <td>{item.hours_used || 0}</td>
                        <td>{item.last_used ? new Date(item.last_used).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                    {equipment.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center">No equipment found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {activeTab === 'reports' && (
            <div className="row">
              <div className="col-md-4">
                <div className="card card-primary card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Daily Site Activity Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Generate a report of all daily site activities with progress and workforce data.</p>
                    <button className="btn btn-primary" onClick={() => handleGenerateReport('daily-activity', {})}>
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-success card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Site Progress Report</h3>
                  </div>
                  <div className="card-body">
                    <p>View progress summary for all sites with statistics and trends.</p>
                    <button className="btn btn-success" onClick={() => handleGenerateReport('site-progress', {})}>
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-info card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Material Request Report</h3>
                  </div>
                  <div className="card-body">
                    <p>View all material requests with status and approval information.</p>
                    <button className="btn btn-info" onClick={() => handleGenerateReport('material-requests', {})}>
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-warning card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Material Consumption Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Analyze material consumption patterns and usage statistics.</p>
                    <button className="btn btn-warning" onClick={() => handleGenerateReport('material-consumption', {})}>
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-danger card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Incident & Safety Report</h3>
              </div>
                  <div className="card-body">
                    <p>Review incidents, safety issues, and problems encountered on sites.</p>
                    <button className="btn btn-danger" onClick={() => handleGenerateReport('incident-safety', {})}>
                      Generate Report
                    </button>
              </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </section>

      {/* Material Request Modal */}
      {showMaterialRequestModal && (
        <MaterialRequestModal
          sites={sites}
          materials={materials}
          onClose={() => setShowMaterialRequestModal(false)}
          onSubmit={handleCreateMaterialRequest}
        />
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <ActivityModal
          sites={sites}
          onClose={() => setShowActivityModal(false)}
          onSubmit={handleCreateActivity}
        />
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <AttendanceModal
          employees={employees}
          sites={sites}
          onClose={() => setShowAttendanceModal(false)}
          onSubmit={handleRecordAttendance}
        />
      )}

      {/* Report Modal */}
      {showReportModal && reportData && (
        <ReportModal
          reportType={selectedReportType}
          reportData={reportData}
          sites={sites}
          onClose={() => {
            setShowReportModal(false);
            setReportData(null);
          }}
          onExportPDF={exportToPDF}
          onExportExcel={exportToExcel}
        />
      )}
    </div>
  );
};

// Material Request Modal Component
const MaterialRequestModal = ({ sites, materials, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    site_id: '',
    material_id: '',
    quantity: '',
    priority: 'NORMAL',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.site_id || !formData.material_id || !formData.quantity) {
      alert('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Submit Material Request</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Site *</label>
                    <select
                      className="form-control"
                      value={formData.site_id}
                      onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                      required
                    >
                      <option value="">Select Site</option>
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Material *</label>
                    <select
                      className="form-control"
                      value={formData.material_id}
                      onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
                      required
                    >
                      <option value="">Select Material</option>
                      {materials.map(material => (
                        <option key={material.id} value={material.id}>{material.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      className="form-control"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or requirements..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Activity Modal Component
const ActivityModal = ({ sites, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    site_id: '',
    activity_date: new Date().toISOString().split('T')[0],
    work_description: '',
    progress_percentage: 0,
    workforce_count: 0,
    equipment_used: '',
    issues_encountered: '',
    weather_conditions: ''
  });
  const [photos, setPhotos] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }
    setPhotos(files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.site_id) {
      alert('Please select a site');
      return;
    }
    onSubmit(formData, photos);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Record Daily Site Activity</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Site *</label>
                    <select
                      className="form-control"
                      value={formData.site_id}
                      onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                      required
                    >
                      <option value="">Select Site</option>
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Activity Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.activity_date}
                      onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Progress Percentage</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.progress_percentage}
                      onChange={(e) => setFormData({ ...formData, progress_percentage: e.target.value })}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Workforce Count</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.workforce_count}
                      onChange={(e) => setFormData({ ...formData, workforce_count: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Work Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.work_description}
                  onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                  placeholder="Describe the work performed today..."
                />
              </div>
              <div className="form-group">
                <label>Equipment Used</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.equipment_used}
                  onChange={(e) => setFormData({ ...formData, equipment_used: e.target.value })}
                  placeholder="List equipment used (comma separated)"
                />
              </div>
              <div className="form-group">
                <label>Issues Encountered</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={formData.issues_encountered}
                  onChange={(e) => setFormData({ ...formData, issues_encountered: e.target.value })}
                  placeholder="Any issues, incidents, or safety concerns..."
                />
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Weather Conditions</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.weather_conditions}
                      onChange={(e) => setFormData({ ...formData, weather_conditions: e.target.value })}
                      placeholder="e.g., Sunny, Rainy, Cloudy"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Site Photos (Max 5)</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                    />
                    {photos.length > 0 && (
                      <small className="text-muted">{photos.length} photo(s) selected</small>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Record Activity</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Attendance Modal Component
const AttendanceModal = ({ employees, sites, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    site_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    hours_worked: 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.site_id || !formData.date) {
      alert('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Record Attendance</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Employee *</label>
                <select
                  className="form-control"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id || emp.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Site *</label>
                <select
                  className="form-control"
                  value={formData.site_id}
                  onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                  required
                >
                  <option value="">Select Site</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Check In</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.check_in}
                      onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Check Out</label>
                    <input
                      type="time"
                      className="form-control"
                      value={formData.check_out}
                      onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Hours Worked</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.hours_worked}
                  onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                  min="0"
                  max="24"
                  step="0.5"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Record Attendance</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Report Modal Component
const ReportModal = ({ reportType, reportData, sites, onClose, onExportPDF, onExportExcel }) => {
  const getReportTitle = (type) => {
    const titles = {
      'daily-activity': 'Daily Site Activity Report',
      'site-progress': 'Site Progress Report',
      'material-requests': 'Material Request Report',
      'material-consumption': 'Material Consumption Report',
      'incident-safety': 'Incident & Safety Report'
    };
    return titles[type] || 'Report';
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
              <table className="table table-bordered table-striped">
                <thead>
                  {reportType === 'daily-activity' && (
                    <tr>
                      <th>Date</th>
                      <th>Site</th>
                      <th>Project</th>
                      <th>Progress %</th>
                      <th>Workforce</th>
                      <th>Weather</th>
                    </tr>
                  )}
                  {reportType === 'site-progress' && (
                    <tr>
                      <th>Site</th>
                      <th>Project</th>
                      <th>Total Reports</th>
                      <th>Current Progress %</th>
                      <th>Avg Progress %</th>
                      <th>Last Report</th>
                    </tr>
                  )}
                  {reportType === 'material-requests' && (
                    <tr>
                      <th>Date</th>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Site</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {reportType === 'material-consumption' && (
                    <tr>
                      <th>Material</th>
                      <th>Unit</th>
                      <th>Total Requested</th>
                      <th>Approved</th>
                      <th>Pending</th>
                      <th>Site</th>
                    </tr>
                  )}
                  {reportType === 'incident-safety' && (
                    <tr>
                      <th>Date</th>
                      <th>Site</th>
                      <th>Project</th>
                      <th>Issues Encountered</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {reportData && reportData.length > 0 ? (
                    reportData.map((item, index) => {
                      if (reportType === 'daily-activity') {
                        return (
                          <tr key={item.id || index}>
                            <td>{new Date(item.activity_date).toLocaleDateString()}</td>
                            <td>{item.site_name || 'N/A'}</td>
                            <td>{item.project_name || 'N/A'}</td>
                            <td>{item.progress_percentage || 0}%</td>
                            <td>{item.workforce_count || 0}</td>
                            <td>{item.weather_conditions || 'N/A'}</td>
                          </tr>
                        );
                      } else if (reportType === 'site-progress') {
                        return (
                          <tr key={item.site_id || index}>
                            <td>{item.site_name || 'N/A'}</td>
                            <td>{item.project_name || 'N/A'}</td>
                            <td>{item.total_reports || 0}</td>
                            <td>{item.current_progress || 0}%</td>
                            <td>{item.avg_progress ? parseFloat(item.avg_progress).toFixed(2) : 0}%</td>
                            <td>{item.last_report_date ? new Date(item.last_report_date).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                        );
                      } else if (reportType === 'material-requests') {
                        return (
                          <tr key={item.id || index}>
                            <td>{new Date(item.created_at).toLocaleDateString()}</td>
                            <td>{item.material_name || 'N/A'}</td>
                            <td>{item.quantity || 0}</td>
                            <td>{item.unit || 'N/A'}</td>
                            <td>{item.site_name || 'N/A'}</td>
                            <td>{item.status || 'N/A'}</td>
                          </tr>
                        );
                      } else if (reportType === 'material-consumption') {
                        return (
                          <tr key={index}>
                            <td>{item.material_name || 'N/A'}</td>
                            <td>{item.unit || 'N/A'}</td>
                            <td>{item.total_requested || 0}</td>
                            <td>{item.approved_quantity || 0}</td>
                            <td>{item.pending_quantity || 0}</td>
                            <td>{item.site_name || 'N/A'}</td>
                          </tr>
                        );
                      } else if (reportType === 'incident-safety') {
                        return (
                          <tr key={item.id || index}>
                            <td>{new Date(item.activity_date).toLocaleDateString()}</td>
                            <td>{item.site_name || 'N/A'}</td>
                            <td>{item.project_name || 'N/A'}</td>
                            <td>{item.issues_encountered || 'N/A'}</td>
                          </tr>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
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

export default SiteSupervisorDashboard;
