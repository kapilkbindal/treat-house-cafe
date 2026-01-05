/* -----------------------------
   ROLE & STATUS CONFIG
----------------------------- */

const ROLE_TABS = {
  kitchen: ['OPEN', 'PREPARING', 'PARTIALLY_READY', 'READY'],
  waiter: ['PARTIALLY_READY', 'READY', 'SERVED', 'HANDED_OVER'],
  delivery: ['PARTIALLY_READY', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  manager: [
    'OPEN','PREPARING','PARTIALLY_READY','READY','SERVED',
    'HANDED_OVER','OUT_FOR_DELIVERY',
    'DELIVERED','CLOSED','CANCELLED'
  ]
};

const STATUS_FLOW = {
  OPEN: ['PREPARING'],
  // PREPARING and PARTIALLY_READY are now handled by item-level checkboxes
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

    // Filter orders based on Role & Mode
    if (role === 'waiter' && o['Mode'] === 'Delivery') return false;
    if (role === 'delivery' && o['Mode'] !== 'Delivery') return false;

    return true;
  });

  if (!list.length) {
    container.innerHTML = `<div class="empty">No orders</div>`;
    return;
  }

  container.innerHTML = list.map(renderOrder).join('');
}

function renderOrder(o) {
  // Separate delivery fee from food items
  const foodItems = o.items.filter(i => i.itemId !== 'DELIVERY_FEE');
  const deliveryItem = o.items.find(i => i.itemId === 'DELIVERY_FEE');
  const deliveryFee = deliveryItem ? (deliveryItem.price * deliveryItem.qty) : 0;
  const subtotal = foodItems.reduce((s, i) => s + i.price * i.qty, 0);

  // Check if all items have the same status
  const firstStatus = foodItems.length > 0 ? (foodItems[0].status || 'OPEN') : null;
  const allSameStatus = foodItems.every(i => (i.status || 'OPEN') === firstStatus);

  const itemsHtml = foodItems.map(i => {
    const iStatus = i.status || 'OPEN';
    let actionBtn = '';
    let statusBadge = '';

    // Status Badge Color
    let statusColor = '#64748b';
    if (iStatus === 'READY') statusColor = '#3b82f6';
    if (iStatus === 'SERVED') statusColor = '#8b5cf6';

    // Only show status badge if it's NOT Open/Preparing AND statuses are mixed
    if (!['OPEN', 'PREPARING'].includes(iStatus) && !allSameStatus) {
      statusBadge = `<span class="item-status" style="background:${statusColor}">${iStatus}</span>`;
    }

    // Item-Level Actions
    // Kitchen can mark items ready only when the order is PREPARING or PARTIALLY_READY
    if ((role === 'kitchen' || role === 'manager') && ['PREPARING', 'PARTIALLY_READY'].includes(o['Order Status'])) {
      // Don't show checkbox if item is already served/handed over
      if (!['SERVED', 'HANDED_OVER'].includes(iStatus)) {
        const isReady = iStatus === 'READY';
        const nextState = isReady ? 'PREPARING' : 'READY'; // Allow un-checking
        actionBtn = `<label style="display:inline-flex; align-items:center; cursor:pointer; margin-left:8px; vertical-align:middle"><input type="checkbox" ${isReady ? 'checked' : ''} onchange="updateItem('${o['Order ID']}', '${i.itemId}', '${nextState}')" style="width:18px; height:18px; accent-color:#22c55e; cursor:pointer; margin:0;"><span style="margin-left:4px; font-size:0.8em; color:#888; font-weight:normal">${isReady ? 'Ready' : 'Mark Ready'}</span></label>`;
      }
    }

    if ((role === 'waiter' || role === 'manager') && iStatus === 'READY') {
      const isTakeaway = o['Mode'] === 'Takeaway';
      const nextState = isTakeaway ? 'HANDED_OVER' : 'SERVED';

      // Dine-in: Allow partial serving (checkboxes). Takeaway: No item-level actions.
      if (!isTakeaway) {
        // Use a checkbox for serving individual items
        const isServed = iStatus === 'SERVED' || iStatus === 'HANDED_OVER';
        actionBtn += `<label style="display:inline-flex; align-items:center; cursor:pointer; margin-left:8px; vertical-align:middle"><input type="checkbox" ${isServed ? 'checked disabled' : ''} onchange="updateItem('${o['Order ID']}', '${i.itemId}', '${nextState}')" style="width:18px; height:18px; accent-color:#8b5cf6; cursor:pointer; margin:0;"><span style="margin-left:4px; font-size:0.8em; color:#888; font-weight:normal">${isServed ? 'Served' : 'Serve'}</span></label>`;
      }
    }

    return `
      <tr>
        <td style="padding:8px 4px">
          ${i.name} ${statusBadge} ${actionBtn}
        </td>
        <td style="text-align:center;padding:8px 4px">${i.qty}</td>
        ${role !== 'kitchen' ? `<td style="text-align:right;padding:8px 4px">₹${i.price}</td>` : ''}
        ${role !== 'kitchen' ? `<td style="text-align:right;padding:8px 4px">₹${i.qty*i.price}</td>` : ''}
      </tr>`;
  }).join('');

  const actions = getActions(o);

  const addressHtml = o['Address'] ? `<div style="font-size:0.9em; color:#666; margin-top:4px;">🏠 ${o['Address']}</div>` : '';

  // Build Totals Footer
  let footerHtml = `
  `;

  if (role !== 'kitchen') {
    footerHtml += `
      <tr style="border-top: 1px solid #334155">
        <td colspan="${role !== 'kitchen' ? 3 : 1}" style="text-align:right; padding:8px 4px; font-weight:600">Subtotal</td>
        <td style="text-align:right; padding:8px 4px; font-weight:600">₹${subtotal}</td>
      </tr>
    `;
    if (deliveryFee > 0) {
      footerHtml += `
        <tr>
          <td colspan="3" style="text-align:right; padding:4px 4px; color:#94a3b8; font-size:0.9em">Delivery Charge</td>
          <td style="text-align:right; padding:4px 4px; color:#94a3b8; font-size:0.9em">₹${deliveryFee}</td>
        </tr>
      `;
    }
    footerHtml += `
      <tr>
        <td colspan="3" style="text-align:right; padding:8px 4px; font-weight:800; font-size:1.1em">Total</td>
        <td style="text-align:right; padding:8px 4px; font-weight:800; font-size:1.1em">₹${o['Total']}</td>
      </tr>
    `;
  }

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

      <table style="width:100%; border-collapse:collapse; margin-top:10px">
        <tr style="border-bottom:1px solid #334155">
          <th style="text-align:left; padding:8px 4px">Item</th>
          <th style="text-align:center; padding:8px 4px">Qty</th>
          ${role !== 'kitchen' ? '<th style="text-align:right; padding:8px 4px">Price</th>' : ''}
          ${role !== 'kitchen' ? '<th style="text-align:right; padding:8px 4px">Total</th>' : ''}
        </tr>
        ${itemsHtml}
        ${footerHtml}
      </table>

      <div class="actions">
        ${actions}
      </div>
    </div>
  `;
}

function getActions(o) {
  const status = o['Order Status'];
  let buttons = [];

  if (role === 'kitchen' && (status === 'READY' || status === 'PARTIALLY_READY')) {
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

    if (status === 'READY') {
      // For waiters, show the special "Serve All" or "Hand Over" button
      if (role === 'waiter' && o['Mode'] !== 'Delivery') {
        const btnLabel = o['Mode'] === 'Takeaway' ? 'Hand Over' : 'Serve All';
        buttons.push(`<button onclick="serveAllReadyItems('${o['Order ID']}')" style="background:#8b5cf6">${btnLabel}</button>`);
      } else {
        // For other roles (Manager, Delivery), use the standard flow
        nextStates.forEach(next =>
          buttons.push(`<button onclick="updateStatus('${o['Order ID']}', '${next}')">${next}</button>`)
        );
      }
    } else {
      // For all other statuses (OPEN, PREPARING, etc.)
      nextStates.forEach(next =>
        buttons.push(`<button onclick="updateStatus('${o['Order ID']}', '${next}')">${next}</button>`)
      );
    }
  }

  if (role === 'manager' && status !== 'CANCELLED') {
    buttons.push(`<button onclick="cancelOrder('${o['Order ID']}')" style="background:#ef4444">Cancel</button>`);
    buttons.push(`<button onclick="openEditOrder('${o['Order ID']}')" style="background:#f59e0b">Edit</button>`);
    
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

window.updateItem = async function(orderId, itemId, nextStatus) {
  try {
    await API.updateItemStatus(orderId, itemId, nextStatus);
    // The API call now returns immediately. We wait a bit for the server to process, then reload.
    setTimeout(loadOrders, 750);
  } catch (err) {
    alert('Failed to update item: ' + err.message);
  }
};

window.serveAllReadyItems = async function(orderId) {
  const order = allOrders.find(o => o['Order ID'] === orderId);
  if (!order) return;

  const nextStatus = order['Mode'] === 'Takeaway' ? 'HANDED_OVER' : 'SERVED';

  // Create a list of promises for all 'READY' items
  const updatePromises = order.items
    .filter(item => item.status === 'READY')
    .map(item => API.updateItemStatus(orderId, item.itemId, nextStatus));

  await Promise.all(updatePromises);
  setTimeout(loadOrders, 750); // Refresh after all updates are likely done
};

window.cancelOrder = async function(orderId) {
  if (!confirm('Cancel this order?')) return;
  await API.cancelOrder(orderId);
  loadOrders();
};

/* -----------------------------
   EDIT ORDER LOGIC
----------------------------- */
let editOrderData = null;

window.openEditOrder = function(orderId) {
  const order = allOrders.find(o => o['Order ID'] === orderId);
  if (!order) return;
  
  // Deep copy items to avoid mutating local state before save
  editOrderData = JSON.parse(JSON.stringify(order));
  document.getElementById('editOrderId').textContent = orderId;
  renderEditItems();
  document.getElementById('editOrderModal').classList.remove('hidden');
};

function renderEditItems() {
  const container = document.getElementById('editItemsList');
  let subtotal = 0;
  
  const html = editOrderData.items.map((item, index) => {
    subtotal += item.price * item.qty;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee">
        <div>
          <div style="font-weight:600">${item.name}</div>
          <div style="font-size:0.8em; color:#666">₹${item.price} x ${item.qty}</div>
        </div>
        <div style="display:flex; gap:8px">
          <button onclick="changeEditQty(${index}, -1)" style="padding:4px 8px; background:#94a3b8">-</button>
          <button onclick="changeEditQty(${index}, 1)" style="padding:4px 8px; background:#94a3b8">+</button>
          <button onclick="removeEditItem(${index})" style="padding:4px 8px; background:#ef4444">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  document.getElementById('editSubtotal').textContent = '₹' + subtotal;
}

window.changeEditQty = function(index, delta) {
  const item = editOrderData.items[index];
  item.qty += delta;
  if (item.qty <= 0) {
    editOrderData.items.splice(index, 1);
  }
  renderEditItems();
};

window.removeEditItem = function(index) {
  if(confirm('Remove this item?')) {
    editOrderData.items.splice(index, 1);
    renderEditItems();
  }
};

window.submitEditOrder = async function() {
  try {
    await API.editOrder(editOrderData['Order ID'], editOrderData.items);
    document.getElementById('editOrderModal').classList.add('hidden');
    loadOrders();
  } catch (err) {
    alert('Failed to save order: ' + err.message);
  }
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
    <button onclick="window.location.href='dashboard-order.html?mode=staff'" style="font-size:0.8em; padding:4px 8px; margin-left:8px; background:#22c55e; color:white; border:none; border-radius:4px; cursor:pointer">New Order</button>
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
