import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Import jspdf-autotable as side effect - it extends jsPDF prototype
import 'jspdf-autotable';

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

const ProcurementOfficerDashboard = ({ activeTab: propActiveTab, onTabChange, onRefreshNotifications }) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({
    totalPOs: 0,
    pendingPOs: 0,
    deliveredPOs: 0,
    totalSuppliers: 0,
    totalQuotations: 0,
    totalValue: 0
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
    const poList = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    const totalPOs = poList.length;
    const pendingPOs = poList.filter(po => {
      const s = (po.status || 'PENDING').toString().toUpperCase();
      return s !== 'DELIVERED' && s !== 'CANCELLED';
    }).length;
    const deliveredPOs = poList.filter(po => (po.status || '').toString().toUpperCase() === 'DELIVERED').length;
    const totalSuppliers = (suppliers || []).length;
    const totalQuotations = (quotations || []).length;
    const totalValue = poList.reduce((sum, po) => sum + (parseFloat(po.total_amount) || 0), 0);

    setStats({
      totalPOs,
      pendingPOs,
      deliveredPOs,
      totalSuppliers,
      totalQuotations,
      totalValue
    });
  }, [purchaseOrders, suppliers, quotations]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch purchase orders
      try {
        const poRes = await fetch('http://localhost:5000/api/procurement/purchase-orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (poRes.ok) {
          const poData = await poRes.json();
          setPurchaseOrders(Array.isArray(poData) ? poData : []);
        }
      } catch (e) {
        console.log('Error fetching purchase orders:', e);
      }

      // Fetch suppliers
      try {
        const suppliersRes = await fetch('http://localhost:5000/api/procurement/suppliers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData);
        }
      } catch (e) {
        console.log('Error fetching suppliers:', e);
      }

      // Fetch materials
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

      // Fetch quotations (if endpoint exists)
      try {
        const quotationsRes = await fetch('http://localhost:5000/api/procurement/quotations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (quotationsRes.ok) {
          const quotationsData = await quotationsRes.json();
          setQuotations(quotationsData);
        }
      } catch (e) {
        // Quotations endpoint may not exist yet
        console.log('Quotations endpoint not available');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = async (formData) => {
    try {
      const response = await fetch('http://localhost:5000/api/procurement/purchase-orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

        if (response.ok) {
        await fetchData();
        setShowPOModal(false);
        onRefreshNotifications?.();
        alert('Purchase order created successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create purchase order');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Error creating purchase order');
    }
  };

  const handleCreateQuotation = async (formData) => {
    try {
      const response = await fetch('http://localhost:5000/api/procurement/quotations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

        if (response.ok) {
        await fetchData();
        setShowQuotationModal(false);
        alert('Quotation recorded successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to record quotation');
      }
    } catch (error) {
      console.error('Error recording quotation:', error);
      alert('Error recording quotation');
    }
  };

  const handleCreateSupplier = async (formData) => {
    try {
        const response = await fetch('http://localhost:5000/api/procurement/suppliers', {
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
        setShowSupplierModal(false);
        alert('Supplier created successfully');
      } else {
        const errorMessage = data.message || data.error || 'Failed to create supplier';
        console.error('Supplier creation error:', data);
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      alert(`Error creating supplier: ${error.message || 'Network error'}`);
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

  const handleUpdateDelivery = async (poId, deliveryData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/procurement/purchase-orders/${poId}/delivery`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deliveryData)
      });

      if (response.ok) {
        await fetchData();
        setShowDeliveryModal(false);
        setSelectedPO(null);
        onRefreshNotifications?.();
        alert('Delivery updated successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update delivery');
      }
    } catch (error) {
      console.error('Error updating delivery:', error);
      alert('Error updating delivery');
    }
  };

  const handleGenerateReport = async (reportType, filters) => {
    try {
      let url = `http://localhost:5000/api/reports?type=${reportType}`;
      if (filters.startDate) url += `&startDate=${filters.startDate}`;
      if (filters.endDate) url += `&endDate=${filters.endDate}`;
      if (filters.supplierId) url += `&supplierId=${filters.supplierId}`;

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

  const exportToPDF = async () => {
    if (!reportData || !selectedReportType) return;

    let logoDataUrl = null;
    try {
      logoDataUrl = await loadLogoDataUrl();
    } catch (e) {
      console.warn('Logo load failed', e);
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      // Header with logo and company branding
      doc.setFillColor(66, 139, 202);
      doc.rect(0, 0, pageWidth, 44, 'F');
      const logoW = 38;
      const logoH = 38;
      const logoX = margin;
      const logoY = 3;
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
      doc.setFont('helvetica', 'bold');
      doc.text(PDF_COMPANY.name, logoX + logoW + 8, logoY + 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${PDF_COMPANY.tel} | ${PDF_COMPANY.email}`, logoX + logoW + 8, logoY + 22);
      doc.setTextColor(0, 0, 0);
      yPos = 54;

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
      'po-report': 'Purchase Order Report',
      'supplier-performance': 'Supplier Performance Report',
      'procurement-cost': 'Procurement Cost Report',
      'inventory-delivery': 'Inventory Delivery Report',
      'quotation-comparison': 'Quotation Comparison Report'
    };
    return titles[reportType] || 'Report';
  };

  const formatReportDataForPDF = (reportType, data) => {
    if (!data || data.length === 0) {
      return { headers: ['No Data'], rows: [['No records found']] };
    }

    switch (reportType) {
      case 'po-report':
        return {
          headers: ['PO Number', 'Supplier', 'Order Date', 'Expected Delivery', 'Total Amount', 'Status'],
          rows: data.map(item => [
            item.po_number || 'N/A',
            item.supplier_name || 'N/A',
            new Date(item.order_date).toLocaleDateString(),
            item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString() : 'N/A',
            `$${parseFloat(item.total_amount || 0).toFixed(2)}`,
            item.status || 'N/A'
          ])
        };
      case 'supplier-performance':
        return {
          headers: ['Supplier', 'Total POs', 'Total Value', 'On-Time Delivery', 'Avg Rating', 'Status'],
          rows: data.map(item => [
            item.supplier_name || item.name || 'N/A',
            item.total_pos || 0,
            `$${parseFloat(item.total_value || 0).toFixed(2)}`,
            `${item.on_time_delivery || 0}%`,
            item.avg_rating || 'N/A',
            item.status || 'N/A'
          ])
        };
      case 'procurement-cost':
        return {
          headers: ['Period', 'Total POs', 'Total Cost', 'Avg PO Value', 'Category'],
          rows: data.map(item => [
            item.period || 'N/A',
            item.total_pos || 0,
            `$${parseFloat(item.total_cost || 0).toFixed(2)}`,
            `$${parseFloat(item.avg_po_value || 0).toFixed(2)}`,
            item.category || 'N/A'
          ])
        };
      case 'inventory-delivery':
        return {
          headers: ['PO Number', 'Material', 'Quantity', 'Delivered', 'Delivery Date', 'Status'],
          rows: data.map(item => [
            item.po_number || 'N/A',
            item.material_name || 'N/A',
            item.quantity || 0,
            item.delivered_quantity || 0,
            item.delivery_date ? new Date(item.delivery_date).toLocaleDateString() : 'N/A',
            item.status || 'N/A'
          ])
        };
      case 'quotation-comparison':
        return {
          headers: ['Material', 'Supplier', 'Quantity', 'Unit Price', 'Total', 'Status'],
          rows: data.map(item => [
            item.material_name || 'N/A',
            item.supplier_name || 'N/A',
            item.quantity || 0,
            `$${parseFloat(item.unit_price || 0).toFixed(2)}`,
            `$${parseFloat(item.total || 0).toFixed(2)}`,
            item.status || 'N/A'
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
                <i className="fas fa-shopping-cart mr-2"></i>
                Procurement Officer Dashboard
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
                      <h3>{stats.totalPOs}</h3>
                      <p>Total Purchase Orders</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-warning">
                    <div className="inner">
                      <h3>{stats.pendingPOs}</h3>
                      <p>Pending Orders</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-clock"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-success">
                    <div className="inner">
                      <h3>{stats.deliveredPOs}</h3>
                      <p>Delivered Orders</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-primary">
                    <div className="inner">
                      <h3>${stats.totalValue.toLocaleString()}</h3>
                      <p>Total Procurement Value</p>
                    </div>
                    <div className="icon">
                      <i className="fas fa-dollar-sign"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Recent Purchase Orders</h3>
                      <div className="card-tools">
                        <button className="btn btn-primary btn-sm" onClick={() => setShowPOModal(true)}>
                          <i className="fas fa-plus"></i> Create PO
        </button>
                      </div>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>PO Number</th>
                            <th>Supplier</th>
                            <th>Order Date</th>
                            <th>Expected Delivery</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseOrders.slice(0, 10).map(po => {
                            const status = (po.status || 'PENDING').toString().toUpperCase();
                            const canUpdateDelivery = status === 'APPROVED';
                            const statusClass =
                              status === 'DELIVERED' ? 'success'
                              : status === 'APPROVED' ? 'primary'
                              : status === 'PENDING' ? 'warning'
                              : status === 'CANCELLED' ? 'danger'
                              : status === 'REJECTED' ? 'danger'
                              : status === 'DRAFT' ? 'secondary'
                              : 'info';

                            return (
                              <tr key={po.id}>
                                <td>{po.po_number}</td>
                                <td>{po.supplier_name || 'N/A'}</td>
                                <td>{new Date(po.order_date).toLocaleDateString()}</td>
                                <td>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
                                <td>${parseFloat(po.total_amount || 0).toFixed(2)}</td>
                                <td>
                                  <span className={`badge badge-${statusClass}`}>
                                    {status}
                                  </span>
                                </td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-info mr-1"
                                    disabled={!canUpdateDelivery}
                                    title={
                                      canUpdateDelivery
                                        ? 'Update delivery status'
                                        : 'Delivery can only be updated after Finance approves this PO'
                                    }
                                    onClick={() => {
                                      if (!canUpdateDelivery) return;
                                      setSelectedPO(po);
                                      setShowDeliveryModal(true);
                                    }}
                                  >
                                    <i className="fas fa-truck"></i> Update Delivery
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {purchaseOrders.length === 0 && (
                            <tr>
                              <td colSpan="7" className="text-center">No purchase orders found</td>
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
                      <h3 className="card-title">Supplier Summary</h3>
              </div>
                    <div className="card-body">
                      <p><strong>Total Suppliers:</strong> {stats.totalSuppliers}</p>
                      <p><strong>Active Suppliers:</strong> {suppliers.filter(s => s.status === 'ACTIVE').length}</p>
                      <p><strong>Total Quotations:</strong> {stats.totalQuotations}</p>
              </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Procurement Status</h3>
                    </div>
                    <div className="card-body">
                      <p><strong>Pending:</strong> {stats.pendingPOs}</p>
                      <p><strong>Delivered:</strong> {stats.deliveredPOs}</p>
                      <p><strong>Total Value:</strong> ${stats.totalValue.toLocaleString()}</p>
              </div>
              </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'purchase-orders' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Purchase Orders</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowPOModal(true)}>
                    <i className="fas fa-plus"></i> Create Purchase Order
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                      <th>Order Date</th>
                      <th>Expected Delivery</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => {
                  const status = (po.status || 'PENDING').toString().toUpperCase();
                  const canUpdateDelivery = status === 'APPROVED';
                  const statusClass =
                    status === 'DELIVERED' ? 'success'
                    : status === 'APPROVED' ? 'primary'
                    : status === 'PENDING' ? 'warning'
                    : status === 'CANCELLED' ? 'danger'
                    : status === 'REJECTED' ? 'danger'
                    : status === 'DRAFT' ? 'secondary'
                    : 'info';

                  return (
                    <tr key={po.id}>
                      <td>{po.po_number}</td>
                      <td>{po.supplier_name || 'N/A'}</td>
                      <td>{new Date(po.order_date).toLocaleDateString()}</td>
                      <td>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
                      <td>${parseFloat(po.total_amount || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge badge-${statusClass}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info mr-1"
                          disabled={!canUpdateDelivery}
                          title={
                            canUpdateDelivery
                              ? 'Update delivery status'
                              : 'Delivery can only be updated after Finance approves this PO'
                          }
                          onClick={() => {
                            if (!canUpdateDelivery) return;
                            setSelectedPO(po);
                            setShowDeliveryModal(true);
                          }}
                        >
                          <i className="fas fa-truck"></i> Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
                    {purchaseOrders.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">No purchase orders found</td>
                      </tr>
                    )}
              </tbody>
            </table>
              </div>
            </div>
          )}

          {activeTab === 'quotations' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Supplier Quotations</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowQuotationModal(true)}>
                    <i className="fas fa-plus"></i> Record Quotation
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map(quote => (
                      <tr key={quote.id}>
                        <td>{new Date(quote.quotation_date || quote.created_at).toLocaleDateString()}</td>
                        <td>{quote.supplier_name || 'N/A'}</td>
                        <td>{quote.material_name || 'N/A'}</td>
                        <td>{quote.quantity || 0}</td>
                        <td>${parseFloat(quote.unit_price || 0).toFixed(2)}</td>
                        <td>${parseFloat(quote.total || (quote.quantity * quote.unit_price) || 0).toFixed(2)}</td>
                        <td>
                          <span className={`badge badge-${quote.status === 'ACCEPTED' ? 'success' : quote.status === 'REJECTED' ? 'danger' : 'warning'}`}>
                            {quote.status || 'PENDING'}
                          </span>
                    </td>
                  </tr>
                ))}
                    {quotations.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">No quotations found</td>
                      </tr>
                    )}
              </tbody>
            </table>
              </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Suppliers</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowSupplierModal(true)}>
                    <i className="fas fa-plus mr-1"></i> Add Supplier
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                      <th>Contact Email</th>
                      <th>Contact Phone</th>
                      <th>Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                        <td>{supplier.contact_email || 'N/A'}</td>
                        <td>{supplier.contact_phone || 'N/A'}</td>
                        <td>{supplier.address || 'N/A'}</td>
                    <td>
                          <span className={`badge badge-${supplier.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                            {supplier.status || 'N/A'}
                          </span>
                    </td>
                  </tr>
                ))}
                    {suppliers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center">No suppliers found</td>
                      </tr>
                    )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {activeTab === 'materials' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Materials</h3>
                <div className="card-tools">
                  <button className="btn btn-primary btn-sm" onClick={() => setShowMaterialModal(true)}>
                    <i className="fas fa-plus mr-1"></i> Add Material
                  </button>
                </div>
              </div>
              <div className="card-body">
                <table className="table table-bordered table-striped">
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
                {materials.map(material => (
                  <tr key={material.id}>
                    <td>{material.name}</td>
                    <td>{material.category || 'N/A'}</td>
                    <td>{material.unit || 'N/A'}</td>
                    <td>{parseFloat(material.current_stock || 0).toFixed(2)}</td>
                    <td>{parseFloat(material.min_stock_level || 0).toFixed(2)}</td>
                    <td>{material.unit_price ? `$${parseFloat(material.unit_price).toFixed(2)}` : 'N/A'}</td>
                  </tr>
                ))}
                    {materials.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center">No materials found</td>
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
                    <h3 className="card-title">Purchase Order Report</h3>
              </div>
                  <div className="card-body">
                    <p>Generate a comprehensive report of all purchase orders with details.</p>
                    <button className="btn btn-primary" onClick={() => handleGenerateReport('po-report', {})}>
                      Generate Report
                    </button>
              </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-success card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Supplier Performance Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Analyze supplier performance metrics and delivery statistics.</p>
                    <button className="btn btn-success" onClick={() => handleGenerateReport('supplier-performance', {})}>
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-info card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Procurement Cost Report</h3>
                  </div>
                  <div className="card-body">
                    <p>View procurement costs and spending analysis by period.</p>
                    <button className="btn btn-info" onClick={() => handleGenerateReport('procurement-cost', {})}>
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-warning card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Inventory Delivery Report</h3>
                  </div>
                  <div className="card-body">
                    <p>Track inventory deliveries and material receipt status.</p>
                    <button className="btn btn-warning" onClick={() => handleGenerateReport('inventory-delivery', {})}>
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-danger card-outline">
                  <div className="card-header">
                    <h3 className="card-title">Quotation Comparison Report</h3>
              </div>
                  <div className="card-body">
                    <p>Compare supplier quotations for materials and pricing.</p>
                    <button className="btn btn-danger" onClick={() => handleGenerateReport('quotation-comparison', {})}>
                      Generate Report
                    </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </section>

      {/* Purchase Order Modal */}
      {showPOModal && (
        <POModal
          suppliers={suppliers}
          materials={materials}
          onClose={() => setShowPOModal(false)}
          onSubmit={handleCreatePO}
        />
      )}

      {/* Quotation Modal */}
      {showQuotationModal && (
        <QuotationModal
          suppliers={suppliers}
          materials={materials}
          onClose={() => setShowQuotationModal(false)}
          onSubmit={handleCreateQuotation}
        />
      )}

      {/* Delivery Update Modal */}
      {showDeliveryModal && selectedPO && (
        <DeliveryModal
          po={selectedPO}
          onClose={() => {
            setShowDeliveryModal(false);
            setSelectedPO(null);
          }}
          onSubmit={(deliveryData) => handleUpdateDelivery(selectedPO.id, deliveryData)}
        />
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <SupplierModal
          onClose={() => setShowSupplierModal(false)}
          onSubmit={handleCreateSupplier}
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
  );
};

// Purchase Order Modal Component
const POModal = ({ suppliers, materials, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
    items: [{ material_id: '', quantity: '', unit_price: '' }]
  });

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { material_id: '', quantity: '', unit_price: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.supplier_id || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }
    
    const validItems = formData.items.filter(item => item.material_id && item.quantity && item.unit_price);
    if (validItems.length === 0) {
      alert('Please add at least one valid item');
      return;
    }

    onSubmit({
      ...formData,
      items: validItems.map(item => ({
        material_id: parseInt(item.material_id),
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price)
      }))
    });
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Create Purchase Order</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
              </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Supplier *</label>
                    <select
                      className="form-control"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
              </div>
            </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Order Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                      required
                    />
          </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Expected Delivery Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Items *</label>
                {formData.items.map((item, index) => (
                  <div key={index} className="row mb-2">
                    <div className="col-md-4">
                      <select
                        className="form-control"
                        value={item.material_id}
                        onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                        required
                      >
                        <option value="">Select Material</option>
                        {materials.map(material => (
                          <option key={material.id} value={material.id}>{material.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Unit Price"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        required
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="col-md-2">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddItem}>
                  <i className="fas fa-plus"></i> Add Item
                </button>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Purchase Order</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Quotation Modal Component
const QuotationModal = ({ suppliers, materials, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    supplier_id: '',
    material_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    quantity: '',
    unit_price: '',
    validity_period: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.supplier_id || !formData.material_id || !formData.quantity || !formData.unit_price) {
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
            <h4 className="modal-title">Record Supplier Quotation</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Supplier *</label>
                    <select
                      className="form-control"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
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
                    <label>Quotation Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.quotation_date}
                      onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Validity Period (Days)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.validity_period}
                      onChange={(e) => setFormData({ ...formData, validity_period: e.target.value })}
                      min="1"
                    />
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
                    <label>Unit Price *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                      min="0.01"
                      step="0.01"
                    />
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
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Record Quotation</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Delivery Update Modal Component
const DeliveryModal = ({ po, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    status: 'DELIVERED',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Update Delivery Status</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>PO Number</label>
                <p className="form-control-plaintext">{po.po_number}</p>
              </div>
              <div className="form-group">
                <label>Supplier</label>
                <p className="form-control-plaintext">{po.supplier_name || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Delivery Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="DELIVERED">Delivered</option>
                  <option value="PARTIAL">Partial Delivery</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Delivery notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Update Delivery</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Supplier Modal Component
const SupplierModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    status: 'ACTIVE'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Supplier name is required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Add New Supplier</h4>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Supplier Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter supplier name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="supplier@example.com"
                />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Supplier address..."
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Supplier</button>
            </div>
          </form>
        </div>
      </div>
    </div>
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

// Report Modal Component
const ReportModal = ({ reportType, reportData, onClose, onExportPDF, onExportExcel }) => {
  const getReportTitle = (type) => {
    const titles = {
      'po-report': 'Purchase Order Report',
      'supplier-performance': 'Supplier Performance Report',
      'procurement-cost': 'Procurement Cost Report',
      'inventory-delivery': 'Inventory Delivery Report',
      'quotation-comparison': 'Quotation Comparison Report'
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
                  {reportType === 'po-report' && (
                    <tr>
                      <th>PO Number</th>
                      <th>Supplier</th>
                      <th>Order Date</th>
                      <th>Expected Delivery</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {reportType === 'supplier-performance' && (
                    <tr>
                      <th>Supplier</th>
                      <th>Total POs</th>
                      <th>Total Value</th>
                      <th>On-Time Delivery</th>
                      <th>Avg Rating</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {reportType === 'procurement-cost' && (
                    <tr>
                      <th>Period</th>
                      <th>Total POs</th>
                      <th>Total Cost</th>
                      <th>Avg PO Value</th>
                      <th>Category</th>
                    </tr>
                  )}
                  {reportType === 'inventory-delivery' && (
                    <tr>
                      <th>PO Number</th>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Delivered</th>
                      <th>Delivery Date</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {reportType === 'quotation-comparison' && (
                    <tr>
                      <th>Material</th>
                      <th>Supplier</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {reportData && reportData.length > 0 ? (
                    reportData.map((item, index) => (
                      <tr key={item.id || index}>
                        {reportType === 'po-report' && (
                          <>
                            <td>{item.po_number || 'N/A'}</td>
                            <td>{item.supplier_name || 'N/A'}</td>
                            <td>{new Date(item.order_date).toLocaleDateString()}</td>
                            <td>{item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString() : 'N/A'}</td>
                            <td>${parseFloat(item.total_amount || 0).toFixed(2)}</td>
                            <td>{item.status || 'N/A'}</td>
                          </>
                        )}
                        {reportType === 'supplier-performance' && (
                          <>
                            <td>{item.supplier_name || item.name || 'N/A'}</td>
                            <td>{item.total_pos || 0}</td>
                            <td>${parseFloat(item.total_value || 0).toFixed(2)}</td>
                            <td>{item.on_time_delivery || 0}%</td>
                            <td>{item.avg_rating || 'N/A'}</td>
                            <td>{item.status || 'N/A'}</td>
                          </>
                        )}
                        {reportType === 'procurement-cost' && (
                          <>
                            <td>{item.period || 'N/A'}</td>
                            <td>{item.total_pos || 0}</td>
                            <td>${parseFloat(item.total_cost || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.avg_po_value || 0).toFixed(2)}</td>
                            <td>{item.category || 'N/A'}</td>
                          </>
                        )}
                        {reportType === 'inventory-delivery' && (
                          <>
                            <td>{item.po_number || 'N/A'}</td>
                            <td>{item.material_name || 'N/A'}</td>
                            <td>{item.quantity || 0}</td>
                            <td>{item.delivered_quantity || 0}</td>
                            <td>{item.delivery_date ? new Date(item.delivery_date).toLocaleDateString() : 'N/A'}</td>
                            <td>{item.status || 'N/A'}</td>
                          </>
                        )}
                        {reportType === 'quotation-comparison' && (
                          <>
                            <td>{item.material_name || 'N/A'}</td>
                            <td>{item.supplier_name || 'N/A'}</td>
                            <td>{item.quantity || 0}</td>
                            <td>${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                            <td>${parseFloat(item.total || 0).toFixed(2)}</td>
                            <td>{item.status || 'N/A'}</td>
                          </>
                        )}
                      </tr>
                    ))
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

export default ProcurementOfficerDashboard;
