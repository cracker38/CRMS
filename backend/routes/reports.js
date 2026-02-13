const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get reports based on user role
router.get('/', authenticate, async (req, res) => {
  try {
    const { type: reportType, startDate, endDate, projectId, siteId } = req.query;
    
    if (!reportType) {
      return res.status(400).json({ message: 'Report type is required' });
    }
    
    let reportData = {};
    
    // Build date filter parameters
    const dateParams = [];
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND DATE(e.created_at) BETWEEN '${startDate}' AND '${endDate}'`;
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = `AND DATE(e.created_at) >= '${startDate}'`;
      dateParams.push(startDate);
    } else if (endDate) {
      dateFilter = `AND DATE(e.created_at) <= '${endDate}'`;
      dateParams.push(endDate);
    }
    
    switch (req.user.role) {
      case 'SYSTEM_ADMIN':
        reportData = await getSystemAdminReports(reportType, dateFilter);
        break;
      case 'PROJECT_MANAGER':
        reportData = await getProjectManagerReports(reportType, req.user.id, dateFilter, projectId);
        break;
      case 'SITE_SUPERVISOR':
        reportData = await getSiteSupervisorReports(reportType, req.user.id, startDate, endDate, dateParams, siteId);
        break;
      case 'PROCUREMENT_OFFICER':
        // For procurement, use po.created_at instead of e.created_at
        const poDateFilter = dateFilter ? dateFilter.replace('e.created_at', 'po.created_at') : '';
        reportData = await getProcurementOfficerReports(reportType, req.user.id, poDateFilter);
        break;
      case 'FINANCE_OFFICER':
        reportData = await getFinanceOfficerReports(reportType, dateFilter, projectId);
        break;
      default:
        return res.status(403).json({ message: 'Invalid role' });
    }
    
    res.json(reportData);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

async function getSystemAdminReports(reportType, dateFilter) {
  switch (reportType) {
    case 'user-activity':
      const [activities] = await db.execute(`
        SELECT al.*, u.first_name, u.last_name, u.email, u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1 ${dateFilter}
        ORDER BY al.created_at DESC
        LIMIT 1000
      `);
      return activities;
    case 'audit-log':
      const [auditLogs] = await db.execute(`
        SELECT al.*, u.first_name, u.last_name, u.email, u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1 ${dateFilter}
        ORDER BY al.created_at DESC
        LIMIT 1000
      `);
      return auditLogs;
    case 'procurement-summary':
      const [procurement] = await db.execute(`
        SELECT po.*, s.name as supplier_name,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        WHERE 1=1 ${dateFilter}
        ORDER BY po.created_at DESC
      `);
      return procurement;
    case 'project-financial-summary':
      const [financial] = await db.execute(`
        SELECT 
          p.id,
          p.name,
          p.budget,
          p.status,
          u.first_name as pm_first_name,
          u.last_name as pm_last_name,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) as total_spent,
          COALESCE(SUM(CASE WHEN e.payment_status = 'APPROVED' THEN e.amount ELSE 0 END), 0) as approved_pending,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PENDING' THEN e.amount ELSE 0 END), 0) as pending,
          (p.budget - COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0)) as remaining_budget
        FROM projects p
        LEFT JOIN expenses e ON p.id = e.project_id
        LEFT JOIN users u ON p.project_manager_id = u.id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id, p.name, p.budget, p.status, u.first_name, u.last_name
        ORDER BY p.created_at DESC
      `);
      return financial;
    case 'budget-vs-actual':
      const [budget] = await db.execute(`
        SELECT 
          p.id,
          p.name,
          p.budget,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) as actual_spent,
          (p.budget - COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0)) as variance,
          ROUND((COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) / p.budget * 100), 2) as percentage_used
        FROM projects p
        LEFT JOIN expenses e ON p.id = e.project_id
        WHERE 1=1 ${dateFilter}
        GROUP BY p.id, p.name, p.budget
        ORDER BY p.name
      `);
      return budget;
    case 'system-health':
      const [users] = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "ACTIVE" THEN 1 ELSE 0 END) as active FROM users');
      const [projects] = await db.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "ACTIVE" THEN 1 ELSE 0 END) as active FROM projects');
      const [expenses] = await db.execute('SELECT COUNT(*) as total, SUM(amount) as total_amount FROM expenses');
      const [recentLogs] = await db.execute('SELECT COUNT(*) as total FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
      
      return {
        users: users[0],
        projects: projects[0],
        expenses: expenses[0],
        recentActivity: recentLogs[0],
        generatedAt: new Date()
      };
    case 'virtual-auditor-alerts':
      // Detect fraud and irregular access patterns
      const [failedLogins] = await db.execute(`
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          COUNT(*) as failed_attempts,
          MAX(al.created_at) as last_attempt
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action = 'LOGIN_FAILED'
        AND al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY u.id, u.email, u.first_name, u.last_name
        HAVING failed_attempts >= 3
        ORDER BY failed_attempts DESC
      `);
      
      const [unusualExpenses] = await db.execute(`
        SELECT 
          e.*,
          p.name as project_name,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name,
          (SELECT AVG(amount) FROM expenses WHERE project_id = e.project_id AND category = e.category) as avg_amount
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.amount > (SELECT AVG(amount) * 2 FROM expenses WHERE project_id = e.project_id AND category = e.category)
        AND e.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY e.amount DESC
      `);
      
      const [irregularAccess] = await db.execute(`
        SELECT 
          al.*,
          u.first_name,
          u.last_name,
          u.email,
          u.role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action IN ('UPDATE_USER', 'DELETE_USER', 'RESET_PASSWORD', 'CHANGE_PASSWORD')
        AND al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY al.created_at DESC
      `);
      
      const [budgetOverruns] = await db.execute(`
        SELECT 
          p.id,
          p.name,
          p.budget,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) as total_spent,
          (COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) - p.budget) as overrun_amount,
          ROUND((COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) / p.budget * 100), 2) as percentage_used
        FROM projects p
        LEFT JOIN expenses e ON p.id = e.project_id
        GROUP BY p.id, p.name, p.budget
        HAVING total_spent > p.budget
        ORDER BY overrun_amount DESC
      `);
      
      return {
        failedLogins: failedLogins || [],
        unusualExpenses: unusualExpenses || [],
        irregularAccess: irregularAccess || [],
        budgetOverruns: budgetOverruns || [],
        generatedAt: new Date()
      };
    default:
      return { message: 'Report not found' };
  }
}

async function getProjectManagerReports(reportType, userId, dateFilter, projectId) {
  const projectFilter = projectId ? `AND p.id = ${projectId}` : '';
  
  switch (reportType) {
    case 'project-summary':
      const [summary] = await db.execute(`
        SELECT p.*, 
          (SELECT COUNT(*) FROM sites WHERE project_id = p.id) as site_count,
          COALESCE(SUM(e.amount), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) as paid_expenses
        FROM projects p
        LEFT JOIN expenses e ON p.id = e.project_id
        WHERE p.project_manager_id = ? ${projectFilter}
        GROUP BY p.id
      `, [userId]);
      return summary;
    case 'project-progress':
      const [progress] = await db.execute(`
        SELECT 
          p.id,
          p.name,
          p.start_date,
          p.end_date,
          p.status,
          DATEDIFF(COALESCE(p.end_date, CURDATE()), p.start_date) as total_days,
          DATEDIFF(CURDATE(), p.start_date) as days_elapsed,
          (SELECT COUNT(*) FROM sites WHERE project_id = p.id) as site_count,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'COMPLETED') as completed_tasks,
          (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks
        FROM projects p
        WHERE p.project_manager_id = ? ${projectFilter}
        ORDER BY p.created_at DESC
      `, [userId]);
      return progress;
    case 'budget-vs-actual':
      const [budget] = await db.execute(`
        SELECT 
          p.id,
          p.name,
          p.budget,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) as actual_spent,
          (p.budget - COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0)) as variance,
          ROUND((COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) / p.budget * 100), 2) as percentage_used
        FROM projects p
        LEFT JOIN expenses e ON p.id = e.project_id
        WHERE p.project_manager_id = ? ${projectFilter}
        GROUP BY p.id, p.name, p.budget
      `, [userId]);
      return budget;
    case 'material-usage':
      const [materialUsage] = await db.execute(`
        SELECT 
          m.name as material_name,
          m.unit,
          SUM(mr.quantity) as total_requested,
          SUM(CASE WHEN mr.status = 'APPROVED' THEN mr.quantity ELSE 0 END) as approved_quantity,
          SUM(CASE WHEN mr.status = 'PENDING' THEN mr.quantity ELSE 0 END) as pending_quantity,
          p.name as project_name,
          s.name as site_name
        FROM material_requests mr
        LEFT JOIN materials m ON mr.material_id = m.id
        LEFT JOIN sites s ON mr.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE p.project_manager_id = ? ${projectFilter} ${dateFilter}
        GROUP BY m.id, m.name, m.unit, p.name, s.name
        ORDER BY total_requested DESC
      `, [userId]);
      return materialUsage;
    case 'workforce-productivity':
      const [workforce] = await db.execute(`
        SELECT 
          e.id,
          e.employee_id,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(DISTINCT a.date) as days_worked,
          SUM(a.hours_worked) as total_hours,
          AVG(a.hours_worked) as avg_hours_per_day,
          s.name as site_name,
          p.name as project_name
        FROM employees e
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN attendance a ON e.id = a.employee_id
        LEFT JOIN sites s ON a.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE p.project_manager_id = ? ${projectFilter} ${dateFilter}
        GROUP BY e.id, e.employee_id, u.first_name, u.last_name, u.email, s.name, p.name
        ORDER BY total_hours DESC
      `, [userId]);
      return workforce;
    case 'site-activity':
      const [siteActivity] = await db.execute(`
        SELECT 
          sa.*,
          s.name as site_name,
          p.name as project_name,
          u.first_name as reported_by_first_name,
          u.last_name as reported_by_last_name
        FROM site_activities sa
        LEFT JOIN sites s ON sa.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        LEFT JOIN users u ON sa.reported_by = u.id
        WHERE p.project_manager_id = ? ${projectFilter} ${dateFilter}
        ORDER BY sa.activity_date DESC, sa.created_at DESC
      `, [userId]);
      return siteActivity;
    case 'procurement-status':
      const [procurement] = await db.execute(`
        SELECT 
          po.*,
          s.name as supplier_name,
          p.name as project_name,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
        LEFT JOIN material_requests mr ON poi.material_id = mr.material_id
        LEFT JOIN sites st ON mr.site_id = st.id
        LEFT JOIN projects p ON st.project_id = p.id
        LEFT JOIN users u ON po.created_by = u.id
        WHERE p.project_manager_id = ? ${projectFilter} ${dateFilter}
        GROUP BY po.id
        ORDER BY po.created_at DESC
      `, [userId]);
      return procurement;
    default:
      return { message: 'Report not found' };
  }
}

async function getSiteSupervisorReports(reportType, userId, startDate, endDate, dateParams = [], siteId = null) {
  switch (reportType) {
    case 'daily-activity':
      let activityQuery = `
        SELECT sa.*, s.name as site_name, p.name as project_name
        FROM site_activities sa
        LEFT JOIN sites s ON sa.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE sa.reported_by = ?
      `;
      const activityParams = [userId];
      if (siteId) {
        activityQuery += ' AND sa.site_id = ?';
        activityParams.push(siteId);
      }
      if (startDate && endDate) {
        activityQuery += ' AND sa.activity_date BETWEEN ? AND ?';
        activityParams.push(startDate, endDate);
      } else if (startDate) {
        activityQuery += ' AND sa.activity_date >= ?';
        activityParams.push(startDate);
      } else if (endDate) {
        activityQuery += ' AND sa.activity_date <= ?';
        activityParams.push(endDate);
      }
      activityQuery += ' ORDER BY sa.activity_date DESC, sa.created_at DESC';
      const [activities] = await db.execute(activityQuery, activityParams);
      return activities;
    case 'site-progress':
      // site_activities table in crms.sql does NOT have workforce_count,
      // so we calculate progress metrics only and return 0 as total_workforce_days.
      let progressQuery = `
        SELECT 
          s.id as site_id,
          s.name as site_name,
          p.name as project_name,
          COUNT(DISTINCT sa.id) as total_reports,
          MAX(sa.progress_percentage) as current_progress,
          AVG(sa.progress_percentage) as avg_progress,
          MIN(sa.activity_date) as first_report_date,
          MAX(sa.activity_date) as last_report_date,
          0 as total_workforce_days
        FROM sites s
        LEFT JOIN projects p ON s.project_id = p.id
        LEFT JOIN site_activities sa ON s.id = sa.site_id AND sa.reported_by = ?
        WHERE EXISTS (SELECT 1 FROM site_activities WHERE site_id = s.id AND reported_by = ?)
      `;
      const progressParams = [userId, userId];
      if (siteId) {
        progressQuery += ' AND s.id = ?';
        progressParams.push(siteId);
      }
      progressQuery += ' GROUP BY s.id, s.name, p.name';
      const [progress] = await db.execute(progressQuery, progressParams);
      return progress;
    case 'material-requests':
      let requestQuery = `
        SELECT mr.*, m.name as material_name, m.unit, s.name as site_name, p.name as project_name
        FROM material_requests mr
        LEFT JOIN materials m ON mr.material_id = m.id
        LEFT JOIN sites s ON mr.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE mr.requested_by = ?
      `;
      const requestParams = [userId];
      if (siteId) {
        requestQuery += ' AND mr.site_id = ?';
        requestParams.push(siteId);
      }
      if (startDate && endDate) {
        requestQuery += ' AND mr.created_at BETWEEN ? AND ?';
        requestParams.push(startDate, endDate);
      } else if (startDate) {
        requestQuery += ' AND mr.created_at >= ?';
        requestParams.push(startDate);
      } else if (endDate) {
        requestQuery += ' AND mr.created_at <= ?';
        requestParams.push(endDate);
      }
      requestQuery += ' ORDER BY mr.created_at DESC';
      const [requests] = await db.execute(requestQuery, requestParams);
      return requests;
    case 'material-consumption':
      let consumptionQuery = `
        SELECT 
          m.name as material_name,
          m.unit,
          SUM(mr.quantity) as total_requested,
          SUM(CASE WHEN mr.status = 'APPROVED' THEN mr.quantity ELSE 0 END) as approved_quantity,
          SUM(CASE WHEN mr.status = 'PENDING' THEN mr.quantity ELSE 0 END) as pending_quantity,
          s.name as site_name,
          p.name as project_name
        FROM material_requests mr
        LEFT JOIN materials m ON mr.material_id = m.id
        LEFT JOIN sites s ON mr.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE mr.requested_by = ?
      `;
      const consumptionParams = [userId];
      if (siteId) {
        consumptionQuery += ' AND mr.site_id = ?';
        consumptionParams.push(siteId);
      }
      if (startDate && endDate) {
        consumptionQuery += ' AND mr.created_at BETWEEN ? AND ?';
        consumptionParams.push(startDate, endDate);
      } else if (startDate) {
        consumptionQuery += ' AND mr.created_at >= ?';
        consumptionParams.push(startDate);
      } else if (endDate) {
        consumptionQuery += ' AND mr.created_at <= ?';
        consumptionParams.push(endDate);
      }
      consumptionQuery += ' GROUP BY m.id, m.name, m.unit, s.name, p.name ORDER BY total_requested DESC';
      const [consumption] = await db.execute(consumptionQuery, consumptionParams);
      return consumption;
    case 'incident-safety':
      // crms.sql uses 'incidents' column instead of 'issues_encountered'
      let incidentQuery = `
        SELECT 
          sa.id,
          sa.activity_date,
          sa.incidents as issues_encountered,
          sa.description as work_description,
          sa.weather_conditions,
          s.name as site_name,
          p.name as project_name
        FROM site_activities sa
        LEFT JOIN sites s ON sa.site_id = s.id
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE sa.reported_by = ? 
        AND (sa.incidents IS NOT NULL AND sa.incidents != '')
      `;
      const incidentParams = [userId];
      if (siteId) {
        incidentQuery += ' AND sa.site_id = ?';
        incidentParams.push(siteId);
      }
      if (startDate && endDate) {
        incidentQuery += ' AND sa.activity_date BETWEEN ? AND ?';
        incidentParams.push(startDate, endDate);
      } else if (startDate) {
        incidentQuery += ' AND sa.activity_date >= ?';
        incidentParams.push(startDate);
      } else if (endDate) {
        incidentQuery += ' AND sa.activity_date <= ?';
        incidentParams.push(endDate);
      }
      incidentQuery += ' ORDER BY sa.activity_date DESC';
      const [incidents] = await db.execute(incidentQuery, incidentParams);
      return incidents;
    default:
      return { message: 'Report not found' };
  }
}

async function getProcurementOfficerReports(reportType, userId, dateFilter) {
  switch (reportType) {
    case 'po-report':
      const [pos] = await db.execute(`
        SELECT po.*, s.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.created_by = ? ${dateFilter}
        ORDER BY po.created_at DESC
      `, [userId]);
      return pos;
    case 'supplier-performance':
      const poDateFilterPerf = dateFilter ? dateFilter.replace('AND DATE(e.created_at)', 'AND DATE(po.created_at)') : '';
      const [performance] = await db.execute(`
        SELECT 
          s.id,
          s.name as supplier_name,
          COUNT(po.id) as total_pos,
          COALESCE(SUM(po.total_amount), 0) as total_value,
          ROUND(SUM(CASE WHEN po.delivery_date <= po.expected_delivery_date THEN 1 ELSE 0 END) / NULLIF(COUNT(po.id), 0) * 100, 2) as on_time_delivery,
          'N/A' as avg_rating,
          s.status
        FROM suppliers s
        LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.created_by = ? ${poDateFilterPerf}
        WHERE EXISTS (SELECT 1 FROM purchase_orders WHERE supplier_id = s.id AND created_by = ?)
        GROUP BY s.id, s.name, s.status
        ORDER BY total_value DESC
      `, [userId, userId]);
      return performance;
    case 'procurement-cost':
      const [cost] = await db.execute(`
        SELECT 
          DATE_FORMAT(po.order_date, '%Y-%m') as period,
          COUNT(po.id) as total_pos,
          COALESCE(SUM(po.total_amount), 0) as total_cost,
          COALESCE(AVG(po.total_amount), 0) as avg_po_value,
          'All' as category
        FROM purchase_orders po
        WHERE po.created_by = ? ${dateFilter}
        GROUP BY DATE_FORMAT(po.order_date, '%Y-%m')
        ORDER BY period DESC
      `, [userId]);
      return cost;
    case 'inventory-delivery':
      const poDateFilterDel = dateFilter ? dateFilter.replace('AND DATE(e.created_at)', 'AND DATE(po.created_at)') : '';
      const [delivery] = await db.execute(`
        SELECT 
          po.po_number,
          m.name as material_name,
          poi.quantity,
          poi.quantity as delivered_quantity,
          po.delivery_date,
          po.status
        FROM purchase_orders po
        LEFT JOIN purchase_order_items poi ON po.id = poi.po_id
        LEFT JOIN materials m ON poi.material_id = m.id
        WHERE po.created_by = ? ${poDateFilterDel}
        ORDER BY po.delivery_date DESC, po.created_at DESC
      `, [userId]);
      return delivery;
    case 'quotation-comparison':
      try {
        const qDateFilter = dateFilter ? dateFilter.replace('AND DATE(e.created_at)', 'AND DATE(q.created_at)') : '';
        const [comparison] = await db.execute(`
          SELECT 
            q.*,
            m.name as material_name,
            s.name as supplier_name
          FROM quotations q
          LEFT JOIN materials m ON q.material_id = m.id
          LEFT JOIN suppliers s ON q.supplier_id = s.id
          WHERE q.created_by = ? ${qDateFilter}
          ORDER BY q.material_id, q.unit_price ASC
        `, [userId]);
        return comparison;
      } catch (tableError) {
        // Quotations table doesn't exist
        return [];
      }
    default:
      return { message: 'Report not found' };
  }
}

async function getFinanceOfficerReports(reportType, dateFilter, projectId) {
  const projectFilter = projectId ? `AND e.project_id = ${projectId}` : '';
  const projectFilterProjects = projectId ? `AND p.id = ${projectId}` : '';
  
  switch (reportType) {
    case 'payment-approval':
      const [payments] = await db.execute(`
        SELECT 
          e.*,
          p.name as project_name,
          u1.first_name as creator_first_name,
          u1.last_name as creator_last_name,
          u2.first_name as approver_first_name,
          u2.last_name as approver_last_name
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN users u1 ON e.created_by = u1.id
        LEFT JOIN users u2 ON e.approved_by = u2.id
        WHERE 1=1 ${dateFilter} ${projectFilter}
        ORDER BY e.created_at DESC
      `);
      return payments;
    case 'expense-tracking':
      const [expenses] = await db.execute(`
        SELECT e.*, p.name as project_name
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        WHERE 1=1 ${dateFilter} ${projectFilter}
        ORDER BY e.created_at DESC
      `);
      return expenses;
    case 'financial-statement':
      const expenseDateFilterFS = dateFilter ? dateFilter.replace('e.created_at', 'e.expense_date') : '';
      const [financial] = await db.execute(`
        SELECT 
          p.id,
          p.name as project_name,
          p.budget,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) as total_spent,
          (p.budget - COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0)) as remaining_budget,
          ROUND((COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) / NULLIF(p.budget, 0) * 100), 2) as percentage_used
        FROM projects p
        LEFT JOIN expenses e ON p.id = e.project_id ${expenseDateFilterFS}
        WHERE 1=1 ${projectFilterProjects}
        GROUP BY p.id, p.name, p.budget
        ORDER BY p.name
      `);
      return financial;
    case 'project-financial-health':
      const expenseDateFilterPH = dateFilter ? dateFilter.replace('e.created_at', 'e.expense_date') : '';
      const [health] = await db.execute(`
        SELECT 
          p.id,
          p.name,
          p.budget,
          p.status,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0) as total_spent,
          COALESCE(SUM(CASE WHEN e.payment_status = 'APPROVED' THEN e.amount ELSE 0 END), 0) as approved_pending,
          COALESCE(SUM(CASE WHEN e.payment_status = 'PENDING' THEN e.amount ELSE 0 END), 0) as pending,
          (p.budget - COALESCE(SUM(CASE WHEN e.payment_status = 'PAID' THEN e.amount ELSE 0 END), 0)) as remaining_budget
        FROM projects p
        LEFT JOIN expenses e ON p.id = e.project_id ${expenseDateFilterPH}
        WHERE 1=1 ${projectFilterProjects}
        GROUP BY p.id, p.name, p.budget, p.status
        ORDER BY p.name
      `);
      return health;
    case 'receipt-invoice-validation':
      const [invoices] = await db.execute(`
        SELECT 
          e.*,
          p.name as project_name,
          u2.first_name as approver_first_name,
          u2.last_name as approver_last_name
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN users u2 ON e.approved_by = u2.id
        WHERE e.invoice_number IS NOT NULL AND e.invoice_number != ''
        ${dateFilter} ${projectFilter}
        ORDER BY e.created_at DESC
      `);
      return invoices;
    case 'budget-adjustment':
      // For now, return projects with budget info (can be enhanced with actual adjustment tracking)
      const [adjustments] = await db.execute(`
        SELECT 
          p.id,
          p.name as project_name,
          p.budget as current_budget,
          p.budget as original_budget,
          'No adjustment reason recorded' as adjustment_reason
        FROM projects p
        WHERE 1=1 ${projectFilterProjects}
        ORDER BY p.name
      `);
      return adjustments;
    default:
      return { message: 'Report not found' };
  }
}

module.exports = router;

