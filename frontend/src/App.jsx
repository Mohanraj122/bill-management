import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Receipt, Box, Users, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import Dashboard from './components/Dashboard'
import Products from './components/Products'
import Customers from './components/Customers'
import Sales from './components/Sales'
import Purchases from './components/Purchases'
import Billing from './components/Billing'
import Reports from './components/Reports'
import StaffManagement from './components/StaffManagement'

function App() {
  const role = 'admin';
  const username = 'admin';
  const [privacyMode, setPrivacyMode] = useState(false);

  const handlePrivacyToggle = () => {
    const pinStr = localStorage.getItem('appPin') || '1234';
    const entered = window.prompt(`Enter PIN to ${privacyMode ? 'Unmask' : 'Hide'} Financial Data\n(Default PIN is 1234 - Leave blank to cancel)`);
    if (entered === null || entered === "") return;
    if (entered === pinStr) {
      setPrivacyMode(!privacyMode);
    } else {
      alert("Error: Incorrect PIN.");
    }
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo-container">
            <span style={{fontSize: '28px'}}>🚀</span>
            Antigravity OS
          </div>
          
          <nav>
            <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink to="/products" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Box size={20} />
              Products & Stock
            </NavLink>
            <NavLink to="/customers" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Users size={20} />
              Customers & Prices
            </NavLink>
            <NavLink to="/sales" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <ShoppingCart size={20} />
              Sales Orders
            </NavLink>
            <NavLink to="/purchases" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Package size={20} />
              Purchases (PO)
            </NavLink>
            <NavLink to="/billing" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Receipt size={20} />
              Billing & Invoices
            </NavLink>
            <NavLink to="/reports" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <LayoutDashboard size={20} />
              Profit & Loss (P&L)
            </NavLink>

            {role === 'admin' && (
              <NavLink to="/staff" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <ShieldAlert size={20} />
                Staff Accounts
              </NavLink>
            )}
          </nav>
          
          {/* Privacy Toggle at bottom of sidebar */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="btn" 
              style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center', background: privacyMode ? 'var(--accent-red)' : 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={handlePrivacyToggle}
            >
              {privacyMode ? <><EyeOff size={18}/> Unmask Fin. Data</> : <><Eye size={18}/> Hide Fin. Data</>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard privacyMode={privacyMode} />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/reports" element={<Reports privacyMode={privacyMode} />} />
            {role === 'admin' && <Route path="/staff" element={<StaffManagement />} />}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
