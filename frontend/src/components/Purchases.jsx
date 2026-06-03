import React, { useState, useEffect } from 'react';
import api from '../api';
import { Truck, CheckSquare, Trash2 } from 'lucide-react';

function Purchases() {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [pos, setPos] = useState([]);
  
  const [vendorName, setVendorName] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [cart, setCart] = useState([]);

  const loadData = async () => {
    const vRes = await api.get('/vendors');
    const pRes = await api.get('/products');
    const poRes = await api.get('/purchases');
    setVendors(vRes.data);
    setProducts(pRes.data);
    setPos(poRes.data);
  };

  useEffect(() => { loadData(); }, []);

  const handleAddVendor = async (e) => {
    e.preventDefault();
    await api.post('/vendors', { name: vendorName });
    setVendorName('');
    loadData();
  };

  const generatePO = async () => {
    if(!selectedVendor || cart.length === 0) return alert("Select vendor and add items");
    await api.post('/purchases', {
      vendor_id: parseInt(selectedVendor),
      items: cart.map(c => ({ product_id: c.id, quantity: parseInt(c.qty), unit_cost: parseFloat(c.cost) }))
    });
    setCart([]);
    loadData();
  };

  const receiveStock = async (poId) => {
    try {
      await api.post(`/purchases/${poId}/receive`);
      alert("Stock securely increased! Expense added to Ledger.");
      loadData();
    } catch(err) { alert(err.response?.data?.detail || "Error"); }
  };

  return (
    <>
      <div className="page-header">
        <h1>Purchasing & Vendors</h1>
        <p>Buy products from suppliers. Receiving a Purchase Order automatically <b>increases</b> your stock.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="glass-card">
          <h3>Create Purchase Draft</h3>
          <form onSubmit={handleAddVendor} style={{ margin: '16px 0', display: 'flex', gap: '8px' }}>
            <input className="form-input" placeholder="New Vendor Name" value={vendorName} onChange={e=>setVendorName(e.target.value)} required />
            <button className="btn">Add</button>
          </form>

          <select className="form-input" value={selectedVendor} onChange={e=>setSelectedVendor(e.target.value)} style={{ marginBottom: '16px' }}>
            <option value="">-- Select Vendor --</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>

          <h4>Add Products to PO</h4>
          <select className="form-input" onChange={(e) => {
            const p = products.find(x => x.id == e.target.value);
            if(p && !cart.find(c => c.id === p.id)) setCart([...cart, {...p, qty: 1, cost: p.price * 0.7}]); // assumed cost
          }}>
            <option value="">-- Choose Item --</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div style={{ marginTop: '16px' }}>
            {cart.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{flex: 1}}>Product</span>
                <span style={{width: '60px', textAlign: 'center'}}>Qty</span>
                <span style={{width: '80px', textAlign: 'right'}}>Rate (₹)</span>
                <span style={{width: '32px'}}></span>
              </div>
            )}
            {cart.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{flex: 1, fontWeight: '500'}}>{c.name}</span>
                <input type="number" className="form-input" placeholder="Qty" style={{width: '60px', padding: '4px', textAlign: 'center'}} value={c.qty} onChange={e=>setCart(cart.map(x=>x.id===c.id?{...x, qty:e.target.value}:x))} />
                <input type="number" className="form-input" placeholder="Rate" style={{width: '80px', padding: '4px', textAlign: 'right'}} value={c.cost} onChange={e=>setCart(cart.map(x=>x.id===c.id?{...x, cost:e.target.value}:x))} />
                <button className="btn btn-secondary" style={{ padding: '6px', border: 'none', color: 'var(--accent-red)' }} onClick={() => setCart(cart.filter(x => x.id !== c.id))} title="Remove item">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn" style={{marginTop: '16px'}} onClick={generatePO} disabled={cart.length===0}><Truck size={16}/> Create PO</button>
        </div>

        <div className="glass-card">
          <h3>Active Purchase Orders</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>PO ID</th><th>Vendor</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id}>
                    <td>PO-{po.id}</td>
                    <td>{vendors.find(v=>v.id===po.vendor_id)?.name}</td>
                    <td>₹{po.total_amount.toFixed(2)}</td>
                    <td><span className={`badge ${po.status==='received'?'badge-green':'badge-blue'}`}>{po.status}</span></td>
                    <td>
                      {po.status === 'pending' ? (
                        <button className="btn" style={{padding:'4px 8px'}} onClick={()=>receiveStock(po.id)}>
                           Receive Stock
                        </button>
                      ) : <span style={{color:'var(--accent-green)'}}><CheckSquare size={16} /> Received</span>}
                    </td>
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

export default Purchases;
