app.routes.products = async (container) => {
  let products = [];
  let editingId = null;

  const render = () => {
    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div style="flex: 1 1 auto;">
          <h1>Products (Wholesale & Retail)</h1>
          <p>Manage items, Wholesale structures (Cases/Pieces), and inventory tracking.</p>
        </div>
        <div style="display: flex; gap: 16px; align-items: center;">
          <div style="display: flex; gap: 8px; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <i data-lucide="search" style="width: 18px; color: var(--text-secondary)"></i>
            <input type="text" id="search-input" placeholder="Search by SKU or Name..." style="background: transparent; border: none; color: white; width: 220px; outline: none;">
          </div>
          <button class="btn" id="btn-add-product">
            <i data-lucide="plus"></i> Add Product
          </button>
        </div>
      </div>

      <div id="product-modal" class="glass-card" style="display: none; margin-bottom: 24px; border: 1px solid var(--accent-blue);">
        <h2 id="modal-title" style="margin-bottom: 16px;">New Product</h2>
        <form id="product-form" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">SKU / Barcode</label>
            <input class="form-input" id="form-sku" required>
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Product Name</label>
            <input class="form-input" id="form-name" required>
          </div>
          
          <div class="form-group glass-card" style="padding: 12px; background: rgba(255,255,255,0.02);">
            <label class="form-label" style="color: var(--accent-blue);">Pieces per 1 Case</label>
            <input class="form-input" type="number" id="form-pieces-per-case" required>
          </div>
          <div class="form-group glass-card" style="padding: 12px; background: rgba(255,255,255,0.02);">
            <label class="form-label" style="color: var(--accent-blue);">Price per Case (₹)</label>
            <input class="form-input" type="number" step="0.01" id="form-case-price" required>
          </div>
          <div class="form-group glass-card" style="padding: 12px; background: rgba(255,255,255,0.02);">
            <label class="form-label" style="color: var(--accent-blue);">Price per Single Piece (₹)</label>
            <input class="form-input" type="number" step="0.01" id="form-piece-price" required>
          </div>

          <div class="form-group">
            <label class="form-label">GST Tax Rate (0.18 = 18%)</label>
            <input class="form-input" type="number" step="0.01" id="form-tax-rate" required>
          </div>
          <div class="form-group">
            <label class="form-label">Stock in Cases</label>
            <input class="form-input" type="number" id="form-stock-cases" required>
          </div>
          <div class="form-group">
            <label class="form-label">Stock in Remainder Pieces</label>
            <input class="form-input" type="number" id="form-stock-pieces" required>
          </div>

          <div style="grid-column: span 3; display: flex; gap: 12px;">
            <button type="submit" class="btn">Save Product Core</button>
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancel</button>
          </div>
        </form>
      </div>

      <div class="glass-card">
        <div class="table-container">
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
            <tbody id="table-body">
              <tr><td colspan="6">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    lucide.createIcons();
    bindEvents();
    fetchProducts();
  };

  const bindEvents = () => {
    document.getElementById('btn-add-product').addEventListener('click', () => {
      editingId = null;
      document.getElementById('modal-title').innerText = 'New Product';
      document.getElementById('form-sku').value = '';
      document.getElementById('form-name').value = '';
      document.getElementById('form-pieces-per-case').value = '1';
      document.getElementById('form-case-price').value = '0';
      document.getElementById('form-piece-price').value = '0';
      document.getElementById('form-tax-rate').value = '0.18';
      document.getElementById('form-stock-cases').value = '0';
      document.getElementById('form-stock-pieces').value = '0';
      document.getElementById('product-modal').style.display = 'block';
    });

    document.getElementById('btn-cancel-modal').addEventListener('click', () => {
      document.getElementById('product-modal').style.display = 'none';
    });

    document.getElementById('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        sku: document.getElementById('form-sku').value,
        name: document.getElementById('form-name').value,
        pieces_per_case: parseInt(document.getElementById('form-pieces-per-case').value),
        case_price: parseFloat(document.getElementById('form-case-price').value),
        piece_price: parseFloat(document.getElementById('form-piece-price').value),
        tax_rate: parseFloat(document.getElementById('form-tax-rate').value),
        stock_quantity: (parseInt(document.getElementById('form-stock-cases').value || 0) * parseInt(document.getElementById('form-pieces-per-case').value || 1)) + parseInt(document.getElementById('form-stock-pieces').value || 0)
      };

      try {
        if (editingId) {
          await api.put(`/products/${editingId}`, payload);
        } else {
          await api.post('/products', payload);
        }
        document.getElementById('product-modal').style.display = 'none';
        fetchProducts();
      } catch (err) {
        alert('Error saving product: ' + err.message);
      }
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
      renderTable(e.target.value);
    });
  };

  const fetchProducts = async () => {
    try {
      products = await api.get('/products');
      renderTable();
    } catch (err) {
      document.getElementById('table-body').innerHTML = `<tr><td colspan="6" style="color:red">Failed to load</td></tr>`;
    }
  };

  const renderTable = (searchTerm = '') => {
    const tbody = document.getElementById('table-body');
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No products found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const cases = Math.floor(p.stock_quantity / p.pieces_per_case);
      const remainder = p.stock_quantity % p.pieces_per_case;
      
      return `
        <tr>
          <td>
            <span class="badge badge-blue">${p.sku}</span><br/>
            <strong style="font-size: 1.1rem">${p.name}</strong>
          </td>
          <td style="color: var(--text-secondary)">
            1 Case = <b>${p.pieces_per_case}</b> pieces
          </td>
          <td>
            Case: ₹${p.case_price.toFixed(2)}<br/>
            Piece: ₹${p.piece_price.toFixed(2)}
          </td>
          <td>${(p.tax_rate * 100).toFixed(0)}%</td>
          <td>
            <span style="font-size: 1.1rem; font-weight: 600">${cases} Case${cases !== 1 ? 's' : ''}</span><br/>
            <span style="font-size: 0.9rem; color: var(--text-secondary)">+ ${remainder} Piece${remainder !== 1 ? 's' : ''}</span>
          </td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-edit" data-id="${p.id}" style="padding: 4px 8px">Edit</button>
              <button class="btn btn-delete" data-id="${p.id}" style="padding: 4px 8px; background-color: var(--accent-red)"><i data-lucide="trash-2" style="width: 16px; height: 16px"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();

    // Bind edit/delete buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const p = products.find(x => x.id === id);
        if (p) {
          editingId = p.id;
          document.getElementById('modal-title').innerText = 'Edit Product';
          document.getElementById('form-sku').value = p.sku;
          document.getElementById('form-name').value = p.name;
          document.getElementById('form-pieces-per-case').value = p.pieces_per_case;
          document.getElementById('form-case-price').value = p.case_price;
          document.getElementById('form-piece-price').value = p.piece_price;
          document.getElementById('form-tax-rate').value = p.tax_rate;
          document.getElementById('form-stock-cases').value = Math.floor(p.stock_quantity / p.pieces_per_case);
          document.getElementById('form-stock-pieces').value = p.stock_quantity % p.pieces_per_case;
          document.getElementById('product-modal').style.display = 'block';
        }
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        if (window.confirm("Permanently delete this product?")) {
          try {
            await api.delete(`/products/${id}`);
            fetchProducts();
          } catch (err) {
            alert("Delete Failed. Item might have existing sales records.");
          }
        }
      });
    });
  };

  render();
};
