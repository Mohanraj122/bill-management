import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calculator } from 'lucide-react';

function Reports({ privacyMode }) {
  const [filter, setFilter] = useState('');
  const [stats, setStats] = useState({ revenue: 0, tax: 0, expense: 0, profit: 0 });

  const fetchStats = async () => {
    try {
      const res = await api.get(`/stats${filter ? '?days='+filter : ''}`);
      setStats(res.data);
    } catch(err) {}
  };

  useEffect(() => {
    fetchStats();
  }, [filter]);

  const mask = (value) => privacyMode ? '₹ ***.**' : `₹ ${value.toFixed(2)}`;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Calculator size={24} style={{display:'inline', verticalAlign:'sub'}} /> Profit & Loss Statement</h1>
          <p>A rigorous breakdown of your wholesale expenses against your collected sales revenue.</p>
        </div>
        <select className="form-input" style={{ width: '200px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Time</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 1 Quarter (90 Days)</option>
          <option value="365">Last 1 Year (365 Days)</option>
        </select>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem' }}>
        <div className="glass-card" style={{ padding: '32px' }}>
          
          <h2 style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom:'24px'}}>Financial Performance</h2>
          
          {/* INCOME SECTION */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ color: 'var(--accent-green)', marginBottom: '12px' }}>INCOME</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '16px' }}>
              <span>Gross Sales Revenue (Inv. Paid)</span>
              <span>{mask(stats.revenue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '16px', color: 'var(--text-secondary)' }}>
              <span>GST / Tax Collected</span>
              <span>{mask(stats.tax)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', fontWeight: 'bold' }}>
              <span>Total Income Inflows</span>
              <span>{mask(stats.revenue + stats.tax)}</span>
            </div>
          </div>

          {/* EXPENSE SECTION */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ color: 'var(--accent-red)', marginBottom: '12px' }}>COST OF GOODS SOLD (COGS)</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '16px' }}>
              <span>Purchase Orders (Wholesale Expenses)</span>
              <span>{mask(stats.expense)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', fontWeight: 'bold' }}>
              <span>Total Expenses</span>
              <span>{mask(stats.expense)}</span>
            </div>
          </div>

          {/* NET PROFIT SECTION */}
          <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold' }}>
              <span>NET OPERATING PROFIT</span>
              <span style={{ color: stats.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {mask(stats.revenue - stats.expense)}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', textAlign: 'right' }}>
              *Exclusive of GST Tax Liabilities. Net Margin is calculated strictly against core COGS.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

export default Reports;
