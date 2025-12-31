document.addEventListener('DOMContentLoaded', async () => {

  /* -----------------------------
     URL PARAMS
  ----------------------------- */
  const params = new URLSearchParams(window.location.search);
  const placeFromQR = params.get('place');
  const mode = params.get('mode');

  /* -----------------------------
     DOM ELEMENTS
  ----------------------------- */
  const locationLabel = document.getElementById('locationLabel');
  const locationSelect = document.getElementById('locationSelect');
  const debugInfo = document.getElementById('debugInfo');
  const menuContainer = document.getElementById('menuContainer');

  const cartBar = document.getElementById('cartBar');
  const cartCountEl = document.getElementById('cartCount');
  const cartTotalEl = document.getElementById('cartTotal');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  const customerBox = document.getElementById('customerBox');
  const customerNameInput = document.getElementById('customerName');
  const customerMobileInput = document.getElementById('customerMobile');

  /* -----------------------------
     STATE
  ----------------------------- */
  let resolvedPlaceId = null;
  const cart = {}; // { itemId: { itemId, name, price, qty } }

  /* -----------------------------
     CART UI
  ----------------------------- */
  function updateCartUI() {
    const items = Object.values(cart);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);

    if (count === 0) {
      cartBar.classList.add('hidden');
      cartCountEl.textContent = '0 items';
      cartTotalEl.textContent = '₹0';
      placeOrderBtn.disabled = true;
      return;
    }

    cartBar.classList.remove('hidden');
    cartCountEl.textContent = `${count} item${count > 1 ? 's' : ''}`;
    cartTotalEl.textContent = `₹${total}`;
    placeOrderBtn.disabled = false;
  }

  function changeQty(item, delta) {
    const id = item.itemId;

    if (!cart[id]) {
      cart[id] = { ...item, qty: 0 };
    }

    cart[id].qty += delta;

    if (cart[id].qty <= 0) {
      delete cart[id];
      document.getElementById(`qty-${id}`).textContent = 0;
    } else {
      document.getElementById(`qty-${id}`).textContent = cart[id].qty;
    }

    updateCartUI();
  }

  /* -----------------------------
     LOAD MENU
  ----------------------------- */
  async function loadMenu() {
    menuContainer.innerHTML = '';

    const items = await API.getMenu(); // must return array

    const categories = {};
    items.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = {
          order: item.categoryOrder,
          items: []
        };
      }
      categories[item.category].items.push(item);
    });

    Object.entries(categories)
      .sort((a, b) => a[1].order - b[1].order)
      .forEach(([categoryName, data]) => {

        const section = document.createElement('div');
        section.className = 'menu-category';
        section.innerHTML = `<h2>${categoryName}</h2>`;

        data.items
          .sort((a, b) => a.itemOrder - b.itemOrder)
          .forEach(item => {

            const row = document.createElement('div');
            row.className = 'menu-item';

            row.innerHTML = `
              <span class="menu-item-name">${item.name}</span>
              <div class="menu-item-controls">
                <button class="menu-btn" data-d="-1">–</button>
                <span class="menu-qty" id="qty-${item.itemId}">0</span>
                <button class="menu-btn" data-d="1">+</button>
                <span class="menu-item-price">₹${item.price}</span>
              </div>
            `;

            row.querySelectorAll('.menu-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                changeQty(item, Number(btn.dataset.d));
              });
            });

            section.appendChild(row);
          });

        menuContainer.appendChild(section);
      });
  }

  /* -----------------------------
     SUBMIT ORDER
  ----------------------------- */
  async function submitOrder() {
    if (!resolvedPlaceId || Object.keys(cart).length === 0) {
      alert('Please add items to cart');
      return;
    }

    const items = Object.values(cart).map(i => ({
      itemId: i.itemId,
      name: i.name,
      qty: i.qty,
      price: i.price
    }));

    const total = items.reduce((s, i) => s + i.qty * i.price, 0);

    const payload = {
      action: 'createOrder',
      locationId: resolvedPlaceId,
      mode: placeFromQR ? 'QR' : 'STAFF',
      customerName: customerNameInput.value || '',
      mobile: customerMobileInput.value || '',
      items,
      total
    };

    placeOrderBtn.disabled = true;

    try {
      const result = await API.placeOrder(payload);
      alert(`Order placed! Order ID: ${result.orderId}`);
      location.reload();
    } catch (err) {
      alert(err.message || 'Order failed');
    } finally {
      placeOrderBtn.disabled = false;
    }
  }

  placeOrderBtn.addEventListener('click', submitOrder);

  /* -----------------------------
     QR FLOW
  ----------------------------- */
  if (placeFromQR) {
    resolvedPlaceId = placeFromQR;
    locationLabel.textContent = `Ordering for: ${placeFromQR}`;
    locationSelect.classList.add('hidden');
    customerBox.classList.remove('hidden');
    debugInfo.textContent = `Flow: QR | place=${placeFromQR}`;
    await loadMenu();
    return;
  }

  /* -----------------------------
     STAFF FLOW
  ----------------------------- */
  if (mode === 'staff') {
    locationLabel.textContent = 'Select Location';
    locationSelect.classList.remove('hidden');
    customerBox.classList.remove('hidden');

    const locations = await API.getLocations();

    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.locationId;
      opt.textContent = loc.displayName;
      locationSelect.appendChild(opt);
    });

    locationSelect.addEventListener('change', async () => {
      if (!locationSelect.value) return;

      resolvedPlaceId = locationSelect.value;
      debugInfo.textContent = `Flow: Staff | place=${resolvedPlaceId}`;

      menuContainer.innerHTML = '';
      Object.keys(cart).forEach(k => delete cart[k]);
      updateCartUI();

      await loadMenu();
    });

    debugInfo.textContent = 'Flow: Staff | waiting for location';
    return;
  }

  /* -----------------------------
     INVALID LINK
  ----------------------------- */
  locationLabel.textContent = 'Invalid order link';
});
