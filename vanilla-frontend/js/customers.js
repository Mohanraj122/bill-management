app.routes.customers = async (container) => {
  let customers = [];
  let products = [];
  let prices = [];
  let selectedCustomerId = null;

  const render = () => {
    container.innerHTML = `
      <div class="page-header">
        <h1>Customers & Custom Pricing Rules</h1>
        <p>Manage customer profiles and set permanent, auto-applied price rules for them during Sales Checkout.</p>
      </div>

      <div style="display: grid; grid-template-columns: minmax(300px, 1fr) 2fr; gap: 24px;">
        <div class="glass-card">
          <h3>Customer Directory</h3>
          <form id="add-customer-form" style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px;">
            <input class="form-input" id="cust-name" placeholder="Customer Name" required>
            <input class="form-input" id="cust-phone" placeholder="Phone Number (Optional)">
            <button type="submit" class="btn"><i data-lucide="users" style="width:16px;"></i> Add Profile</button>
          </form>

          <div id="customer-list" style="margin-top: 24px;">
            Loading...
          </div>
        </div>

        <div class="glass-card" id="pricing-panel">
          <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
            Select a customer profile to manage their specific pricing rules.
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
      [customers, products] = await Promise.all([
        api.get('/customers'),
        api.get('/products')
      ]);
      renderCustomerList();
    } catch (err) {
      document.getElementById('customer-list').innerHTML = `<p style="color:red">Error loading data.</p>`;
    }
  };

  const loadPrices = async (cxId) => {
    selectedCustomerId = cxId;
    renderCustomerList(); // to update selected UI state
    try {
      prices = await api.get(`/customers/${cxId}/prices`);
      renderPricingPanel();
    } catch (err) {
      alert("Error loading prices");
    }
  };

  const bindEvents = () => {
    document.getElementById('add-customer-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cust-name').value;
      const phone = document.getElementById('cust-phone').value;
      try {
        await api.post('/customers', { name, phone });
        document.getElementById('cust-name').value = '';
        document.getElementById('cust-phone').value = '';
        loadData();
      } catch (err) {
        alert('Failed to add customer');
      }
    });
  };

  const renderCustomerList = () => {
    const list = document.getElementById('customer-list');
    list.innerHTML = customers.map(c => `
      <div class="glass-card cx-item" data-id="${c.id}" style="cursor: pointer; margin-bottom: 8px; padding: 12px; border: ${selectedCustomerId === c.id ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)'}">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>${c.name}</strong>
          <button class="btn btn-secondary cx-delete" data-id="${c.id}" style="padding: 4px; border: none; color: var(--accent-red);">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
          </button>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary)">${c.phone || "No phone"}</div>
      </div>
    `).join('');

    lucide.createIcons();

    document.querySelectorAll('.cx-item').forEach(el => {
      el.addEventListener('click', () => loadPrices(parseInt(el.dataset.id)));
    });

    document.querySelectorAll('.cx-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(e.currentTarget.dataset.id);
        if (window.confirm("Delete customer completely?")) {
          try {
            await api.delete(`/customers/${id}`);
            if (selectedCustomerId === id) {
              selectedCustomerId = null;
              renderPricingPanel();
            }
            loadData();
          } catch (err) {
            alert("Error deleting");
          }
        }
      });
    });
  };

  const renderPricingPanel = () => {
    const panel = document.getElementById('pricing-panel');
    if (!selectedCustomerId) {
      panel.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
          Select a customer profile to manage their specific pricing rules.
        </div>
      `;
      return;
    }

    const c = customers.find(x => x.id === selectedCustomerId);
    
    panel.innerHTML = `
      <h3>Price Rulebook: ${c.name}</h3>
      <p style="color: var(--text-secondary); margin-bottom: 16px;">
        Any product mapped here will automatically override Default Prices (Wholesale/Retail) when generating Sales Bills for this customer.
      </p>

      <form id="pricing-form" style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
        <select class="form-input" id="price-product" required style="flex: 1; min-width: 200px;">
          <option value="">-- Choose Product --</option>
          ${products.map(p => `<option value="${p.id}">${p.name} (Retail: ₹${p.piece_price} / ${p.pieces_per_case || 1} Pcs/Case)</option>`).join('')}
        </select>
        <input type="number" class="form-input" id="price-piece" placeholder="Piece Rate (₹)" step="0.01" required style="width: 120px;">
        <input type="number" class="form-input" id="price-case" placeholder="Case Rate (₹)" step="0.01" required style="width: 120px;">
        <button type="submit" class="btn"><i data-lucide="tag" style="width:16px"></i> Map</button>
      </form>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="padding: 8px; text-align: left;">Product</th>
            <th style="padding: 8px; text-align: left;">Mapped Price</th>
          </tr>
        </thead>
        <tbody>
          ${prices.length === 0 ? `<tr><td colspan="2" style="padding: 16px;">No rules set. Customer pays default retail/wholesale prices.</td></tr>` : ''}
          ${prices.map(pr => {
            const p = products.find(prod => prod.id === pr.product_id);
            const prodName = p?.name || "Unknown";
            const casesRate = (pr.custom_price * (p?.pieces_per_case || 1)).toFixed(2);
            return `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 12px 8px;">${prodName}</td>
                <td style="padding: 12px 8px; color: var(--accent-green); font-weight: bold;">
                  ₹${pr.custom_price.toFixed(2)} / Pc <span style="color: var(--text-secondary); font-weight: normal; font-size: 0.85em;">(₹${casesRate} / Case)</span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    lucide.createIcons();

    const productSelect = document.getElementById('price-product');
    const pieceInput = document.getElementById('price-piece');
    const caseInput = document.getElementById('price-case');

    pieceInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const pid = parseInt(productSelect.value);
      if (!pid || !val) { caseInput.value = ''; return; }
      const p = products.find(x => x.id === pid);
      if (p) caseInput.value = (parseFloat(val) * (p.pieces_per_case || 1)).toFixed(2);
    });

    caseInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const pid = parseInt(productSelect.value);
      if (!pid || !val) { pieceInput.value = ''; return; }
      const p = products.find(x => x.id === pid);
      if (p) pieceInput.value = (parseFloat(val) / (p.pieces_per_case || 1)).toFixed(2);
    });

    productSelect.addEventListener('change', () => {
      pieceInput.value = '';
      caseInput.value = '';
    });

    document.getElementById('pricing-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pid = productSelect.value;
      const piecePrice = pieceInput.value;
      if (!pid || !piecePrice) return;

      try {
        await api.post(`/customers/${selectedCustomerId}/prices`, {
          product_id: parseInt(pid),
          custom_price: parseFloat(piecePrice)
        });
        loadPrices(selectedCustomerId);
      } catch (err) {
        alert("Failed to map price");
      }
    });
  };

  render();
};
