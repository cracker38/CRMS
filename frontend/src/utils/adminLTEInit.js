// AdminLTE Initialization Helper
export const initAdminLTE = () => {
  // Wait for jQuery and AdminLTE to be available
  if (typeof window.$ === 'undefined' || typeof window.$.fn.pushmenu === 'undefined') {
    // Retry after a short delay
    setTimeout(initAdminLTE, 100);
    return;
  }

  try {
    // Initialize PushMenu (sidebar toggle)
    window.$('[data-widget="pushmenu"]').each(function() {
      if (!window.$(this).data('lte.pushmenu')) {
        window.$(this).PushMenu('init');
      }
    });

    // Initialize Treeview (if needed)
    window.$('[data-widget="treeview"]').each(function() {
      if (!window.$(this).data('lte.treeview')) {
        window.$(this).Treeview('init');
      }
    });

    // Initialize dropdowns
    window.$('.dropdown-toggle').dropdown();

    console.log('AdminLTE initialized successfully');
  } catch (error) {
    console.error('Error initializing AdminLTE:', error);
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminLTE);
} else {
  initAdminLTE();
}









