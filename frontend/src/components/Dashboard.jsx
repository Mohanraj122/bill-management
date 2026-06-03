import React, { useState, useEffect } from 'react';
import api from '../api';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function Dashboard({ privacyMode }) {
  const [filter, setFilter] = useState(''); // '' means all time, '1' means 1 day, etc.
  const [stats, setStats] = useState({ revenue: 0, tax: 0, expense: 0, profit: 0, unpaid_invoices: 0, low_stock_alerts: 0 });
  const [ledger, setLedger] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get(`/stats${filter ? '?days='+filter : ''}`);
      setStats(statsRes.data);
      
      const ledgerRes = await api.get('/ledger');
      setLedger(ledgerRes.data.slice(0, 5));
      
      // Process chart data from ledger (simplified)
      let dataMap = {};
      ledgerRes.data.forEach(item => {
        if(item.transaction_type !== 'revenue') return; // only plot revenue for simplicity
        const date = new Date(item.created_at).toLocaleDateString();
        dataMap[date] = (dataMap[date] || 0) + item.amount;
      });
      const finalChart = Object.keys(dataMap).map(k => ({ name: k, Revenue: dataMap[k] }));
      setChartData(finalChart.reverse()); // chronological
      
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [filter]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Command Center Analytics</h1>
          <p>Real-time visual overview of your financial flow.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select className="form-input" style={{ width: '150px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Time</option>
            <option value="1">Last 24 Hours</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
          <button className="btn btn-secondary" onClick={fetchDashboard}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Primary KPIS */}
      <div className="dashboard-grid">
        <div className="glass-card" style={{ borderTop: '4px solid var(--accent-blue)' }}>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value text-blue">{privacyMode ? '₹ ***.**' : `₹${stats.revenue.toFixed(2)}`}</div>
        </div>
        <div className="glass-card" style={{ borderTop: '4px solid var(--accent-red)' }}>
          <div className="stat-label">Total Expenses (Purchases)</div>
          <div className="stat-value text-red">{privacyMode ? '₹ ***.**' : `₹${stats.expense.toFixed(2)}`}</div>
        </div>
        <div className="glass-card" style={{ borderTop: '4px solid var(--accent-green)' }}>
          <div className="stat-label">Net Profit (Rev - Exp)</div>
          <div className="stat-value text-green">{privacyMode ? '₹ ***.**' : `₹${stats.profit.toFixed(2)}`}</div>
        </div>
        <div className="glass-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="var(--accent-red)" /> Action Required
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Unpaid invoices: <strong style={{color:'white'}}>{stats.unpaid_invoices}</strong> <br/>
            Low stock alerts: <strong style={{color:'white'}}>{stats.low_stock_alerts}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* CHART Area */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '24px', fontSize: '1.25rem' }}>Revenue Trends Graph</h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="Revenue" stroke="var(--accent-blue)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Ledger Entries */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Recent Ledger</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>Type</th><th>Amount</th></tr></thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <span className={`badge ${entry.transaction_type === 'revenue' ? 'badge-green' : entry.transaction_type === 'expense' ? 'badge-red' : 'badge-blue'}`}>
                        {entry.transaction_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{privacyMode ? '***.**' : `₹${entry.amount.toFixed(2)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
