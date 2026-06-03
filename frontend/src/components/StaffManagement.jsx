import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, Trash2, KeyRound } from 'lucide-react';

function StaffManagement() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState('staff');
  
  const roleType = localStorage.getItem('role');

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (roleType === 'admin') loadUsers();
  }, [roleType]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', { username, password, role, mobile: mobile || undefined });
      setUsername('');
      setPassword('');
      setMobile('');
      setRole('staff');
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Error creating sub-account");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this internal account completely?")) return;
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Error deleting");
    }
  };

  if (roleType !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--accent-red)' }}>
        <h2>Access Denied</h2>
        <p>You must be logged in via the Master Google Account to manage sub-accounts.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Internal Staff Management</h1>
        <p>Deploy localized sub-accounts to grant strict point-of-sale functionality to your cashiers and warehouse staff.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="glass-card">
          <h3>Issue New Sub-Account</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
            A standard staff member cannot access Profit & Loss or create other users.
          </p>
          <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Username</label>
              <input className="form-input" value={username} onChange={e=>setUsername(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mobile Number</label>
              <input className="form-input" placeholder="Optional" value={mobile} onChange={e=>setMobile(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Permission Level</label>
              <select className="form-input" value={role} onChange={e=>setRole(e.target.value)}>
                <option value="staff">Standard Staff (Restricted)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
            <button className="btn" style={{ marginTop: '8px' }}>
              <KeyRound size={16} /> Mint Credentials
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h3>Active Identities</h3>
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Username / Email</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Auth Vector</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>{u.mobile || '-'}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {u.google_id ? 'Google OAuth' : 'Local Encrypted Hash'}
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--accent-red)' }} onClick={() => handleDelete(u.id)}>
                        <Trash2 size={14} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>No users deployed.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default StaffManagement;
