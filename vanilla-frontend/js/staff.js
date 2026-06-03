app.routes.staff = async (container) => {
  if (appState.role !== 'admin') {
    container.innerHTML = `
      <div style="text-align: center; padding: 100px; color: var(--accent-red);">
        <h2>Access Denied</h2>
        <p>You must be an Administrator to manage sub-accounts.</p>
      </div>
    `;
    return;
  }

  let users = [];

  const render = () => {
    container.innerHTML = `
      <div class="page-header">
        <h1>Internal Staff Management</h1>
        <p>Deploy localized sub-accounts to grant strict point-of-sale functionality to your cashiers and warehouse staff.</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
        <div class="glass-card">
          <h3>Issue New Sub-Account</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 16px;">
            A standard staff member cannot access Profit & Loss or create other users.
          </p>
          <form id="staff-form" style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Username</label>
              <input class="form-input" id="staff-username" required>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Mobile Number</label>
              <input class="form-input" id="staff-mobile" placeholder="Optional">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Password</label>
              <input type="password" class="form-input" id="staff-password" required>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Permission Level</label>
              <select class="form-input" id="staff-role">
                <option value="staff">Standard Staff (Restricted)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
            <button type="submit" class="btn" style="margin-top: 8px;">
              <i data-lucide="key-round" style="width:16px;"></i> Mint Credentials
            </button>
          </form>
        </div>

        <div class="glass-card">
          <h3>Active Identities</h3>
          <div class="table-container" style="margin-top: 16px;">
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
              <tbody id="staff-list-body">
                <tr><td colspan="5" style="text-align: center;">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons();
    bindEvents();
    loadUsers();
  };

  const loadUsers = async () => {
    try {
      users = await api.get('/users');
      renderTable();
    } catch (err) {
      document.getElementById('staff-list-body').innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading users</td></tr>`;
    }
  };

  const renderTable = () => {
    const tbody = document.getElementById('staff-list-body');
    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No users deployed.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="font-weight: 600;">${u.username}</td>
        <td>${u.mobile || '-'}</td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}">
            ${u.role.toUpperCase()}
          </span>
        </td>
        <td style="color: var(--text-secondary);">
          ${u.google_id ? 'Google OAuth' : 'Local Encrypted Hash'}
        </td>
        <td>
          <button class="btn btn-secondary btn-del-staff" data-id="${u.id}" style="padding: 6px; color: var(--accent-red);">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i> Revoke
          </button>
        </td>
      </tr>
    `).join('');

    lucide.createIcons();

    document.querySelectorAll('.btn-del-staff').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        if (window.confirm("Delete this internal account completely?")) {
          try {
            await api.delete(`/users/${id}`);
            loadUsers();
          } catch (err) {
            alert("Error deleting user");
          }
        }
      });
    });
  };

  const bindEvents = () => {
    document.getElementById('staff-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        username: document.getElementById('staff-username').value,
        mobile: document.getElementById('staff-mobile').value || undefined,
        password: document.getElementById('staff-password').value,
        role: document.getElementById('staff-role').value
      };

      try {
        await api.post('/users', payload);
        document.getElementById('staff-username').value = '';
        document.getElementById('staff-mobile').value = '';
        document.getElementById('staff-password').value = '';
        document.getElementById('staff-role').value = 'staff';
        loadUsers();
      } catch (err) {
        alert("Error creating sub-account: " + err.message);
      }
    });
  };

  render();
};
