import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, Search } from 'lucide-react';

function Products() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sku: '', name: '', 
    pieces_per_case: '1', case_price: '0', piece_price: '0',
    tax_rate: '0.18', stock_cases: '0', stock_pieces: '0'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleEditItem = (product) => {
    setFormData({
      ...product,
      stock_cases: Math.floor(product.stock_quantity / product.pieces_per_case).toString(),
      stock_pieces: (product.stock_quantity % product.pieces_per_case).toString()
    });
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleDeleteItem = async (id) => {
    if(!window.confirm("Permanently delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch(err) { alert(err.response?.data?.detail || "Delete Failed. Item might have existing sales records."); }
  };

  const handleOpenModal = () => {
    setFormData({ sku: '', name: '', pieces_per_case: '1', case_price: '0', piece_price: '0', tax_rate: '0.18', stock_cases: '0', stock_pieces: '0' });
    setEditingId(null);
    setShowModal(true);
  };

  const fetchProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        pieces_per_case: parseInt(formData.pieces_per_case),
        case_price: parseFloat(formData.case_price),
        piece_price: parseFloat(formData.piece_price),
        tax_rate: parseFloat(formData.tax_rate),
        stock_quantity: (parseInt(formData.stock_cases || 0) * parseInt(formData.pieces_per_case || 1)) + parseInt(formData.stock_pieces || 0)
      };
      
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert('Error saving product.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: '1 1 auto' }}>
          <h1>Products (Wholesale & Retail)</h1>
          <p>Manage items, Wholesale structures (Cases/Pieces), and inventory tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input type="text" placeholder="Search by SKU or Name..." style={{ background: 'transparent', border: 'none', color: 'white', width: '220px', outline: 'none' }} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
          </div>
          <button className="btn" onClick={handleOpenModal}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {showModal && (
        <div className="glass-card" style={{ marginBottom: '24px', border: '1px solid var(--accent-blue)' }}>
          <h2 style={{ marginBottom: '16px' }}>{editingId ? 'Edit Product' : 'New Product'}</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">SKU / Barcode</label>
              <input className="form-input" required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Product Name</label>
              <input className="form-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            
            {/* Wholesale Math */}
            <div className="form-group glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <label className="form-label text-blue">Pieces per 1 Case</label>
              <input className="form-input" type="number" required value={formData.pieces_per_case} onChange={(e) => setFormData({...formData, pieces_per_case: e.target.value})} />
            </div>
            <div className="form-group glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <label className="form-label text-blue">Price per Case (₹)</label>
              <input className="form-input" type="number" step="0.01" required value={formData.case_price} onChange={(e) => setFormData({...formData, case_price: e.target.value})} />
            </div>
            <div className="form-group glass-card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)' }}>
              <label className="form-label text-blue">Price per Single Piece (₹)</label>
              <input className="form-input" type="number" step="0.01" required value={formData.piece_price} onChange={(e) => setFormData({...formData, piece_price: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">GST Tax Rate (0.18 = 18%)</label>
              <input className="form-input" type="number" step="0.01" required value={formData.tax_rate} onChange={(e) => setFormData({...formData, tax_rate: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock in Cases</label>
              <input className="form-input" type="number" required value={formData.stock_cases} onChange={(e) => setFormData({...formData, stock_cases: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock in Remainder Pieces</label>
              <input className="form-input" type="number" required value={formData.stock_pieces} onChange={(e) => setFormData({...formData, stock_pieces: e.target.value})} />
            </div>

            <div style={{ gridColumn: 'span 3', display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn">Save Product Core</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU & Item</th>
                <th>Wholesale Rules</th>
                <th>Default Prices</th>
                <th>GST</th>
                <th>Total Pieces in Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="badge badge-blue">{p.sku}</span><br/>
                    <strong style={{fontSize: '1.1rem'}}>{p.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    1 Case = <b>{p.pieces_per_case}</b> pieces
                  </td>
                  <td>
                    Case: ₹{p.case_price.toFixed(2)}<br/>
                    Piece: ₹{p.piece_price.toFixed(2)}
                  </td>
                  <td>{(p.tax_rate * 100).toFixed(0)}%</td>
                  <td>
                    {(() => {
                      const cases = Math.floor(p.stock_quantity / p.pieces_per_case);
                      const remainder = p.stock_quantity % p.pieces_per_case;
                      return (
                        <>
                          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{cases} Case{cases !== 1 && 's'}</span><br/>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>+ {remainder} Piece{remainder !== 1 && 's'}</span>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => handleEditItem(p)}>Edit</button>
                      <button className="btn" style={{ padding: '4px 8px', backgroundColor: 'var(--accent-red)' }} onClick={() => handleDeleteItem(p.id)}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Products;
