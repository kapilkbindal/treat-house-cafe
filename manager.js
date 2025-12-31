let activeOrder = null;

const container = document.getElementById('orders');
const modal = document.getElementById('closeModal');

async function loadOrders() {
  const res = await API.getManagerOrders();
  const orders = res.orders || [];

  if (!orders.length) {
    container.innerHTML = `<div class="empty">No orders to close</div>`;
    return;
  }

  container.innerHTML = orders.map(renderOrder).join('');
}

function renderOrder(order) {
  const items = order.items.map(
    i => `<li>${i.qty} × ${i.name} — ₹${i.price}</li>`
  ).join('');

  return `
    <div class="order">
      <div class="order-header">
        <div class="order-id">${order.orderId}</div>
        <div class="badge">${order.orderStatus}</div>
      </div>

      <div>📍 ${order.locationId}</div>

      <ul>${items}</ul>

      <div class="subtotal">Subtotal: ₹${order.total}</div>

      <button onclick='openCloseModal(${JSON.stringify(order)})'>
        Close Order
      </button>
    </div>
  `;
}

/* MODAL LOGIC */

function openCloseModal(order) {
  activeOrder = order;

  document.getElementById('mSubtotal').textContent = order.total;
  document.getElementById('mDiscountValue').textContent = '0';
  document.getElementById('mFinal').textContent = order.total;

  document.getElementById('mDiscountPercent').value = '';
  document.getElementById('mDiscountAmount').value = '';
  document.getElementById('mPaymentMode').value = '';

  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
  activeOrder = null;
}

/* CALCULATION LOGIC */

function recalc() {
  const subtotal = activeOrder.total;

  const dpEl = document.getElementById('mDiscountPercent');
  const daEl = document.getElementById('mDiscountAmount');

  const dp = Number(dpEl.value || 0);
  const da = Number(daEl.value || 0);

  let discount = 0;

  if (dp > 0) {
    discount = Math.round(subtotal * dp / 100);
    daEl.value = discount;
  } else if (da > 0) {
    discount = da;
    dpEl.value = Math.round((da / subtotal) * 100);
  }

  const finalAmount = Math.max(0, subtotal - discount);

  document.getElementById('mDiscountValue').textContent = discount;
  document.getElementById('mFinal').textContent = finalAmount;
}

document.getElementById('mDiscountPercent').addEventListener('input', () => {
  document.getElementById('mDiscountAmount').value = '';
  recalc();
});

document.getElementById('mDiscountAmount').addEventListener('input', () => {
  document.getElementById('mDiscountPercent').value = '';
  recalc();
});

/* CONFIRM CLOSE */

async function confirmClose() {
  const dp = Number(document.getElementById('mDiscountPercent').value || 0);
  const da = Number(document.getElementById('mDiscountAmount').value || 0);
  const pm = document.getElementById('mPaymentMode').value;

  if (!pm) {
    alert('Select payment mode');
    return;
  }

  const discount = da || Math.round(activeOrder.total * dp / 100);
  const finalAmount = activeOrder.total - discount;

  await API.closeOrder({
    orderId: activeOrder.orderId,
    discountPercent: dp,
    discountAmount: discount,
    finalAmount,
    paymentMode: pm
  });

  closeModal();
  loadOrders();
}

loadOrders();
setInterval(loadOrders, 15000);
