app.routes.dashboard = async (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1>Dashboard Overview</h1>
      <p>Key metrics and performance at a glance.</p>
    </div>
    
    <div style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
      <button class="btn btn-secondary filter-btn active" data-days="">All Time</button>
      <button class="btn btn-secondary filter-btn" data-days="30">Last 30 Days</button>
      <button class="btn btn-secondary filter-btn" data-days="7">Last 7 Days</button>
      <button class="btn btn-secondary filter-btn" data-days="1">Today</button>
    </div>

    <div class="dashboard-grid" id="dashboard-stats">
      <p>Loading stats...</p>
    </div>
  `;

  const loadStats = async (days = '') => {
    try {
      const qs = days ? `?days=${days}` : '';
      const stats = await api.get(`/stats${qs}`);
      
      const formatNum = (val) => appState.privacyMode ? '***' : val;

      document.getElementById('dashboard-stats').innerHTML = `
        <div class="glass-card" style="border-left: 4px solid var(--accent-blue)">
          <div style="display: flex; justify-content: space-between;">
            <div class="stat-label">Total Revenue</div>
            <i data-lucide="trending-up" style="color: var(--accent-blue)"></i>
          </div>
          <div class="stat-value">${app.formatCurrency(stats.revenue)}</div>
        </div>

        <div class="glass-card" style="border-left: 4px solid var(--accent-red)">
          <div style="display: flex; justify-content: space-between;">
            <div class="stat-label">Total Expenses</div>
            <i data-lucide="trending-down" style="color: var(--accent-red)"></i>
          </div>
          <div class="stat-value">${app.formatCurrency(stats.expense)}</div>
        </div>

        <div class="glass-card" style="border-left: 4px solid var(--accent-green)">
          <div style="display: flex; justify-content: space-between;">
            <div class="stat-label">Net Profit</div>
            <i data-lucide="dollar-sign" style="color: var(--accent-green)"></i>
          </div>
          <div class="stat-value">${app.formatCurrency(stats.profit)}</div>
        </div>

        <div class="glass-card" style="border-left: 4px solid var(--accent-purple)">
          <div style="display: flex; justify-content: space-between;">
            <div class="stat-label">Total Tax</div>
            <i data-lucide="receipt" style="color: var(--accent-purple)"></i>
          </div>
          <div class="stat-value">${app.formatCurrency(stats.tax)}</div>
        </div>

        <div class="glass-card" style="border-left: 4px solid var(--accent-blue)">
          <div style="display: flex; justify-content: space-between;">
            <div class="stat-label">Unpaid Invoices</div>
            <i data-lucide="file-text" style="color: var(--accent-blue)"></i>
          </div>
          <div class="stat-value">${formatNum(stats.unpaid_invoices)}</div>
        </div>

        <div class="glass-card" style="border-left: 4px solid var(--accent-red)">
          <div style="display: flex; justify-content: space-between;">
            <div class="stat-label">Low Stock Alerts</div>
            <i data-lucide="alert-triangle" style="color: var(--accent-red)"></i>
          </div>
          <div class="stat-value">${formatNum(stats.low_stock_alerts)}</div>
        </div>
      `;
      lucide.createIcons();
    } catch (err) {
      document.getElementById('dashboard-stats').innerHTML = `<p style="color:red">Failed to load stats</p>`;
    }
  };

  // Bind filter buttons
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadStats(e.target.dataset.days);
    });
  });

  loadStats();
};
