/* -----------------------------
   ROLE & STATUS CONFIG
----------------------------- */

const ROLE_TABS = {
  kitchen: ['OPEN', 'PREPARING', 'READY'],
  waiter: ['READY', 'SERVED', 'HANDED_OVER'],
  delivery: ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  manager: [
    'OPEN','PREPARING','READY','SERVED',
    'HANDED_OVER','OUT_FOR_DELIVERY',
    'DELIVERED','CLOSED','CANCELLED'
  ]
};

const STATUS_FLOW = {
  OPEN: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['SERVED','HANDED_OVER','OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  SERVED: [],
  HANDED_OVER: [],
  DELIVERED: [],
};

/* -----------------------------
   INIT
----------------------------- */

let currentUser = null;
let role = 'kitchen'; // Default, will be overwritten by auth

const tabsEl = document.getElementById('tabs');
const container = document.getElementById('orders');

let activeStatus = null;
let allOrders = [];

/* -----------------------------
   UI HELPERS
----------------------------- */

function renderTabs() {
  tabsEl.innerHTML = ROLE_TABS[role]
    .map(s => `<div class="tab ${activeStatus===s?'active':''}" onclick="setStatus('${s}')">${s}</div>`)
    .join('');
}

function setStatus(status) {
  activeStatus = status;
  renderTabs();
  renderOrders();
}

function renderOrders() {
  if (!Array.isArray(allOrders)) {
    console.error('Orders data is not an array:', allOrders);
    container.innerHTML = `<div class="empty">Error loading orders. See console for details.</div>`;
    return;
  }

  const list = allOrders.filter(o => {
    if (o['Order Status'] !== activeStatus) return false;

    // Filter READY orders based on Role & Mode
    if (activeStatus === 'READY') {
      if (role === 'waiter' && o['Mode'] === 'Delivery') return false;
      if (role === 'delivery' && o['Mode'] !== 'Delivery') return false;
    }

    return true;
  });

  if (!list.length) {
    container.innerHTML = `<div class="empty">No orders</div>`;
    return;
  }

  container.innerHTML = list.map(renderOrder).join('');
}

function renderOrder(o) {
  const items = o.items.map(
    i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.price}</td><td>₹${i.qty*i.price}</td></tr>`
  ).join('');

  const actions = getActions(o);

  const addressHtml = o['Address'] ? `<div style="font-size:0.9em; color:#666; margin-top:4px;">🏠 ${o['Address']}</div>` : '';

  return `
    <div class="order" style="border-color: var(--${o['Order Status']})">
      <div class="order-header">
        <div class="order-id">${o['Order ID']}</div>
        <div class="badge" style="background: var(--${o['Order Status']})">
          ${o['Order Status']}
        </div>
      </div>

      <div style="opacity:.85">📍 ${o['Location ID']} • ${o['Mode']}</div>
      ${addressHtml}

      <table>
        <tr><th>Item</th><th>Qty</th><th>₹</th><th>Total</th></tr>
        ${items}
      </table>

      <div style="margin-top:8px;font-weight:800">
        Subtotal: ₹${o['Total']}
      </div>

      <div class="actions">
        ${actions}
      </div>
    </div>
  `;
}

function getActions(o) {
  const status = o['Order Status'];
  let buttons = [];

  if (role === 'kitchen' && status === 'READY') {
    return '';
  }

  if (STATUS_FLOW[status]) {
    let nextStates = STATUS_FLOW[status];

    // Role-based Action Filtering for READY orders
    if (status === 'READY') {
      const mode = o['Mode'];
      let validNext = 'SERVED'; // Default (Dine-in)

      if (mode === 'Takeaway') validNext = 'HANDED_OVER';
      if (mode === 'Delivery') validNext = 'OUT_FOR_DELIVERY';

      nextStates = [validNext];

      // Restrict by Role
      if (role === 'waiter' && validNext === 'OUT_FOR_DELIVERY') nextStates = [];
      if (role === 'delivery' && validNext !== 'OUT_FOR_DELIVERY') nextStates = [];
    }

    nextStates.forEach(next =>
      buttons.push(`<button onclick="updateStatus('${o['Order ID']}', '${next}')">${next}</button>`)
    );
  }

  if (role === 'manager' && status !== 'CANCELLED') {
    buttons.push(`<button onclick="cancelOrder('${o['Order ID']}')" style="background:#ef4444">Cancel</button>`);
    
    if (['SERVED', 'HANDED_OVER', 'DELIVERED'].includes(status)) {
      buttons.push(`<button onclick="openCloseModal('${o['Order ID']}')" style="background:#22c55e">Close</button>`);
    }
  }

  return buttons.join('');
}

/* -----------------------------
   API CALLS
----------------------------- */

async function loadOrders() {
  try {
    const result = await API.getOrders();
    console.log('Loaded orders:', result); // Debug log

    // Security Check: If server says unauthorized, force logout
    if (result && result.success === false && (result.message || '').includes('Unauthorized')) {
      sessionStorage.removeItem('thc_user');
      location.reload();
      return;
    }
    
    // Handle wrapped responses if necessary (e.g. { data: [...] })
    // But assuming the API returns the array directly or we handle it here
    allOrders = Array.isArray(result) ? result : (result.data || []);
    
    if (!Array.isArray(allOrders)) {
        console.warn('API returned unexpected format:', result);
        allOrders = []; // Fallback to empty array to prevent crashes
    }

    if (!activeStatus) {
      activeStatus = ROLE_TABS[role][0];
    }
    renderTabs();
    renderOrders();
  } catch (err) {
    console.error('Failed to load orders:', err);
    container.innerHTML = `<div class="empty" style="color:#ef4444">Failed to connect to server</div>`;
  }
}

window.updateStatus = async function(orderId, nextStatus) {
  try {
    console.log('Sending Update:', { orderId, nextStatus });
    const res = await API.updateOrderStatus(orderId, nextStatus);
    console.log('Update Response:', res);

    if (res && !res.success) {
      throw new Error(res.message || 'Server returned error');
    }

    loadOrders();
  } catch (err) {
    alert('Failed to update status: ' + err.message);
  }
};

window.cancelOrder = async function(orderId) {
  if (!confirm('Cancel this order?')) return;
  await API.cancelOrder(orderId);
  loadOrders();
};

/* -----------------------------
   CLOSE MODAL LOGIC
----------------------------- */
let currentCloseOrderId = null;
let currentSubtotal = 0;

window.openCloseModal = function(orderId) {
  const order = allOrders.find(o => o['Order ID'] === orderId);
  if (!order) return;

  currentCloseOrderId = orderId;
  currentSubtotal = Number(order['Total']) || 0;

  document.getElementById('modalOrderId').textContent = orderId;
  document.getElementById('modalSubtotal').textContent = '₹' + currentSubtotal;
  
  // Reset fields
  document.getElementById('discPercent').value = '';
  document.getElementById('discAmount').value = '';
  document.getElementById('payMode').value = 'Cash';
  
  calculateModal();
  document.getElementById('closeModal').classList.remove('hidden');
};

window.hideCloseModal = function() {
  document.getElementById('closeModal').classList.add('hidden');
  currentCloseOrderId = null;
};

window.onPercentChange = function() {
  const pct = Number(document.getElementById('discPercent').value) || 0;
  const amt = Math.round(currentSubtotal * (pct / 100));
  document.getElementById('discAmount').value = amt > 0 ? amt : '';
  calculateModal();
};

window.onAmountChange = function() {
  document.getElementById('discPercent').value = ''; // Clear percent if manual amount
  calculateModal();
};

function calculateModal() {
  const amt = Number(document.getElementById('discAmount').value) || 0;
  const final = Math.max(currentSubtotal - amt, 0);
  document.getElementById('modalFinal').textContent = '₹' + final;
}

window.submitCloseOrder = async function() {
  if (!currentCloseOrderId) return;

  const discountPercent = Number(document.getElementById('discPercent').value) || 0;
  const discountAmount = Number(document.getElementById('discAmount').value) || 0;
  const paymentMode = document.getElementById('payMode').value;

  // UI Feedback
  const btn = document.querySelector('#closeModal button[onclick="submitCloseOrder()"]');
  const oldText = btn.textContent;
  btn.textContent = 'Processing...';
  btn.disabled = true;

  try {
    await API.closeOrder({
      orderId: currentCloseOrderId,
      subtotal: currentSubtotal,
      discountPercent,
      discountAmount,
      paymentMode
    });
    hideCloseModal();
    loadOrders();
  } catch (err) {
    alert('Failed to close order: ' + err.message);
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
};

/* -----------------------------
   BOOT
----------------------------- */

function checkAuth() {
  const stored = sessionStorage.getItem('thc_user');
  if (!stored) {
    document.getElementById('loginOverlay').classList.remove('hidden');
    return false;
  }
  
  currentUser = JSON.parse(stored);
  role = currentUser.role;
  
  document.getElementById('roleInfo').innerHTML = `
    ${currentUser.name} (${role.toUpperCase()}) 
    <button onclick="window.location.href='order.html?mode=staff'" style="font-size:0.8em; padding:4px 8px; margin-left:8px; background:#22c55e; color:white; border:none; border-radius:4px; cursor:pointer">New Order</button>
    <button onclick="document.getElementById('passwordModal').classList.remove('hidden')" style="font-size:0.8em; padding:4px 8px; margin-left:8px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer">Password</button>
    <button onclick="logout()" style="font-size:0.8em; padding:4px 8px; margin-left:8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer">Logout</button>
  `;
  
  document.getElementById('loginOverlay').classList.add('hidden');
  return true;
}

window.handleLogin = async function() {
  const u = document.getElementById('loginUser').value;
  const p = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  
  try {
    const res = await API.login(u, p);
    if (res.success) {
      sessionStorage.setItem('thc_user', JSON.stringify(res.user));
      location.reload();
    } else {
      err.textContent = res.message;
    }
  } catch (e) {
    err.textContent = e.message;
  }
};

window.logout = async function() {
  await API.logout(); // Invalidate token on server
  sessionStorage.removeItem('thc_user');
  location.reload();
};

window.submitChangePassword = async function() {
  const oldP = document.getElementById('oldPass').value;
  const newP = document.getElementById('newPass').value;
  
  if (!oldP || !newP) return alert('Please fill all fields');
  
  try {
    const res = await API.changePassword(oldP, newP);
    if (res.success) {
      alert('Password updated successfully');
      document.getElementById('passwordModal').classList.add('hidden');
      document.getElementById('oldPass').value = '';
      document.getElementById('newPass').value = '';
    }
  } catch (e) {
    alert(e.message);
  }
};

// Allow Enter key to login
document.getElementById('loginPass').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    handleLogin();
  }
});

if (checkAuth()) {
  loadOrders();
  setInterval(loadOrders, 15000);
}
