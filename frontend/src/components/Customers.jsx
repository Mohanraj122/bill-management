import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Trash2, Tag } from 'lucide-react';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Price linking logic
  // Price linking logic
  const [selectedProductId, setSelectedProductId] = useState('');
  const [piecePrice, setPiecePrice] = useState('');
  const [casePrice, setCasePrice] = useState('');

  const handlePieceChange = (val) => {
    setPiecePrice(val);
    const p = products.find(prod => prod.id === parseInt(selectedProductId));
    if (p && val) setCasePrice((parseFloat(val) * (p.pieces_per_case || 1)).toFixed(2));
    else setCasePrice('');
  };

  const handleCaseChange = (val) => {
    setCasePrice(val);
    const p = products.find(prod => prod.id === parseInt(selectedProductId));
    if (p && val) setPiecePrice((parseFloat(val) / (p.pieces_per_case || 1)).toFixed(2));
    else setPiecePrice('');
  };

  const loadData = async () => {
    const cRes = await api.get('/customers');
    const pRes = await api.get('/products');
    setCustomers(cRes.data);
    setProducts(pRes.data);
  };

  const loadPrices = async (cxId) => {
    setSelectedCustomerId(cxId);
    const prRes = await api.get(`/customers/${cxId}/prices`);
    setPrices(prRes.data);
  };

  useEffect(() => { loadData(); }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    await api.post('/customers', { name, phone });
    setName(''); setPhone('');
    loadData();
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete customer completely?")) return;
    try {
      await api.delete(`/customers/${id}`);
      loadData();
      if (selectedCustomerId === id) setSelectedCustomerId(null);
    } catch(err) { alert(err.response?.data?.detail || "Error deleting"); }
  };

  const handleSetPrice = async (e) => {
    e.preventDefault();
    if(!selectedCustomerId || !selectedProductId) return;
    await api.post(`/customers/${selectedCustomerId}/prices`, {
      product_id: parseInt(selectedProductId),
      custom_price: parseFloat(piecePrice)
    });
    setSelectedProductId(''); setPiecePrice(''); setCasePrice('');
    loadPrices(selectedCustomerId);
  };

  return (
    <>
      <div className="page-header">
        <h1>Customers & Custom Pricing Rules</h1>
        <p>Manage customer profiles and set permanent, auto-applied price rules for them during Sales Checkout.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px' }}>
        <div className="glass-card">
          <h3>Customer Directory</h3>
          <form onSubmit={handleAddCustomer} style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input className="form-input" placeholder="Customer Name" value={name} onChange={e=>setName(e.target.value)} required />
            <input className="form-input" placeholder="Phone Number (Optional)" value={phone} onChange={e=>setPhone(e.target.value)} />
            <button className="btn"><Users size={16}/> Add Profile</button>
          </form>

          <div style={{ marginTop: '24px' }}>
            {customers.map(c => (
              <div 
                key={c.id} 
                className="glass-card" 
                style={{ 
                  cursor: 'pointer', marginBottom: '8px', padding: '12px',
                  border: selectedCustomerId === c.id ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)' 
                }}
                onClick={() => loadPrices(c.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{c.name}</strong>
                  <button className="btn btn-secondary" style={{ padding: '4px', border: 'none', color: 'var(--accent-red)' }} onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.phone || "No phone"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          {selectedCustomerId ? (
            <>
              <h3>Price Rulebook: {customers.find(c=>c.id===selectedCustomerId)?.name}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Any product mapped here will automatically override Default Prices (Wholesale/Retail) when generating Sales Bills for this customer.
              </p>

              <form onSubmit={handleSetPrice} style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <select className="form-input" style={{flex: 1, minWidth: '200px'}} value={selectedProductId} onChange={e=>{
                  setSelectedProductId(e.target.value); setPiecePrice(''); setCasePrice('');
                }} required>
                  <option value="">-- Choose Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Retail: ₹{p.piece_price} / {p.pieces_per_case || 1} Pcs/Case)</option>)}
                </select>
                <input type="number" className="form-input" placeholder="Piece Rate (₹)" step="0.01" value={piecePrice} onChange={e=>handlePieceChange(e.target.value)} required style={{ width: '120px' }} />
                <input type="number" className="form-input" placeholder="Case Rate (₹)" step="0.01" value={casePrice} onChange={e=>handleCaseChange(e.target.value)} required style={{ width: '120px' }} />
                <button className="btn"><Tag size={16}/> Map</button>
              </form>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Mapped Price</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map(pr => {
                    const p = products.find(prod=>prod.id===pr.product_id);
                    const prodName = p?.name || "Unknown";
                    const casesRate = (pr.custom_price * (p?.pieces_per_case || 1)).toFixed(2);
                    return (
                      <tr key={pr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 8px' }}>{prodName}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                          ₹{pr.custom_price.toFixed(2)} / Pc <span style={{color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.85em'}}>(₹{casesRate} / Case)</span>
                        </td>
                      </tr>
                    )
                  })}
                  {prices.length === 0 && <tr><td colSpan="2" style={{ padding: '16px' }}>No rules set. Customer pays default retail/wholesale prices.</td></tr>}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
              Select a customer profile to manage their specific pricing rules.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Customers;
