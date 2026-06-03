import React, { useState, useEffect } from 'react';
import api from '../api';
import { CreditCard, CheckCircle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('storeSettings');
    return saved ? JSON.parse(saved) : {
      storeName: 'YOUR RETAIL STORE',
      storeAddress: 'MAIN MARKET ROAD, CITY, STATE - 123456',
      storePhone: '+91-9876543210',
      storeGstin: '27YOURGSTIN1234Z',
      bankDetails: 'Bank Detail: Canara Bank\nAc/Name: Your Store\nA/c No. : 516014000\nIFSC Code: CNRB0015'
    };
  });

  const saveSettings = () => {
    localStorage.setItem('storeSettings', JSON.stringify(storeSettings));
    alert('Bill Format Profile successfully updated!');
    setShowSettings(false);
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handlePayment = async (invoiceId) => {
    try {
      await api.post(`/invoices/${invoiceId}/pay`);
      alert('Payment successful! Ledger has been updated.');
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error processing payment');
    }
  };

  const fetchInvoiceContext = async (id) => {
    const res = await api.get(`/invoices/${id}/details`);
    return res.data;
  };

  const generateCashInvoice = async (invoiceId) => {
    try {
      const data = await fetchInvoiceContext(invoiceId);
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

        const caseRate = item.unit_price * ppc;
        const pieceRate = item.unit_price;
        const rateStr = ppc > 1 ? `C: ${caseRate.toFixed(2)}\nP: ${pieceRate.toFixed(2)}` : `${pieceRate.toFixed(2)}`;

        return [
          index + 1,
          `${item.product_name} [${item.sku}]`,
          (item.tax_rate * 100).toFixed(0),
          rateStr,
          qtyStr.join(', '),
          item.total_price.toFixed(2)
        ];
      });
      
      autoTable(doc, {
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

  const generateNormalInvoice = async (invoiceId) => {
    try {
      const data = await fetchInvoiceContext(invoiceId);
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const pColor = [70, 70, 160];
      doc.setDrawColor(pColor[0], pColor[1], pColor[2]);
      
      // Outer rect
      doc.rect(10, 10, 190, 277);
      
      // Top Left
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(pColor[0], pColor[1], pColor[2]);
      doc.text("Bought of :", 12, 16);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14).text(storeSettings.storeName, 12, 24);
      doc.setFontSize(9).setFont("helvetica", "normal");
      doc.text(storeSettings.storeAddress, 12, 29);
      doc.text(`Phone: ${storeSettings.storePhone}`, 12, 34);

      // Top Right Box
      doc.setFillColor(pColor[0], pColor[1], pColor[2]);
      doc.rect(130, 10, 70, 10, 'F');
      doc.rect(130, 20, 70, 10);
      doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(12);
      doc.text("CASH / BILL FORM", 165, 17, { align: "center" });
      
      doc.line(10, 40, 200, 40);
      
      // No and Date
      doc.setTextColor(pColor[0], pColor[1], pColor[2]).setFontSize(10);
      doc.setFont("helvetica", "bold").text(`No.: INV-${data.invoice.id}`, 12, 45);
      
      doc.setFontSize(10).text(`Date : ${new Date(data.invoice.created_at).toLocaleDateString()}`, 130, 45);
      
      doc.line(10, 52, 200, 52);
      
      // Sold To
      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.text("Sold to", 12, 57);
      doc.setTextColor(0, 0, 0).setFont("helvetica", "normal");
      doc.text(`M/S  ${data.customer_name}`, 12, 63);
      if(data.customer_phone) doc.text(`Ph: ${data.customer_phone}`, 12, 68);
      
      doc.setDrawColor(pColor[0], pColor[1], pColor[2]);
      doc.line(10, 72, 200, 72);
      doc.line(10, 73, 200, 73); // double line effect

      const tableData = data.items.map((item) => {
        const ppc = item.pieces_per_case || 1;
        const cases = Math.floor(item.quantity / ppc);
        const pieces = item.quantity % ppc;
        let qtyStr = [];
        if(cases > 0) qtyStr.push(`${cases}C`);
        if(pieces > 0) qtyStr.push(`${pieces}P`);
        if(qtyStr.length === 0) qtyStr.push("0P");
        
        const fullRs = Math.floor(item.total_price);
        const paise = Math.round((item.total_price - fullRs) * 100).toString().padStart(2, '0');

        return [
          qtyStr.join(' '),
          `${item.product_name} [${item.sku}]`,
          item.unit_price.toFixed(2),
          fullRs.toString(),
          paise
        ];
      });

      const fullRsTotal = Math.floor(data.invoice.total_amount);
      const paiseTotal = Math.round((data.invoice.total_amount - fullRsTotal) * 100).toString().padStart(2, '0');

      tableData.push([
        { content: 'Thank you!\nE.&O.E.', colSpan: 2, styles: { halign: 'left', fontSize: 7, fontStyle: 'italic', textColor: pColor } },
        { content: 'TOTAL', styles: { halign: 'center', fontStyle: 'bold', valign: 'middle', textColor: pColor } },
        { content: fullRsTotal.toString(), styles: { halign: 'right', fontStyle: 'bold', valign: 'middle' } },
        { content: paiseTotal, styles: { halign: 'center', fontStyle: 'bold', valign: 'middle' } }
      ]);
      
      autoTable(doc, {
        startY: 73,
        head: [
          [
            { content: 'Quantity', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Particulars', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Rate', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Amount', colSpan: 2, styles: { halign: 'center' } }
          ],
          [ 'Rs.', 'P.' ]
        ],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, lineColor: pColor, lineWidth: 0.2 },
        headStyles: { fillColor: [255, 255, 255], textColor: pColor, fontStyle: 'bold', lineColor: pColor },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { halign: 'left' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: 10, right: 10 }
      });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(8).setTextColor(pColor[0], pColor[1], pColor[2]);
      doc.text("v Interest @ 24% p.a. will be charged if it is not paid on presentation.", 12, finalY);
      doc.text("v Goods once sold will not be taken back.", 12, finalY + 5);
      
      doc.setFontSize(10).setTextColor(0, 0, 0);
      doc.text("Signature", 160, finalY + 15);
      
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error(e);
      alert("Error generating Normal PDF");
    }
  };

  const generateRetailInvoice = async (invoiceId) => {
    try {
      const data = await fetchInvoiceContext(invoiceId);
      const doc = new jsPDF('p', 'mm', 'a4');
      
      doc.setFont("helvetica", "bold").setFontSize(18);
      doc.text(storeSettings.storeName.toUpperCase(), 105, 15, { align: "center" });
      doc.setFont("helvetica", "normal").setFontSize(8);
      doc.text(storeSettings.storeAddress, 105, 20, { align: "center" });
      doc.text(`Phone: ${storeSettings.storePhone}`, 105, 24, { align: "center" });
      
      doc.setFont("helvetica", "bold").setFontSize(12);
      doc.text("INVOICE", 105, 30, { align: "center" });
      
      doc.rect(14, 32, 182, 20);
      doc.line(14, 38, 196, 38);
      doc.setFontSize(9).text(`GSTIN : ${storeSettings.storeGstin}`, 105, 36, { align: "center" });
      
      doc.line(125, 38, 125, 52);
      doc.setFont("helvetica", "bold").text(`M/s ${data.customer_name}`, 16, 42);
      if(data.customer_phone) doc.setFont("helvetica", "normal").text(`PH.NO.: ${data.customer_phone}`, 16, 48);
      
      doc.setFont("helvetica", "normal").text(`Invoice No.: INV-${data.invoice.id}`, 127, 42);
      doc.text(`Date : ${new Date(data.invoice.created_at).toLocaleDateString()}`, 127, 46);
      
      const tableData = data.items.map((item, index) => {
        const ppc = item.pieces_per_case || 1;
        const cases = Math.floor(item.quantity / ppc);
        const pieces = item.quantity % ppc;
        let qtyStr = [];
        if(cases > 0) qtyStr.push(`${cases}C`);
        if(pieces > 0) qtyStr.push(`${pieces}P`);
        if(qtyStr.length === 0) qtyStr.push("0P");

        const caseRate = item.unit_price * ppc;
        const pieceRate = item.unit_price;
        const rateStr = ppc > 1 ? `C:${caseRate.toFixed(2)}\nP:${pieceRate.toFixed(2)}` : `${pieceRate.toFixed(2)}`;

        const sgst = (item.total_price * (item.tax_rate/2));
        const cgst = (item.total_price * (item.tax_rate/2));
        const gross = item.total_price + (item.tax_rate * item.total_price);
        return [
          index + 1,
          item.sku,
          item.product_name,
          "STD",
          item.sku,
          qtyStr.join(' '),
          rateStr,
          "0.00",
          sgst.toFixed(2),
          cgst.toFixed(2),
          gross.toFixed(2)
        ]
      });
      
      autoTable(doc, {
        startY: 55,
        head: [['S.', 'PART NO.', 'PART NAME', 'MFR', 'HSN', 'QTY', 'Rate', 'DIS', 'SGST', 'CGST', 'Amount']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
        headStyles: { fillColor: [220, 245, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 2: { halign: 'left' } }
      });
      
      const finalY = doc.lastAutoTable.finalY || 55;
      doc.rect(14, finalY, 182, 25);
      
      doc.line(14, finalY + 12, 196, finalY + 12);
      doc.setFontSize(10).setFont("helvetica", "bold");
      doc.text(`GRAND TOTAL :  Rs ${data.invoice.total_amount.toFixed(2)}`, 130, finalY + 8);
      
      doc.setFontSize(8).setFont("helvetica", "bold").text("Terms & Conditions :-", 16, finalY + 16);
      doc.setFont("helvetica", "normal").setFontSize(7);
      doc.text("Goods once sold will not be taken back or exchanged.\nBills not paid due date will attract 24% interest.\nAll disputes subject to Jurisdiction only.", 16, finalY + 19);
      
      doc.setFontSize(8).text(storeSettings.bankDetails, 16, finalY + 36);
      doc.text("Authorised signatory", 160, finalY + 45);
      
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error(e);
      alert("Error generating Detail PDF");
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Billing & Invoices</h1>
          <p>Manage outstanding invoices and record payments. Payments automatically update the accounting ledger.</p>
        </div>
        <button className="btn" onClick={() => setShowSettings(!showSettings)}>
          {showSettings ? 'Close Settings' : 'Edit Bill Profile'}
        </button>
      </div>

      {showSettings && (
        <div className="glass-card" style={{ marginBottom: '24px', border: '1px solid var(--accent-blue)' }}>
          <h2 style={{ marginBottom: '16px' }}>Invoice Print Profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Store/Business Name</label>
              <input className="form-input" value={storeSettings.storeName} onChange={e=>setStoreSettings({...storeSettings, storeName: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={storeSettings.storePhone} onChange={e=>setStoreSettings({...storeSettings, storePhone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN / Tax ID</label>
              <input className="form-input" value={storeSettings.storeGstin} onChange={e=>setStoreSettings({...storeSettings, storeGstin: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Store Full Address</label>
              <input className="form-input" value={storeSettings.storeAddress} onChange={e=>setStoreSettings({...storeSettings, storeAddress: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Bank Details (Terms/Account No for Retail Bill)</label>
              <textarea className="form-input" rows="4" value={storeSettings.bankDetails} onChange={e=>setStoreSettings({...storeSettings, bankDetails: e.target.value})} />
            </div>
          </div>
          <button className="btn" style={{ marginTop: '16px' }} onClick={saveSettings}>Save Permanent Profile</button>
        </div>
      )}

      <div className="glass-card">
        <div className="table-container">
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
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>INV-{inv.id}</td>
                  <td>ORD-{inv.order_id}</td>
                  <td>{inv.customer_name}</td>
                  <td>₹{inv.total_amount.toFixed(2)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>₹{inv.gst_amount.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${inv.status === 'paid' ? 'badge-green' : 'badge-red'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem', justifyContent: 'center' }} onClick={() => generateCashInvoice(inv.id)}>
                          <FileText size={12} /> View Cash Invoice
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem', justifyContent: 'center' }} onClick={() => generateNormalInvoice(inv.id)}>
                          <FileText size={12} /> View Standard Bill
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px', fontSize: '0.75rem', justifyContent: 'center' }} onClick={() => generateRetailInvoice(inv.id)}>
                          <FileText size={12} /> View Retail Format
                        </button>
                      </div>
                      {inv.status === 'unpaid' ? (
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handlePayment(inv.id)}>
                          <CreditCard size={14} /> Pay
                        </button>
                      ) : (
                        <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          <CheckCircle size={16} /> Paid in full
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No invoices generated yet. Create a sale first!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Billing;
