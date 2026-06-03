app.routes.reports = async (container) => {
  let stats = { revenue: 0, tax: 0, expense: 0, profit: 0 };
  let filter = '';

  const render = () => {
    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1><i data-lucide="calculator" style="display:inline; vertical-align:sub; width:24px; height:24px;"></i> Profit & Loss Statement</h1>
          <p>A rigorous breakdown of your wholesale expenses against your collected sales revenue.</p>
        </div>
        <select class="form-input" id="report-filter" style="width: 200px;">
          <option value="">All Time</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 1 Quarter (90 Days)</option>
          <option value="365">Last 1 Year (365 Days)</option>
        </select>
      </div>

      <div style="max-width: 800px; margin: 0 auto; font-size: 1.1rem;">
        <div class="glass-card" style="padding: 32px;" id="report-content">
          Loading...
        </div>
      </div>
    `;

    lucide.createIcons();
    bindEvents();
    fetchStats();
  };

  const fetchStats = async () => {
    try {
      stats = await api.get(`/stats${filter ? '?days='+filter : ''}`);
      renderContent();
    } catch (err) {
      document.getElementById('report-content').innerHTML = '<p style="color:red">Failed to load reports.</p>';
    }
  };

  const renderContent = () => {
    const mask = (val) => app.formatCurrency(val);
    const content = document.getElementById('report-content');

    content.innerHTML = `
      <h2 style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 24px;">Financial Performance</h2>
      
      <!-- INCOME SECTION -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: var(--accent-green); margin-bottom: 12px;">INCOME</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-left: 16px;">
          <span>Gross Sales Revenue (Inv. Paid)</span>
          <span>${mask(stats.revenue)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-left: 16px; color: var(--text-secondary);">
          <span>GST / Tax Collected</span>
          <span>${mask(stats.tax)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; font-weight: bold;">
          <span>Total Income Inflows</span>
          <span>${mask(stats.revenue + stats.tax)}</span>
        </div>
      </div>

      <!-- EXPENSE SECTION -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: var(--accent-red); margin-bottom: 12px;">COST OF GOODS SOLD (COGS)</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-left: 16px;">
          <span>Purchase Orders (Wholesale Expenses)</span>
          <span>${mask(stats.expense)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; font-weight: bold;">
          <span>Total Expenses</span>
          <span>${mask(stats.expense)}</span>
        </div>
      </div>

      <!-- NET PROFIT SECTION -->
      <div style="background-color: rgba(0,0,0,0.3); padding: 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: bold;">
          <span>NET OPERATING PROFIT</span>
          <span style="color: ${(stats.revenue - stats.expense) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${mask(stats.revenue - stats.expense)}
          </span>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px; text-align: right;">
          *Exclusive of GST Tax Liabilities. Net Margin is calculated strictly against core COGS.
        </p>
      </div>
    `;
  };

  const bindEvents = () => {
    document.getElementById('report-filter').addEventListener('change', (e) => {
      filter = e.target.value;
      fetchStats();
    });
  };

  render();
};
