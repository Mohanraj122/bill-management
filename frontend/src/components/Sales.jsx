import React, { useState, useEffect } from 'react';
import api from '../api';
import { ShoppingCart, Plus, Minus, Trash2, Search } from 'lucide-react';

function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPrices, setCustomerPrices] = useState([]); // Array of rules
  
  const [cart, setCart] = useState([]);
  const [includeGst, setIncludeGst] = useState(true);
  const [walkInName, setWalkInName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data));
    api.get('/customers').then(res => setCustomers(res.data));
  }, []);

  // When customer changes, load their rulebook
  useEffect(() => {
    if(selectedCustomerId && selectedCustomerId !== 'walk_in') {
      api.get(`/customers/${selectedCustomerId}/prices`).then(res => setCustomerPrices(res.data));
    } else {
      setCustomerPrices([]);
    }
  }, [selectedCustomerId]);

  // Determine active price for a product
  const getActivePrice = (product, unitMode) => {
    // 1. Check if customer rule overrides the PIECE price
    const rule = customerPrices.find(r => r.product_id === product.id);
    let activePiecePrice = rule ? parseFloat(rule.custom_price) : parseFloat(product.piece_price);
    
    // 2. Mathematically evaluate based on unitMode with rounded formatting
    if(unitMode === 'Case') {
      let calcPrice = rule ? (activePiecePrice * product.pieces_per_case) : parseFloat(product.case_price);
      return Math.round(calcPrice * 100) / 100;
    } else {
      return Math.round(activePiecePrice * 100) / 100;
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (!existing) {
      setCart([...cart, { 
        ...product, 
        cartQty: 1, 
        unitMode: 'Piece', // Default to single piece
        cartPrice: getActivePrice(product, 'Piece') 
      }]);
    }
  };

  const handleUnitModeChange = (id, newMode) => {
    setCart(cart.map(item => {
      if(item.id === id) {
        const newPriceCtx = getActivePrice(item, newMode);
        return { ...item, unitMode: newMode, cartPrice: newPriceCtx };
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (!selectedCustomerId || cart.length === 0) return alert('Select Customer and Items');
    
    // Convert logic to PIECES for backend atomic validation
    const items = cart.map(item => {
      let safeQty = parseInt(item.cartQty) || 0;
      let finalQuantityInPieces = item.unitMode === 'Case' ? (safeQty * item.pieces_per_case) : safeQty;
      let calculatedPiecePrice = item.unitMode === 'Case' ? (item.cartPrice / item.pieces_per_case) : parseFloat(item.cartPrice);
      
      return {
        product_id: item.id,
        quantity: finalQuantityInPieces,
        unit_price: calculatedPiecePrice
      };
    });

    try {
      const parsedCustomerId = selectedCustomerId === 'walk_in' ? null : parseInt(selectedCustomerId);
      await api.post('/orders', { customer_id: parsedCustomerId, walk_in_name: walkInName, items });
      alert('Order processing complete. Invoice generated.');
      setCart([]);
      setWalkInName('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error processing sales order');
    }
  };

  let subtotal = 0;
  let gstTotal = 0;
  cart.forEach(item => {
    const qty = parseInt(item.cartQty) || 0;
    const lineTotal = item.cartPrice * qty;
    subtotal += lineTotal;
    if (includeGst) gstTotal += lineTotal * item.tax_rate;
  });

  return (
    <>
      <div className="page-header">
        <h1>Sales Desk (Wholesale POS)</h1>
        <p>Assign billing directly to Customer Profiles. Select Case or Piece pricing seamlessly.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        
        {/* Catalog */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '16px' }}>Catalog Selector</h2>
          
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '24px' }}>
            <label className="form-label">Billing Profile (Customer)</label>
            <select className="form-input" value={selectedCustomerId} onChange={e=>setSelectedCustomerId(e.target.value)}>
              <option value="">-- Required: Select Customer --</option>
              <option value="walk_in">Walk-in Customer (Default Prices)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedCustomerId === 'walk_in' && (
              <input type="text" className="form-input" placeholder="Enter Customer Name (Optional)" style={{ marginTop: '12px' }} value={walkInName} onChange={e=>setWalkInName(e.target.value)} />
            )}
            {customerPrices.length > 0 && <span style={{fontSize:'0.8rem', color:'var(--accent-green)'}}>Auto-applying {customerPrices.length} custom price rules for this profile.</span>}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input type="text" placeholder="Quick Search Products..." style={{ background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none' }} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', maxHeight: '500px', overflowY: 'auto' }}>
            {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
              const inStockPieces = p.stock_quantity;
              const cases = Math.floor(inStockPieces / p.pieces_per_case);
              const remainder = inStockPieces % p.pieces_per_case;
              return (
                <div key={p.id} className="glass-card" style={{ flex: '1 1 calc(50% - 16px)', cursor: 'pointer' }} onClick={() => addToCart(p)}>
                  <strong>{p.name}</strong>
                  <div style={{ color: 'var(--accent-blue)', fontSize: '0.9rem', marginTop: '4px' }}>
                    Piece: ₹{getActivePrice(p, 'Piece')} | Case: ₹{getActivePrice(p, 'Case')}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: inStockPieces > 0 ? 'var(--text-secondary)' : 'var(--accent-red)' }}>
                    Inventory: {cases} Case{cases !== 1 ? 's' : ''}, {remainder} Piece{remainder !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart /> Current Draft
          </h2>

          <div style={{ minHeight: '300px' }}>
            {cart.map(item => {
              const displayQty = parseInt(item.cartQty) || 0;
              return (
              <div key={item.id} className="glass-card" style={{ marginBottom: '12px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{item.name}</strong>
                  <span style={{ fontSize: '1.2rem', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                    ₹{(item.cartPrice * displayQty).toFixed(2)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
                  
                  <select className="form-input" style={{ width: '100px' }} value={item.unitMode} onChange={(e) => handleUnitModeChange(item.id, e.target.value)}>
                    <option value="Piece">Pieces</option>
                    <option value="Case">Cases (x{item.pieces_per_case} pcs)</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px', border: 'none' }} onClick={() => setCart(cart.map(c => c.id===item.id?{...c, cartQty: Math.max(1, (parseInt(c.cartQty)||0)-1)}:c))}><Minus size={14}/></button>
                    <input type="number" className="form-input" style={{ width: '80px', textAlign: 'center' }} value={item.cartQty} onChange={(e)=>setCart(cart.map(c=>c.id===item.id?{...c, cartQty: e.target.value === '' ? '' : parseInt(e.target.value)}:c))} />
                    <button className="btn btn-secondary" style={{ padding: '4px', border: 'none' }} onClick={() => setCart(cart.map(c => c.id===item.id?{...c, cartQty: (parseInt(c.cartQty)||0)+1}:c))}><Plus size={14}/></button>
                  </div>

                  <button className="btn" style={{ padding: '4px', border: 'none', background: 'none', color: 'var(--accent-red)' }} onClick={() => setCart(cart.filter(c => c.id !== item.id))}><Trash2 size={16}/></button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Final Output Price (per {item.unitMode}): ₹</span>
                  <input type="number" className="form-input" style={{ width: '120px', padding: '4px' }} step="0.01" value={item.cartPrice} onChange={(e) => setCart(cart.map(c => c.id===item.id?{...c, cartPrice: parseFloat(e.target.value)}:c))} />
                </div>
                {customerPrices.find(r => r.product_id === item.id) && <div style={{fontSize:'0.75rem', color:'var(--accent-green)', marginTop:'6px'}}>Customer Special Price Applied</div>}
              </div>
            )})}
            {cart.length === 0 && <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '40px' }}>Cart is empty</div>}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
              <input type="checkbox" checked={includeGst} onChange={(e) => setIncludeGst(e.target.checked)} />
              Add GST to Invoice Ledger
            </label>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {includeGst && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                <span>GST ({cart.length ? (cart[0].tax_rate * 100).toFixed(0) : 0}% average):</span>
                <span>₹{gstTotal.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
              <span>Net Total:</span>
              <span>₹{(subtotal + (includeGst ? gstTotal : 0)).toFixed(2)}</span>
            </div>
            
            <button className="btn" style={{ width: '100%', fontSize: '1.1rem', padding: '16px', background: 'var(--accent-blue)', color: 'white' }} onClick={handleCheckout}>
              Record Wholesale Order
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

export default Sales;
