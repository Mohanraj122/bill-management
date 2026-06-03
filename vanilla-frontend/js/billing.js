app.routes.billing = async (container) => {
  let invoices = [];
  let showSettings = false;
  let storeSettings = JSON.parse(localStorage.getItem('storeSettings')) || {
    storeName: 'YOUR RETAIL STORE',
    storeAddress: 'MAIN MARKET ROAD, CITY, STATE - 123456',
    storePhone: '+91-9876543210',
    storeGstin: '27YOURGSTIN1234Z',
    bankDetails: 'Bank Detail: Canara Bank\\nAc/Name: Your Store\\nA/c No. : 516014000\\nIFSC Code: CNRB0015'
  };

  const render = () => {
    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1>Billing & Invoices</h1>
          <p>Manage outstanding invoices and record payments. Payments automatically update the accounting ledger.</p>
        </div>
        <button class="btn" id="btn-toggle-settings">
          ${showSettings ? 'Close Settings' : 'Edit Bill Profile'}
        </button>
      </div>

      <div id="settings-panel" class="glass-card" style="display: ${showSettings ? 'block' : 'none'}; margin-bottom: 24px; border: 1px solid var(--accent-blue);">
        <h2 style="margin-bottom: 16px;">Invoice Print Profile</h2>
        <form id="settings-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">Store/Business Name</label>
            <input class="form-input" id="set-name" value="${storeSettings.storeName}">
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input class="form-input" id="set-phone" value="${storeSettings.storePhone}">
          </div>
          <div class="form-group">
            <label class="form-label">GSTIN / Tax ID</label>
            <input class="form-input" id="set-gstin" value="${storeSettings.storeGstin}">
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Store Full Address</label>
            <input class="form-input" id="set-address" value="${storeSettings.storeAddress}">
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Bank Details (Terms/Account No for Retail Bill)</label>
            <textarea class="form-input" id="set-bank" rows="4">${storeSettings.bankDetails}</textarea>
          </div>
          <button type="submit" class="btn" style="margin-top: 16px; grid-column: span 2;">Save Permanent Profile</button>
        </form>
      </div>

      <div class="glass-card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Order Ref</th>
                <th>Customer Name</th>
                <th>Total Bill</th>
                <th>Included GST</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="invoice-list-body">
              <tr><td colspan="7" style="text-align:center;">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();
    bindEvents();
    fetchInvoices();
  };

  const bindEvents = () => {
    document.getElementById('btn-toggle-settings').addEventListener('click', () => {
      showSettings = !showSettings;
      render();
    });

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        storeSettings = {
          storeName: document.getElementById('set-name').value,
          storePhone: document.getElementById('set-phone').value,
          storeGstin: document.getElementById('set-gstin').value,
          storeAddress: document.getElementById('set-address').value,
          bankDetails: document.getElementById('set-bank').value
        };
        localStorage.setItem('storeSettings', JSON.stringify(storeSettings));
        alert('Bill Format Profile successfully updated!');
        showSettings = false;
        render();
      });
    }
  };

  const fetchInvoices = async () => {
    try {
      invoices = await api.get('/invoices');
      renderTable();
    } catch (err) {
      document.getElementById('invoice-list-body').innerHTML = `<tr><td colspan="7" style="color:red;text-align:center;">Error loading invoices</td></tr>`;
    }
  };

  const renderTable = () => {
    const tbody = document.getElementById('invoice-list-body');
    if(invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px;">No invoices generated yet. Create a sale first!</td></tr>`;
      return;
    }

    tbody.innerHTML = invoices.map(inv => `
      <tr>
        <td style="font-weight: 600;">INV-${inv.id}</td>
        <td>ORD-${inv.order_id}</td>
        <td>${inv.customer_name}</td>
        <td>₹${inv.total_amount.toFixed(2)}</td>
        <td style="color: var(--text-secondary);">₹${inv.gst_amount.toFixed(2)}</td>
        <td>
          <span class="badge ${inv.status === 'paid' ? 'badge-green' : 'badge-red'}">${inv.status}</span>
        </td>
        <td>
          <div style="display: flex; gap: 8px; align-items: center;">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <button class="btn btn-secondary btn-print-cash" data-id="${inv.id}" style="padding: 6px; font-size: 0.75rem; justify-content: center;">
                <i data-lucide="file-text" style="width:12px"></i> View Cash Invoice
              </button>
            </div>
            ${inv.status === 'unpaid' ? `
              <button class="btn btn-pay" data-id="${inv.id}" style="padding: 6px 12px; font-size: 0.8rem;">
                <i data-lucide="credit-card" style="width:14px"></i> Pay
              </button>
            ` : `
              <span style="color: var(--accent-green); display: flex; align-items: center; gap: 4px; font-size: 0.85rem;">
                <i data-lucide="check-circle" style="width:16px"></i> Paid in full
              </span>
            `}
          </div>
        </td>
      </tr>
    `).join('');

    lucide.createIcons();

    document.querySelectorAll('.btn-pay').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        try {
          await api.post(`/invoices/${id}/pay`);
          alert('Payment successful! Ledger has been updated.');
          fetchInvoices();
        } catch(err) { alert('Error processing payment'); }
      });
    });

    document.querySelectorAll('.btn-print-cash').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        generateCashInvoice(id);
      });
    });
  };

  const generateCashInvoice = async (invoiceId) => {
    try {
      const data = await api.get(`/invoices/${invoiceId}/details`);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      doc.setFontSize(16).setFont("helvetica", "bold");
      doc.text("CASH INVOICE", 105, 15, null, null, "center");
      doc.setFontSize(10).setFont("helvetica", "normal");
      doc.text("ORIGINAL", 105, 20, null, null, "center");
      
      doc.text(`Invoice No: INV-${data.invoice.id}`, 160, 15);
      doc.text(`Date: ${new Date(data.invoice.created_at).toLocaleDateString()}`, 160, 20);
      
      doc.setDrawColor(0);
      doc.rect(14, 25, 182, 25);
      doc.line(105, 25, 105, 50);
      
      doc.setFont("helvetica", "bold").text(storeSettings.storeName, 16, 30);
      doc.setFont("helvetica", "normal").text(storeSettings.storeAddress, 16, 35);
      doc.text(`GSTIN: ${storeSettings.storeGstin}`, 16, 40);
      
      doc.setFont("helvetica", "bold").text("To", 108, 30);
      doc.setFont("helvetica", "normal").text(`${data.customer_name}`, 108, 35);
      if(data.customer_phone) doc.text(`Ph: ${data.customer_phone}`, 108, 40);
      
      const tableData = data.items.map((item, index) => {
        const ppc = item.pieces_per_case || 1;
        const cases = Math.floor(item.quantity / ppc);
        const pieces = item.quantity % ppc;
        let qtyStr = [];
        if(cases > 0) qtyStr.push(`${cases} C`);
        if(pieces > 0) qtyStr.push(`${pieces} P`);
        if(qtyStr.length === 0) qtyStr.push("0 P");

        const rateStr = item.unit_price.toFixed(2);
        return [
          index + 1,
          `${item.product_name} [${item.sku}]`,
          (item.tax_rate * 100).toFixed(0),
          rateStr,
          qtyStr.join(', '),
          item.total_price.toFixed(2)
        ];
      });
      
      doc.autoTable({
        startY: 54,
        head: [['Sl.', 'Product Name [HSN]', 'Gst%', 'Rate', 'Qty', 'Total']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
      
      const finalY = doc.lastAutoTable.finalY || 54;
      doc.rect(14, finalY, 182, 20);
      doc.line(140, finalY, 140, finalY + 20);
      
      doc.text(`Items: ${data.items.length}`, 16, finalY + 5);
      doc.setFontSize(8).text("E&OE. Goods once sold cannot be taken back.", 16, finalY + 15);
      
      doc.setFontSize(9);
      const taxable = data.items.reduce((acc, i) => acc + i.total_price, 0);
      doc.text("Total Taxable", 142, finalY + 5);
      doc.text(taxable.toFixed(2), 170, finalY + 5);
      doc.text("Total Tax", 142, finalY + 10);
      doc.text(data.invoice.gst_amount.toFixed(2), 170, finalY + 10);
      
      doc.setFont("helvetica", "bold").setFontSize(12);
      doc.text(`Total: Rs. ${data.invoice.total_amount.toFixed(2)}`, 140, finalY + 30);
      
      doc.setFontSize(10).text("Thank you. Have a great day!", 14, finalY + 45);
      doc.setFont("helvetica", "normal").setFontSize(8).text("Authorized Signatory", 160, finalY + 45);
      
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error(e);
      alert("Error generating PDF");
    }
  };

  render();
};
