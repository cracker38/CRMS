import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Import jspdf-autotable as side effect - it extends jsPDF prototype
import 'jspdf-autotable';

const FinanceOfficerDashboard = ({ activeTab: propActiveTab, onTabChange }) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({
    pendingPayments: 0,
    approvedPayments: 0,
    totalExpenses: 0,
    totalBudget: 0,
    totalSpent: 0,
    pendingInvoices: 0
  });

  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    projectId: ''
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
    const pendingPayments = expenses.filter(e => e.payment_status === 'PENDING').length;
    const approvedPayments = expenses.filter(e => e.payment_status === 'APPROVED').length;
    const totalExpenses = expenses.length;
    const totalBudget = projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
    const totalSpent = expenses
      .filter(e => e.payment_status === 'PAID')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const pendingInvoices = expenses.filter(e => e.invoice_number && e.payment_status === 'PENDING').length;

    setStats({
      pendingPayments,
      approvedPayments,
      totalExpenses,
      totalBudget,
      totalSpent,
      pendingInvoices
    });
  }, [expenses, projects]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch expenses
      try {
        const expensesRes = await fetch('http://localhost:5000/api/expenses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (expensesRes.ok) {
          const expensesData = await expensesRes.json();
          setExpenses(expensesData);
        }
      } catch (e) {
        console.log('Error fetching expenses:', e);
      }

      // Fetch projects
      try {
        const projectsRes = await fetch('http://localhost:5000/api/projects', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }
      } catch (e) {
        console.log('Error fetching projects:', e);
      }

      // Fetch purchase orders
      try {
        const poRes = await fetch('http://localhost:5000/api/procurement/purchase-orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (poRes.ok) {
          const poData = await poRes.json();
          setPurchaseOrders(poData);
        }
      } catch (e) {
        console.log('Error fetching purchase orders:', e);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (expenseId, status) => {
    try {
      const response = await fetch(`http://localhost:5000/api/expenses/${expenseId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_status: status })
      });

      if (response.ok) {
        await fetchData();
        setShowPaymentModal(false);
        setSelectedExpense(null);
        alert(`Payment ${status.toLowerCase()} successfully`);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Error updating payment status');
    }
  };

  const handleMarkAsPaid = async (expenseId) => {
    await handleApprovePayment(expenseId, 'PAID');
  };

  const handleCreateInvoice = async (invoiceData) => {
    try {
      // Basic validation
      if (!invoiceData.project_id) {
        alert('Project is required');
        return;
      }
      if (!invoiceData.amount || Number.isNaN(Number(invoiceData.amount))) {
        alert('Valid amount is required');
        return;
      }
      if (!invoiceData.expense_date) {
        alert('Invoice date is required');
        return;
      }
      if (!invoiceData.invoice_number || !invoiceData.invoice_number.trim()) {
        alert('Invoice number is required');
        return;
      }

      const payload = {
        project_id: invoiceData.project_id,
        category: invoiceData.category || 'SUPPLIES',
        description: invoiceData.description || `Invoice ${invoiceData.invoice_number}`,
        amount: parseFloat(invoiceData.amount),
        expense_date: invoiceData.expense_date,
        invoice_number: invoiceData.invoice_number.trim()
      };

      const response = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data.message || 'Failed to create invoice/expense');
        return;
      }

      setShowInvoiceModal(false);
      await fetchData();
      alert('Invoice recorded successfully as an expense');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice: ' + (error.message || 'Network error'));
    }
  };

  const handleGenerateReport = async (reportType, filters = {}) => {
    try {
      let url = `http://localhost:5000/api/reports?type=${encodeURIComponent(reportType)}`;
      if (filters.startDate) url += `&startDate=${encodeURIComponent(filters.startDate)}`;
      if (filters.endDate) url += `&endDate=${encodeURIComponent(filters.endDate)}`;
      if (filters.projectId) url += `&projectId=${encodeURIComponent(filters.projectId)}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        let message = 'Failed to generate report';
        try {
          const error = await response.json();
          if (error && error.message) {
            message = error.message;
          }
        } catch (_) {
          try {
            const text = await response.text();
            console.error('Finance report error response:', text);
          } catch (e) {
            // ignore
          }
        }
        alert(message);
        return;
      }

      const data = await response.json();
      setReportData(data);
      setSelectedReportType(reportType);
      setShowReportModal(true);
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
      'payment-approval': 'Payment Approval Report',
      'expense-tracking': 'Expense Tracking Report',
      'financial-statement': 'Financial Statement Report',
      'project-financial-health': 'Project Financial Health Report',
      'receipt-invoice-validation': 'Receipt & Invoice Validation Report',
      'budget-adjustment': 'Budget Adjustment Report'
    };
    return titles[reportType] || 'Report';
  };

  const formatReportDataForPDF = (reportType, data) => {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return { headers: ['No Data'], rows: [['No records found']] };
    }

    // If backend returned an error/message object instead of an array
    if (!Array.isArray(data)) {
      if (data.message) {
        return { headers: ['Message'], rows: [[data.message]] };
      }
      return { headers: ['Data'], rows: [[JSON.stringify(data)]] };
    }

    switch (reportType) {
      case 'payment-approval':
        return {
          headers: ['Date', 'Project', 'Category', 'Amount', 'Invoice #', 'Status', 'Approved By'],
          rows: data.map(item => [
            new Date(item.expense_date || item.created_at).toLocaleDateString(),
            item.project_name || 'N/A',
            item.category || 'N/A',
            `$${parseFloat(item.amount || 0).toFixed(2)}`,
            item.invoice_number || 'N/A',
            item.payment_status || 'PENDING',
            item.approver_first_name && item.approver_last_name 
              ? `${item.approver_first_name} ${item.approver_last_name}` 
              : 'N/A'
          ])
        };
      case 'expense-tracking':
        return {
          headers: ['Date', 'Project', 'Category', 'Description', 'Amount', 'Status'],
          rows: data.map(item => [
            new Date(item.expense_date || item.created_at).toLocaleDateString(),
            item.project_name || 'N/A',
            item.category || 'N/A',
            (item.description || 'N/A').substring(0, 40) + '...',
            `$${parseFloat(item.amount || 0).toFixed(2)}`,
            item.payment_status || 'PENDING'
          ])
        };
      case 'financial-statement':
        return {
          headers: ['Project', 'Budget', 'Spent', 'Remaining', 'Percentage Used'],
          rows: data.map(item => [
            item.project_name || item.name || 'N/A',
            `$${parseFloat(item.budget || 0).toFixed(2)}`,
            `$${parseFloat(item.total_spent || item.actual_spent || 0).toFixed(2)}`,
            `$${parseFloat(item.remaining_budget || (item.budget - (item.total_spent || item.actual_spent || 0)) || 0).toFixed(2)}`,
            `${item.percentage_used || 0}%`
          ])
        };
      case 'project-financial-health':
        return {
          headers: ['Project', 'Budget', 'Spent', 'Approved Pending', 'Pending', 'Remaining', 'Status'],
          rows: data.map(item => [
            item.name || 'N/A',
            `$${parseFloat(item.budget || 0).toFixed(2)}`,
            `$${parseFloat(item.total_spent || 0).toFixed(2)}`,
            `$${parseFloat(item.approved_pending || 0).toFixed(2)}`,
            `$${parseFloat(item.pending || 0).toFixed(2)}`,
            `$${parseFloat(item.remaining_budget || 0).toFixed(2)}`,
            item.status || 'N/A'
          ])
        };
      case 'receipt-invoice-validation':
        return {
          headers: ['Date', 'Invoice #', 'Project', 'Amount', 'Status', 'Validated'],
          rows: data.map(item => [
            new Date(item.expense_date || item.created_at).toLocaleDateString(),
            item.invoice_number || 'N/A',
            item.project_name || 'N/A',
            `$${parseFloat(item.amount || 0).toFixed(2)}`,
            item.payment_status || 'PENDING',
            item.approved_by ? 'Yes' : 'No'
          ])
        };
      case 'budget-adjustment':
        return {
          headers: ['Project', 'Original Budget', 'Current Budget', 'Adjustment', 'Reason'],
          rows: data.map(item => [
            item.project_name || item.name || 'N/A',
            `$${parseFloat(item.original_budget || item.budget || 0).toFixed(2)}`,
            `$${parseFloat(item.current_budget || item.budget || 0).toFixed(2)}`,
            `$${parseFloat((item.current_budget || item.budget || 0) - (item.original_budget || item.budget || 0)).toFixed(2)}`,
            item.adjustment_reason || 'N/A'
          ])
        };
      default:
        return { headers: ['Data'], rows: data.map(item => [JSON.stringify(item)]) };
    }
  };

  const formatReportDataForExcel = (reportType, data) => {
    return formatReportDataForPDF(reportType, data);
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">
                <i className="fas fa-dollar-sign mr-2"></i>
                Finance Officer Dashboard
                <small className="text-muted ml-2">- CRMS</small>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {loading && (
            <div className="overlay-wrapper">
              <div className="overlay">
                <i className="fas fa-3x fa-sync-alt fa-spin"></i>
                <div className="text-bold pt-2">Loading...</div>
              </div>
            </div>
          )}
          {activeTab === 'overview' && (
            <div>
              <div className="row">
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-warning">
                    <div className="inner">
                      <h3>{stats.pendingPayments}</h3>
                      <p>Pending Payments</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-clock"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-success">
                    <div className="inner">
                      <h3>{stats.approvedPayments}</h3>
                      <p>Approved Payments</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-info">
                    <div className="inner">
                      <h3>${stats.totalSpent.toLocaleString()}</h3>
                      <p>Total Spent</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-dollar-sign"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-danger">
                    <div className="inner">
                      <h3>{stats.pendingInvoices}</h3>
                      <p>Pending Invoices</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-file-invoice"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Recent Payment Requests</h3>
                      <div className="card-tools">
                        <button className="btn btn-primary btn-sm" onClick={fetchData}>
                          <i className="fas fa-sync"></i> Refresh
                        </button>
                      </div>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Project</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Invoice #</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.slice(0, 10).map(expense => (
                            <tr key={expense.id}>
                              <td>{new Date(expense.expense_date || expense.created_at).toLocaleDateString()}</td>
                              <td>{expense.project_name || 'N/A'}</td>
                              <td>{expense.category || 'N/A'}</td>
                              <td>${parseFloat(expense.amount || 0).toFixed(2)}</td>
                              <td>{expense.invoice_number || 'N/A'}</td>
                              <td>
                                <span className={`badge badge-${expense.payment_status === 'PAID' ? 'success' : expense.payment_status === 'APPROVED' ? 'info' : expense.payment_status === 'REJECTED' ? 'danger' : 'warning'}`}>
                                  {expense.payment_status || 'PENDING'}
                                </span>
                              </td>
                              <td>
                                {expense.payment_status === 'PENDING' && (
                                  <button 
                                    className="btn btn-sm btn-success mr-1"
                                    onClick={() => {
                                      setSelectedExpense(expense);
                                      setShowPaymentModal(true);
                                    }}
                                  >
                                    <i className="fas fa-check"></i> Review
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {expenses.length === 0 && (
                            <tr>
                              <td colSpan="7" className="text-center">No expenses found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Budget Overview</h3>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-12">
                          <p><strong>Total Budget:</strong> ${stats.totalBudget.toLocaleString()}</p>
                          <p><strong>Total Spent:</strong> ${stats.totalSpent.toLocaleString()}</p>
                          <p><strong>Remaining:</strong> ${(stats.totalBudget - stats.totalSpent).toLocaleString()}</p>
                          <div className="progress mb-3">
                            <div 
                              className="progress-bar bg-success" 
                              role="progressbar" 
                              style={{ width: `${stats.totalBudget > 0 ? (stats.totalSpent / stats.totalBudget * 100) : 0}%` }}
                            >
                              {stats.totalBudget > 0 ? ((stats.totalSpent / stats.totalBudget * 100).toFixed(1)) : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Payment Status Summary</h3>
                    </div>
                    <div className="card-body">
                      <p><strong>Pending:</strong> {stats.pendingPayments}</p>
                      <p><strong>Approved:</strong> {stats.approvedPayments}</p>
                      <p><strong>Paid:</strong> {expenses.filter(e => e.payment_status === 'PAID').length}</p>
                      <p><strong>Rejected:</strong> {expenses.filter(e => e.payment_status === 'REJECTED').length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Payment Management</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={fetchData}>
                    <i className="fas fa-sync"></i> Refresh
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-4">
                    <select className="form-control" onChange={(e) => {
                      const status = e.target.value;
                      // Filter logic can be added here
                    }}>
                      <option value="">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PAID">Paid</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Invoice #</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(expense => (
                      <tr key={expense.id}>
                        <td>{new Date(expense.expense_date || expense.created_at).toLocaleDateString()}</td>
                        <td>{expense.project_name || 'N/A'}</td>
                        <td>{expense.category || 'N/A'}</td>
                        <td>{(expense.description || 'N/A').substring(0, 50)}</td>
                        <td>${parseFloat(expense.amount || 0).toFixed(2)}</td>
                        <td>{expense.invoice_number || 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${expense.payment_status === 'PAID' ? 'success' : expense.payment_status === 'APPROVED' ? 'info' : expense.payment_status === 'REJECTED' ? 'danger' : 'warning'}`}>
                            {expense.payment_status || 'PENDING'}
                          </span>
                        </td>
                        <td>
                          {expense.payment_status === 'PENDING' && (
                            <button 
                              className="btn btn-sm btn-success mr-1"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowPaymentModal(true);
                              }}
                            >
                              <i className="fas fa-check"></i> Review
                            </button>
                          )}
                          {expense.payment_status === 'APPROVED' && (
                            <button 
                              className="btn btn-sm btn-primary mr-1"
                              onClick={() => handleMarkAsPaid(expense.id)}
                            >
                              <i className="fas fa-dollar-sign"></i> Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center">No expenses found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Invoice & Receipt Management</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowInvoiceModal(true)}>
                    <i className="fas fa-plus"></i> Add Invoice
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Validated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(e => e.invoice_number).map(expense => (
                      <tr key={expense.id}>
                        <td>{expense.invoice_number}</td>
                        <td>{new Date(expense.expense_date || expense.created_at).toLocaleDateString()}</td>
                        <td>{expense.project_name || 'N/A'}</td>
                        <td>${parseFloat(expense.amount || 0).toFixed(2)}</td>
                        <td>
                          <span className={`badge badge-${expense.payment_status === 'PAID' ? 'success' : expense.payment_status === 'APPROVED' ? 'info' : expense.payment_status === 'REJECTED' ? 'danger' : 'warning'}`}>
                            {expense.payment_status || 'PENDING'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${expense.approved_by ? 'success' : 'warning'}`}>
                            {expense.approved_by ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-info"
                            onClick={() => {
                              setSelectedExpense(expense);
                              setShowPaymentModal(true);
                            }}
                          >
                            <i className="fas fa-eye"></i> View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenses.filter(e => e.invoice_number).length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">No invoices found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'budgets' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Project Budget Monitoring</h3>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Remaining</th>
                      <th>% Used</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(project => {
                      const projectExpenses = expenses.filter(e => e.project_id === project.id);
                      const spent = projectExpenses
                        .filter(e => e.payment_status === 'PAID')
                        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                      const remaining = (parseFloat(project.budget) || 0) - spent;
                      const percentageUsed = (parseFloat(project.budget) || 0) > 0 
                        ? (spent / (parseFloat(project.budget) || 1) * 100) 
                        : 0;
                      
                      return (
                        <tr key={project.id}>
                          <td>{project.name}</td>
                          <td>${parseFloat(project.budget || 0).toFixed(2)}</td>
                          <td>${spent.toFixed(2)}</td>
                          <td>${remaining.toFixed(2)}</td>
                          <td>
                            <div className="progress" style={{ height: '20px' }}>
                              <div 
                                className={`progress-bar ${percentageUsed > 90 ? 'bg-danger' : percentageUsed > 75 ? 'bg-warning' : 'bg-success'}`}
                                role="progressbar" 
                                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                              >
                                {percentageUsed.toFixed(1)}%
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${percentageUsed > 90 ? 'danger' : percentageUsed > 75 ? 'warning' : 'success'}`}>
                              {percentageUsed > 90 ? 'Over Budget' : percentageUsed > 75 ? 'Warning' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center">No projects found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <>
              <div className="row mb-3">
                <div className="col-md-12">
                  <div className="card card-secondary card-outline">
                    <div className="card-header">
                      <h3 className="card-title">
                        <i className="fas fa-filter mr-2"></i>
                        Report Filters
                      </h3>
                    </div>
                    <div className="card-body">
                      <div className="form-row">
                        <div className="form-group col-md-3 col-12">
                          <label>Start Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={reportFilters.startDate}
                            onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                          />
                        </div>
                        <div className="form-group col-md-3 col-12">
                          <label>End Date</label>
                          <input
                            type="date"
                            className="form-control"
                            value={reportFilters.endDate}
                            onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                          />
                        </div>
                        <div className="form-group col-md-4 col-12">
                          <label>Project (optional)</label>
                          <select
                            className="form-control"
                            value={reportFilters.projectId}
                            onChange={(e) => setReportFilters({ ...reportFilters, projectId: e.target.value })}
                          >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group col-md-2 col-12 d-flex align-items-end">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-block"
                            onClick={() => setReportFilters({ startDate: '', endDate: '', projectId: '' })}
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4">
                <div className="card card-primary card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Payment Approval Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Generate a report of all payment approvals and rejections.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleGenerateReport('payment-approval', reportFilters)}
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-success card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Expense Tracking Report</h3>
                  </div>
                  <div className="card-body">
                    <p>View detailed expense tracking with categories and status.</p>
                    <button
                      className="btn btn-success"
                      onClick={() => handleGenerateReport('expense-tracking', reportFilters)}
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-info card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Financial Statement Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Generate comprehensive financial statements for projects.</p>
                    <button
                      className="btn btn-info"
                      onClick={() => handleGenerateReport('financial-statement', reportFilters)}
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-warning card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Project Financial Health Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Analyze financial health and budget status of all projects.</p>
                    <button
                      className="btn btn-warning"
                      onClick={() => handleGenerateReport('project-financial-health', reportFilters)}
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-danger card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Receipt & Invoice Validation Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Review all receipts and invoices with validation status.</p>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleGenerateReport('receipt-invoice-validation', reportFilters)}
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-secondary card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Budget Adjustment Report</h3>
                  </div>
                  <div className="card-body">
                    <p>View all budget adjustments and modifications.</p>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleGenerateReport('budget-adjustment', reportFilters)}
                    >
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </section>

      {/* Payment Approval Modal */}
      {showPaymentModal && selectedExpense && (
        <PaymentModal
          expense={selectedExpense}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedExpense(null);
          }}
          onApprove={(status) => handleApprovePayment(selectedExpense.id, status)}
        />
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          projects={projects}
          onClose={() => setShowInvoiceModal(false)}
          onSave={handleCreateInvoice}
        />
      )}

      {/* Report Modal */}
      {showReportModal && reportData && (
        <ReportModal
          reportType={selectedReportType}
          reportData={reportData}
          projects={projects}
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

// Payment Approval Modal Component
const PaymentModal = ({ expense, onClose, onApprove }) => {
  const [status, setStatus] = useState('APPROVED');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onApprove(status);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Review Payment Request</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Project:</strong> {expense.project_name || 'N/A'}</p>
                  <p><strong>Category:</strong> {expense.category || 'N/A'}</p>
                  <p><strong>Amount:</strong> ${parseFloat(expense.amount || 0).toFixed(2)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Date:</strong> {new Date(expense.expense_date || expense.created_at).toLocaleDateString()}</p>
                  <p><strong>Invoice #:</strong> {expense.invoice_number || 'N/A'}</p>
                  <p><strong>Status:</strong> {expense.payment_status || 'PENDING'}</p>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <p className="form-control-plaintext">{expense.description || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Payment Status *</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="APPROVED">Approve</option>
                  <option value="REJECTED">Reject</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes or comments..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className={`btn ${status === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}>
                {status === 'APPROVED' ? 'Approve' : 'Reject'} Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Invoice Creation Modal Component
const InvoiceModal = ({ projects, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    project_id: '',
    invoice_number: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: 'SUPPLIES',
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Add Invoice / Expense</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div
              className="modal-body"
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
            >
              <div className="alert alert-info">
                <i className="fas fa-info-circle mr-2"></i>
                This will create a new expense linked to a project with the provided invoice number.
              </div>

              <div className="form-group">
                <label>Project *</label>
                <select
                  className="form-control"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group col-md-4">
                  <label>Invoice # *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="INV-001"
                    required
                  />
                </div>
                <div className="form-group col-md-4">
                  <label>Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="form-group col-md-4">
                  <label>Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="SUPPLIES">Supplies</option>
                  <option value="MATERIALS">Materials</option>
                  <option value="SERVICES">Services</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description of this invoice/expense"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-save mr-1"></i>
                Save Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
// Report Modal Component
const ReportModal = ({ reportType, reportData, projects, onClose, onExportPDF, onExportExcel }) => {
  const getReportTitle = (type) => {
    const titles = {
      'payment-approval': 'Payment Approval Report',
      'expense-tracking': 'Expense Tracking Report',
      'financial-statement': 'Financial Statement Report',
      'project-financial-health': 'Project Financial Health Report',
      'receipt-invoice-validation': 'Receipt & Invoice Validation Report',
      'budget-adjustment': 'Budget Adjustment Report'
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
                  {reportType === 'payment-approval' && (
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Invoice #</th>
                      <th>Status</th>
                      <th>Approved By</th>
                    </tr>
                  )}
                  {reportType === 'expense-tracking' && (
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {reportType === 'financial-statement' && (
                    <tr>
                      <th>Project</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Remaining</th>
                      <th>Percentage Used</th>
                    </tr>
                  )}
                  {reportType === 'project-financial-health' && (
                    <tr>
                      <th>Project</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Approved Pending</th>
                      <th>Pending</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {reportType === 'receipt-invoice-validation' && (
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Project</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Validated</th>
                    </tr>
                  )}
                  {reportType === 'budget-adjustment' && (
                    <tr>
                      <th>Project</th>
                      <th>Original Budget</th>
                      <th>Current Budget</th>
                      <th>Adjustment</th>
                      <th>Reason</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {reportData && reportData.length > 0 ? (
                    reportData.map((item, index) => {
                      if (reportType === 'payment-approval') {
                        return (
                          <tr key={item.id || index}>
                            <td>{new Date(item.expense_date || item.created_at).toLocaleDateString()}</td>
                            <td>{item.project_name || 'N/A'}</td>
                            <td>{item.category || 'N/A'}</td>
                            <td>${parseFloat(item.amount || 0).toFixed(2)}</td>
                            <td>{item.invoice_number || 'N/A'}</td>
                            <td>{item.payment_status || 'PENDING'}</td>
                            <td>{item.approver_first_name && item.approver_last_name ? `${item.approver_first_name} ${item.approver_last_name}` : 'N/A'}</td>
                          </tr>
                        );
                      } else if (reportType === 'expense-tracking') {
                        return (
                          <tr key={item.id || index}>
                            <td>{new Date(item.expense_date || item.created_at).toLocaleDateString()}</td>
                            <td>{item.project_name || 'N/A'}</td>
                            <td>{item.category || 'N/A'}</td>
                            <td>{(item.description || 'N/A').substring(0, 50)}</td>
                            <td>${parseFloat(item.amount || 0).toFixed(2)}</td>
                            <td>{item.payment_status || 'PENDING'}</td>
                          </tr>
                        );
                      } else if (reportType === 'financial-statement') {
                        return (
                          <tr key={item.id || index}>
                            <td>{item.project_name || item.name || 'N/A'}</td>
                            <td>${parseFloat(item.budget || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.total_spent || item.actual_spent || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.remaining_budget || (item.budget - (item.total_spent || item.actual_spent || 0)) || 0).toFixed(2)}</td>
                            <td>{item.percentage_used || 0}%</td>
                          </tr>
                        );
                      } else if (reportType === 'project-financial-health') {
                        return (
                          <tr key={item.id || index}>
                            <td>{item.name || 'N/A'}</td>
                            <td>${parseFloat(item.budget || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.total_spent || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.approved_pending || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.pending || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.remaining_budget || 0).toFixed(2)}</td>
                            <td>{item.status || 'N/A'}</td>
                          </tr>
                        );
                      } else if (reportType === 'receipt-invoice-validation') {
                        return (
                          <tr key={item.id || index}>
                            <td>{new Date(item.expense_date || item.created_at).toLocaleDateString()}</td>
                            <td>{item.invoice_number || 'N/A'}</td>
                            <td>{item.project_name || 'N/A'}</td>
                            <td>${parseFloat(item.amount || 0).toFixed(2)}</td>
                            <td>{item.payment_status || 'PENDING'}</td>
                            <td>{item.approved_by ? 'Yes' : 'No'}</td>
                          </tr>
                        );
                      } else if (reportType === 'budget-adjustment') {
                        return (
                          <tr key={item.id || index}>
                            <td>{item.project_name || item.name || 'N/A'}</td>
                            <td>${parseFloat(item.original_budget || item.budget || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.current_budget || item.budget || 0).toFixed(2)}</td>
                            <td>${parseFloat((item.current_budget || item.budget || 0) - (item.original_budget || item.budget || 0)).toFixed(2)}</td>
                            <td>{item.adjustment_reason || 'N/A'}</td>
                          </tr>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">No data available</td>
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

export default FinanceOfficerDashboard;

