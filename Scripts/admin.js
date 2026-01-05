let currentUser = null;

function checkAdminAuth() {
  const stored = sessionStorage.getItem('thc_user');
  if (stored) {
    const user = JSON.parse(stored);
    if (user.role === 'admin') {
      currentUser = user;
      showDashboard();
      return;
    }
  }
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
}

async function adminLogin() {
  const u = document.getElementById('adminUser').value;
  const p = document.getElementById('adminPass').value;
  const err = document.getElementById('loginError');
  const btn = document.querySelector('#loginSection button');

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const res = await API.login(u, p);
    if (res.success && res.user.role === 'admin') {
      sessionStorage.setItem('thc_user', JSON.stringify(res.user));
      location.reload();
    } else {
      err.textContent = res.success ? 'Not an admin account' : res.message;
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

function adminLogout() {
  sessionStorage.removeItem('thc_user');
  location.reload();
}

function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  loadUsers();
}

async function loadUsers() {
  try {
    const users = await API.getUsers();
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.username}</td>
        <td>${u.name}</td>
        <td><span style="background:#e0e7ff; color:#3730a3; padding:4px 10px; border-radius:999px; font-size:0.85em; font-weight:500; text-transform:capitalize">${u.role}</span></td>
        <td>
          <button class="btn-secondary" onclick="openResetModal('${u.username}')" style="font-size:0.8em; padding:6px 12px">Reset</button>
          <button class="btn-primary" onclick="openEditModal('${u.username}', '${u.name}', '${u.role}')" style="font-size:0.8em; padding:6px 12px; margin-left:4px">Edit</button>
          ${u.username !== 'admin' ? `<button class="btn-danger" onclick="deleteUser('${u.username}')" style="font-size:0.8em; padding:6px 12px; margin-left:4px">Delete</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    alert('Failed to load users: ' + e.message);
  }
}

/* MODALS */
function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

function showCreateModal() {
  document.getElementById('createModal').classList.add('active');
}

async function submitCreateUser() {
  const username = document.getElementById('newUsername').value;
  const password = document.getElementById('newPassword').value;
  const name = document.getElementById('newName').value;
  const role = document.getElementById('newRole').value;
  
  if(!username || !password || !name) return alert('All fields required');
  
  await API.createUser({ username, password, name, role });
  closeModals();
  loadUsers();
}

function openEditModal(username, name, role) {
  document.getElementById('editTargetDisplay').textContent = username;
  document.getElementById('editTargetUsername').value = username;
  document.getElementById('editName').value = name;
  document.getElementById('editRole').value = role;
  document.getElementById('editModal').classList.add('active');
}

async function submitEditUser() {
  const targetUsername = document.getElementById('editTargetUsername').value;
  const name = document.getElementById('editName').value;
  const role = document.getElementById('editRole').value;
  
  await API.updateUser({ targetUsername, name, role });
  closeModals();
  loadUsers();
}

let targetResetUser = null;
function openResetModal(username) {
  targetResetUser = username;
  document.getElementById('resetTarget').textContent = username;
  document.getElementById('resetModal').classList.add('active');
}

async function submitResetPassword() {
  const pass = document.getElementById('resetPassword').value;
  if(!pass) return alert('Enter password');
  await API.adminResetPassword(targetResetUser, pass);
  closeModals();
  alert('Password reset successful');
}

async function deleteUser(username) {
  if(confirm(`Delete user ${username}?`)) {
    await API.deleteUser(username);
    loadUsers();
  }
}

checkAdminAuth();