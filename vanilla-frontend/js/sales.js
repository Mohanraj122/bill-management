app.routes.sales = async (container) => {
  let products = [];
  let customers = [];
  let selectedCustomerId = '';
  let customerPrices = [];
  let cart = [];
  let includeGst = true;
  let walkInName = '';
  let searchTerm = '';

  const render = () => {
    container.innerHTML = `
      <div class="page-header">
        <h1>Sales Desk (Wholesale POS)</h1>
        <p>Assign billing directly to Customer Profiles. Select Case or Piece pricing seamlessly.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px;">
        <!-- Catalog -->
        <div class="glass-card">
          <h2 style="margin-bottom: 16px;">Catalog Selector</h2>
          
          <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 24px;">
            <label class="form-label">Billing Profile (Customer)</label>
            <select class="form-input" id="sales-customer">
              <option value="">-- Required: Select Customer --</option>
              <option value="walk_in">Walk-in Customer (Default Prices)</option>
            </select>
            <div id="walkin-name-container" style="display: none; margin-top: 12px;">
              <input type="text" class="form-input" id="sales-walkin-name" placeholder="Enter Customer Name (Optional)">
            </div>
            <div id="customer-rule-alert" style="font-size:0.8rem; color:var(--accent-green); margin-top: 4px; display: none;"></div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px;">
            <i data-lucide="search" style="width:18px; color:var(--text-secondary)"></i>
            <input type="text" id="sales-search" placeholder="Quick Search Products..." style="background: transparent; border: none; color: white; width: 100%; outline: none;">
          </div>

          <div id="sales-catalog" style="display: flex; gap: 16px; flex-wrap: wrap; max-height: 500px; overflow-y: auto;">
            Loading catalog...
          </div>
        </div>

        <!-- Cart -->
        <div class="glass-card">
          <h2 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="shopping-cart"></i> Current Draft
          </h2>

          <div id="sales-cart-items" style="min-height: 300px;">
            <div style="color: var(--text-secondary); text-align: center; margin-top: 40px;">Cart is empty</div>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 16px;">
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; cursor: pointer;">
              <input type="checkbox" id="sales-include-gst" checked>
              Add GST to Invoice Ledger
            </label>
            
            <div id="sales-summary"></div>
            
            <button class="btn" id="btn-checkout" style="width: 100%; font-size: 1.1rem; padding: 16px; background: var(--accent-blue); color: white; justify-content: center;">
              Record Wholesale Order
            </button>
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
      [products, customers] = await Promise.all([
        api.get('/products'),
        api.get('/customers')
      ]);
      
      const custSelect = document.getElementById('sales-customer');
      customers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        custSelect.appendChild(opt);
      });

      renderCatalog();
    } catch(err) {
      document.getElementById('sales-catalog').innerHTML = `<p style="color:red">Error loading data</p>`;
    }
  };

  const getActivePrice = (product, unitMode) => {
    const rule = customerPrices.find(r => r.product_id === product.id);
    let activePiecePrice = rule ? parseFloat(rule.custom_price) : parseFloat(product.piece_price);
    if(unitMode === 'Case') {
      let calcPrice = rule ? (activePiecePrice * product.pieces_per_case) : parseFloat(product.case_price);
      return Math.round(calcPrice * 100) / 100;
    } else {
      return Math.round(activePiecePrice * 100) / 100;
    }
  };

  const renderCatalog = () => {
    const cat = document.getElementById('sales-catalog');
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    cat.innerHTML = filtered.map(p => {
      const cases = Math.floor(p.stock_quantity / p.pieces_per_case);
      const remainder = p.stock_quantity % p.pieces_per_case;
      return `
        <div class="glass-card catalog-item" data-id="${p.id}" style="flex: 1 1 calc(50% - 16px); cursor: pointer; padding: 16px;">
          <strong>${p.name}</strong>
          <div style="color: var(--accent-blue); font-size: 0.9rem; margin-top: 4px;">
            Piece: ₹${getActivePrice(p, 'Piece')} | Case: ₹${getActivePrice(p, 'Case')}
          </div>
          <div style="font-size: 0.8rem; color: ${p.stock_quantity > 0 ? 'var(--text-secondary)' : 'var(--accent-red)'}">
            Inventory: ${cases} Case${cases !== 1 ? 's' : ''}, ${remainder} Piece${remainder !== 1 ? 's' : ''}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.catalog-item').forEach(el => {
      el.addEventListener('click', () => {
        const pid = parseInt(el.dataset.id);
        const p = products.find(x => x.id === pid);
        if (p) addToCart(p);
      });
    });
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (!existing) {
      cart.push({
        ...product,
        cartQty: 1,
        unitMode: 'Piece',
        cartPrice: getActivePrice(product, 'Piece')
      });
      renderCart();
    }
  };

  const renderCart = () => {
    const cDiv = document.getElementById('sales-cart-items');
    if (cart.length === 0) {
      cDiv.innerHTML = `<div style="color: var(--text-secondary); text-align: center; margin-top: 40px;">Cart is empty</div>`;
    } else {
      cDiv.innerHTML = cart.map(item => {
        const displayQty = parseInt(item.cartQty) || 0;
        const lineTotal = item.cartPrice * displayQty;
        const hasRule = customerPrices.find(r => r.product_id === item.id);
        
        return `
          <div class="glass-card" style="margin-bottom: 12px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${item.name}</strong>
              <span style="font-size: 1.2rem; color: var(--accent-blue); font-weight: bold;">
                ₹${lineTotal.toFixed(2)}
              </span>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 12px; align-items: center;">
              <select class="form-input cart-unit-mode" data-id="${item.id}" style="width: 100px; padding: 4px;">
                <option value="Piece" ${item.unitMode === 'Piece' ? 'selected' : ''}>Pieces</option>
                <option value="Case" ${item.unitMode === 'Case' ? 'selected' : ''}>Cases (x${item.pieces_per_case} pcs)</option>
              </select>

              <div style="display: flex; align-items: center; gap: 4px;">
                <button class="btn btn-secondary cart-dec" data-id="${item.id}" style="padding: 4px; border: none;"><i data-lucide="minus" style="width:14px;"></i></button>
                <input type="number" class="form-input cart-qty" data-id="${item.id}" style="width: 60px; text-align: center; padding: 4px;" value="${item.cartQty}">
                <button class="btn btn-secondary cart-inc" data-id="${item.id}" style="padding: 4px; border: none;"><i data-lucide="plus" style="width:14px;"></i></button>
              </div>

              <button class="btn cart-del" data-id="${item.id}" style="padding: 4px; border: none; background: none; color: var(--accent-red);"><i data-lucide="trash-2" style="width:16px;"></i></button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Final Output Price (per ${item.unitMode}): ₹</span>
              <input type="number" class="form-input cart-price" data-id="${item.id}" style="width: 100px; padding: 4px;" step="0.01" value="${item.cartPrice}">
            </div>
            ${hasRule ? `<div style="font-size:0.75rem; color:var(--accent-green); margin-top:6px;">Customer Special Price Applied</div>` : ''}
          </div>
        `;
      }).join('');
      lucide.createIcons();
      bindCartEvents();
    }
    renderSummary();
  };

  const bindCartEvents = () => {
    document.querySelectorAll('.cart-unit-mode').forEach(el => {
      el.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const item = cart.find(x => x.id === id);
        if(item) {
          item.unitMode = e.target.value;
          item.cartPrice = getActivePrice(item, item.unitMode);
          renderCart();
        }
      });
    });

    document.querySelectorAll('.cart-qty').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = parseInt(e.target.dataset.id);
        const item = cart.find(x => x.id === id);
        if(item) {
          item.cartQty = e.target.value === '' ? '' : parseInt(e.target.value);
          renderSummary();
          // update line total in DOM directly to save re-render or re-render cart
          e.target.closest('.glass-card').querySelector('span[style*="font-size: 1.2rem"]').innerText = `₹${((parseInt(item.cartQty)||0) * item.cartPrice).toFixed(2)}`;
        }
      });
    });

    document.querySelectorAll('.cart-price').forEach(el => {
      el.addEventListener('input', (e) => {
        const id = parseInt(e.target.dataset.id);
        const item = cart.find(x => x.id === id);
        if(item) {
          item.cartPrice = parseFloat(e.target.value) || 0;
          renderSummary();
          e.target.closest('.glass-card').querySelector('span[style*="font-size: 1.2rem"]').innerText = `₹${((parseInt(item.cartQty)||0) * item.cartPrice).toFixed(2)}`;
        }
      });
    });

    document.querySelectorAll('.cart-inc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const item = cart.find(x => x.id === id);
        if(item) { item.cartQty = (parseInt(item.cartQty)||0) + 1; renderCart(); }
      });
    });

    document.querySelectorAll('.cart-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const item = cart.find(x => x.id === id);
        if(item) { item.cartQty = Math.max(1, (parseInt(item.cartQty)||0) - 1); renderCart(); }
      });
    });

    document.querySelectorAll('.cart-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        cart = cart.filter(x => x.id !== id);
        renderCart();
      });
    });
  };

  const renderSummary = () => {
    let subtotal = 0;
    let gstTotal = 0;
    cart.forEach(item => {
      const qty = parseInt(item.cartQty) || 0;
      const lineTotal = item.cartPrice * qty;
      subtotal += lineTotal;
      if (includeGst) gstTotal += lineTotal * item.tax_rate;
    });

    const sumDiv = document.getElementById('sales-summary');
    sumDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--text-secondary);">
        <span>Subtotal:</span>
        <span>₹${subtotal.toFixed(2)}</span>
      </div>
      ${includeGst ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--text-secondary);">
          <span>GST (${cart.length ? (cart[0].tax_rate * 100).toFixed(0) : 0}% average):</span>
          <span>₹${gstTotal.toFixed(2)}</span>
        </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: bold; margin-bottom: 24px;">
        <span>Net Total:</span>
        <span>₹${(subtotal + (includeGst ? gstTotal : 0)).toFixed(2)}</span>
      </div>
    `;
  };

  const bindEvents = () => {
    document.getElementById('sales-customer').addEventListener('change', async (e) => {
      selectedCustomerId = e.target.value;
      const wDiv = document.getElementById('walkin-name-container');
      const rDiv = document.getElementById('customer-rule-alert');
      
      if(selectedCustomerId === 'walk_in') {
        wDiv.style.display = 'block';
        rDiv.style.display = 'none';
        customerPrices = [];
      } else if (selectedCustomerId) {
        wDiv.style.display = 'none';
        try {
          customerPrices = await api.get(`/customers/${selectedCustomerId}/prices`);
          if(customerPrices.length > 0) {
            rDiv.style.display = 'block';
            rDiv.innerText = `Auto-applying ${customerPrices.length} custom price rules for this profile.`;
          } else {
            rDiv.style.display = 'none';
          }
        } catch(err) { customerPrices = []; }
      } else {
        wDiv.style.display = 'none';
        rDiv.style.display = 'none';
        customerPrices = [];
      }
      // Re-evaluate cart prices
      cart.forEach(item => {
        item.cartPrice = getActivePrice(item, item.unitMode);
      });
      renderCatalog();
      renderCart();
    });

    document.getElementById('sales-walkin-name').addEventListener('input', e => walkInName = e.target.value);
    
    document.getElementById('sales-search').addEventListener('input', e => {
      searchTerm = e.target.value;
      renderCatalog();
    });

    document.getElementById('sales-include-gst').addEventListener('change', e => {
      includeGst = e.target.checked;
      renderSummary();
    });

    document.getElementById('btn-checkout').addEventListener('click', async () => {
      if (!selectedCustomerId || cart.length === 0) return alert('Select Customer and Items');
      
      const items = cart.map(item => {
        let safeQty = parseInt(item.cartQty) || 0;
        let finalQty = item.unitMode === 'Case' ? (safeQty * item.pieces_per_case) : safeQty;
        let calcPiecePrice = item.unitMode === 'Case' ? (item.cartPrice / item.pieces_per_case) : parseFloat(item.cartPrice);
        return { product_id: item.id, quantity: finalQty, unit_price: calcPiecePrice };
      });

      try {
        const parsedId = selectedCustomerId === 'walk_in' ? null : parseInt(selectedCustomerId);
        await api.post('/orders', { customer_id: parsedId, walk_in_name: walkInName, items });
        alert('Order processing complete. Invoice generated.');
        cart = [];
        walkInName = '';
        document.getElementById('sales-walkin-name').value = '';
        renderCart();
        loadData(); // refresh stock
      } catch (err) {
        alert(err.message || 'Error processing sales order');
      }
    });
  };

  render();
};
