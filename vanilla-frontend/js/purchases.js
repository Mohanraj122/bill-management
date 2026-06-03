app.routes.purchases = async (container) => {
  let vendors = [];
  let products = [];
  let pos = [];
  let cart = [];

  const render = () => {
    container.innerHTML = `
      <div class="page-header">
        <h1>Purchasing & Vendors</h1>
        <p>Buy products from suppliers. Receiving a Purchase Order automatically <b>increases</b> your stock.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
        <div class="glass-card">
          <h3>Create Purchase Draft</h3>
          <form id="add-vendor-form" style="margin: 16px 0; display: flex; gap: 8px;">
            <input class="form-input" id="vendor-name" placeholder="New Vendor Name" required>
            <button type="submit" class="btn">Add</button>
          </form>

          <select class="form-input" id="po-vendor" style="margin-bottom: 16px;">
            <option value="">-- Select Vendor --</option>
          </select>

          <h4>Add Products to PO</h4>
          <select class="form-input" id="po-product-add">
            <option value="">-- Choose Item --</option>
          </select>

          <div id="po-cart-container" style="margin-top: 16px;">
            <!-- Cart items go here -->
          </div>
          <button class="btn" id="btn-create-po" style="margin-top: 16px;" disabled><i data-lucide="truck" style="width:16px;"></i> Create PO</button>
        </div>

        <div class="glass-card">
          <h3>Active Purchase Orders</h3>
          <div class="table-container">
            <table>
              <thead><tr><th>PO ID</th><th>Vendor</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody id="po-list-body">
                <tr><td colspan="5">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();
    bindEvents();
    loadData();
  };

  const loadData = async () => {
    try {
      [vendors, products, pos] = await Promise.all([
        api.get('/vendors'),
        api.get('/products'),
        api.get('/purchases')
      ]);

      const vendorSelect = document.getElementById('po-vendor');
      vendorSelect.innerHTML = '<option value="">-- Select Vendor --</option>';
      vendors.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        vendorSelect.appendChild(opt);
      });

      const prodSelect = document.getElementById('po-product-add');
      prodSelect.innerHTML = '<option value="">-- Choose Item --</option>';
      products.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        prodSelect.appendChild(opt);
      });

      renderPOList();
    } catch(err) {
      alert("Error loading purchases data");
    }
  };

  const renderCart = () => {
    const container = document.getElementById('po-cart-container');
    const btn = document.getElementById('btn-create-po');
    
    if (cart.length === 0) {
      container.innerHTML = '';
      btn.disabled = true;
      return;
    }

    btn.disabled = false;

    container.innerHTML = `
      <div style="display: flex; gap: 8px; margin-bottom: 8px; font-size: 0.8rem; color: var(--text-secondary);">
        <span style="flex: 1;">Product</span>
        <span style="width: 60px; text-align: center;">Qty</span>
        <span style="width: 80px; text-align: right;">Rate (₹)</span>
        <span style="width: 32px;"></span>
      </div>
      ${cart.map(c => `
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
          <span style="flex: 1; font-weight: 500;">${c.name}</span>
          <input type="number" class="form-input po-cart-qty" data-id="${c.id}" placeholder="Qty" style="width: 60px; padding: 4px; text-align: center;" value="${c.qty}">
          <input type="number" class="form-input po-cart-cost" data-id="${c.id}" placeholder="Rate" style="width: 80px; padding: 4px; text-align: right;" value="${c.cost}">
          <button class="btn btn-secondary po-cart-del" data-id="${c.id}" style="padding: 6px; border: none; color: var(--accent-red);"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
        </div>
      `).join('')}
    `;

    lucide.createIcons();

    document.querySelectorAll('.po-cart-qty').forEach(el => {
      el.addEventListener('input', e => {
        const id = parseInt(e.target.dataset.id);
        const item = cart.find(x => x.id === id);
        if(item) item.qty = e.target.value;
      });
    });
    
    document.querySelectorAll('.po-cart-cost').forEach(el => {
      el.addEventListener('input', e => {
        const id = parseInt(e.target.dataset.id);
        const item = cart.find(x => x.id === id);
        if(item) item.cost = e.target.value;
      });
    });

    document.querySelectorAll('.po-cart-del').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = parseInt(e.currentTarget.dataset.id);
        cart = cart.filter(x => x.id !== id);
        renderCart();
      });
    });
  };

  const renderPOList = () => {
    const tbody = document.getElementById('po-list-body');
    if(pos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No active purchase orders</td></tr>`;
      return;
    }

    tbody.innerHTML = pos.map(po => {
      const v = vendors.find(x => x.id === po.vendor_id);
      return `
        <tr>
          <td>PO-${po.id}</td>
          <td>${v ? v.name : 'Unknown'}</td>
          <td>₹${po.total_amount.toFixed(2)}</td>
          <td><span class="badge ${po.status === 'received' ? 'badge-green' : 'badge-blue'}">${po.status}</span></td>
          <td>
            ${po.status === 'pending' ? `
              <button class="btn btn-receive" data-id="${po.id}" style="padding: 4px 8px;">Receive Stock</button>
            ` : `<span style="color:var(--accent-green); display:flex; align-items:center; gap:4px;"><i data-lucide="check-square" style="width:16px;"></i> Received</span>`}
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();

    document.querySelectorAll('.btn-receive').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.target.dataset.id);
        try {
          await api.post(`/purchases/${id}/receive`);
          alert("Stock securely increased! Expense added to Ledger.");
          loadData();
        } catch(err) { alert("Error receiving stock"); }
      });
    });
  };

  const bindEvents = () => {
    document.getElementById('add-vendor-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('vendor-name').value;
      try {
        await api.post('/vendors', { name });
        document.getElementById('vendor-name').value = '';
        loadData();
      } catch(err) { alert("Failed to add vendor"); }
    });

    document.getElementById('po-product-add').addEventListener('change', (e) => {
      const id = parseInt(e.target.value);
      if(!id) return;
      const p = products.find(x => x.id === id);
      if(p && !cart.find(c => c.id === p.id)) {
        cart.push({...p, qty: 1, cost: (p.piece_price || 0) * 0.7});
        renderCart();
      }
      e.target.value = '';
    });

    document.getElementById('btn-create-po').addEventListener('click', async () => {
      const vId = document.getElementById('po-vendor').value;
      if(!vId || cart.length === 0) return alert("Select vendor and add items");

      try {
        await api.post('/purchases', {
          vendor_id: parseInt(vId),
          items: cart.map(c => ({ product_id: c.id, quantity: parseInt(c.qty) || 0, unit_cost: parseFloat(c.cost) || 0 }))
        });
        cart = [];
        renderCart();
        loadData();
      } catch(err) { alert("Error creating PO"); }
    });
  };

  render();
};
