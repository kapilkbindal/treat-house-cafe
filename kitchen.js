const container = document.getElementById('orders');

const STATUS_FLOW = {
  OPEN: 'PREPARING',
  PREPARING: 'READY'
};

function renderOrder(order) {
  const nextStatus = STATUS_FLOW[order.orderStatus];

  const itemsHtml = order.items.length
    ? order.items.map(i => `<li>${i.qty} × ${i.name}</li>`).join('')
    : `<li style="opacity:.6">No items</li>`;

  return `
    <div class="order-card status-${order.orderStatus}">
      <div class="order-header">
        <div class="order-id">${order.orderId}</div>
        <span class="status-badge">${order.orderStatus}</span>
      </div>

      <div class="location">📍 ${order.locationId}</div>

      <ul class="items">${itemsHtml}</ul>

      ${nextStatus ? `
        <div class="actions">
          <button class="action-btn"
            onclick="updateStatus('${order.orderId}', '${nextStatus}')">
            Mark ${nextStatus}
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

async function loadOrders() {
  const orders = await API.getKitchenOrders();
  container.innerHTML = orders.map(renderOrder).join('');
}

async function updateStatus(orderId, nextStatus) {
  await API.updateKitchenStatus(orderId, nextStatus);
  loadOrders();
}

loadOrders();
setInterval(loadOrders, 10000);
