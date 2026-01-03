document.addEventListener('DOMContentLoaded', async () => {

  /* URL PARAMS */
  const params = new URLSearchParams(window.location.search);
  const placeFromQR = params.get('place');
  const mode = params.get('mode');

  /* DOM */
  const locationLabel = document.getElementById('locationLabel');
  const locationSelect = document.getElementById('locationSelect');
  const modeSelect = document.getElementById('modeSelect');
  const debugInfo = document.getElementById('debugInfo');
  const menuContainer = document.getElementById('menuContainer');

  const cartBar = document.getElementById('cartBar');
  const cartCountEl = document.getElementById('cartCount');
  const cartTotalEl = document.getElementById('cartTotal');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  const customerBox = document.getElementById('customerBox');
  const customerNameInput = document.getElementById('customerName');
  const customerMobileInput = document.getElementById('customerMobile');
  const customerAddressInput = document.getElementById('customerAddress');

  /* STATE */
  let resolvedPlaceId = null;
  const cart = {}; // { itemId: { itemId, name, price, qty } }

  /* CART UI */
  function updateCartUI() {
    const items = Object.values(cart);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

    let total = subtotal;
    let feeText = '';

    // Check if delivery mode is active (Online or Staff selected Delivery)
    let isDelivery = (mode === 'online');
    if (mode === 'staff' && modeSelect && modeSelect.value === 'Delivery') {
      isDelivery = true;
    }

    // Delivery Fee Logic
    if (isDelivery && subtotal < 500 && subtotal > 0) {
      total += 50;
      feeText = ' (+₹50 Delivery)';
    }

    if (count === 0) {
      cartBar.classList.add('hidden');
      cartCountEl.textContent = '0 items';
      cartTotalEl.textContent = '₹0';
      placeOrderBtn.disabled = true;
      return;
    }

    cartBar.classList.remove('hidden');
    cartCountEl.textContent = `${count} item${count > 1 ? 's' : ''}`;
    cartTotalEl.textContent = `₹${total}${feeText}`;
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

  /* LOAD MENU */
  async function loadMenu() {
    menuContainer.innerHTML = '';
    const items = await API.getMenu();

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

  /* SUBMIT ORDER */
  async function submitOrder() {
    if (!resolvedPlaceId || Object.keys(cart).length === 0) {
      alert('Please add items to cart');
      return;
    }

    // Determine mode early for validation
    let selectedMode = 'Dine-in';
    if (placeFromQR) {
      selectedMode = 'Dine-in';
    } else if ((mode === 'staff' || mode === 'online') && modeSelect) {
      selectedMode = modeSelect.value;
    }

    // Validation for Delivery Orders (Online or Staff-Delivery)
    if (selectedMode === 'Delivery') {
      if (!customerNameInput.value.trim()) { alert('Name is required for delivery orders'); return; }
      if (!customerMobileInput.value.trim()) { alert('Mobile is required for delivery orders'); return; }
      if (!customerAddressInput.value.trim()) { alert('Address is required for delivery'); return; }
    }

    const items = Object.values(cart).map(i => ({
      itemId: i.itemId,
      name: i.name,
      qty: i.qty,
      price: i.price
    }));

    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    let total = subtotal;

    // Apply Delivery Fee to Payload
    if (selectedMode === 'Delivery' && subtotal < 500) {
      total += 50;
      // Add fee as a line item so it appears on the receipt/dashboard
      items.push({
        itemId: 'DELIVERY_FEE', name: 'Delivery Fee', qty: 1, price: 50
      });
    }

    let staffMember = '';
    if (mode === 'staff') {
      try {
        const u = JSON.parse(sessionStorage.getItem('thc_user'));
        if (u) staffMember = u.username;
      } catch (e) {}
    }

    const payload = {
      action: 'createOrder',
      locationId: resolvedPlaceId,
      mode: selectedMode,
      staffMember,
      customerName: customerNameInput.value || '',
      mobile: customerMobileInput.value || '',
      address: customerAddressInput.value || '',
      items,
      total: total
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

  /* QR FLOW */
  if (placeFromQR) {
    resolvedPlaceId = placeFromQR;
    locationLabel.textContent = `Ordering for: ${placeFromQR}`;
    locationSelect.classList.add('hidden');
    customerBox.classList.remove('hidden');
    debugInfo.textContent = `Flow: QR`;
    await loadMenu();
    return;
  }

  /* STAFF FLOW */
  if (mode === 'staff') {
    // Security: Restrict staff mode to dashboard-order.html
    if (!window.location.pathname.includes('dashboard-order.html')) {
      window.location.href = 'index.html';
      return;
    }

    // Add Back Button
    const container = document.querySelector('.container');
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Dashboard';
    backBtn.onclick = () => window.location.href = 'dashboard.html';
    backBtn.style.cssText = 'margin-bottom:15px; padding:10px 16px; background:#6F4E37; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600; display:block; font-family:inherit;';
    container.insertBefore(backBtn, container.firstChild);

    locationLabel.textContent = 'Order Details';
    modeSelect.classList.remove('hidden');
    customerBox.classList.remove('hidden');

    const locations = await API.getLocations();
    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.locationId;
      opt.textContent = loc.displayName;
      locationSelect.appendChild(opt);
    });

    const handleModeChange = async () => {
      // Toggle Address Input for Delivery
      if (modeSelect.value === 'Delivery') {
        customerAddressInput.classList.remove('hidden');
      } else {
        customerAddressInput.classList.add('hidden');
      }
      
      updateCartUI(); // Recalculate totals (delivery fee might apply)

      if (modeSelect.value === 'Dine-in') {
        locationSelect.classList.remove('hidden');
        resolvedPlaceId = locationSelect.value || null;
        if (resolvedPlaceId) {
          await loadMenu();
        } else {
          menuContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">Please select a table to view menu</div>';
        }
      } else {
        locationSelect.classList.add('hidden');
        resolvedPlaceId = 'COUNTER';
        await loadMenu();
      }
    };

    modeSelect.addEventListener('change', handleModeChange);
    await handleModeChange();

    locationSelect.addEventListener('change', async () => {
      if (!locationSelect.value) return;
      resolvedPlaceId = locationSelect.value;
      Object.keys(cart).forEach(k => delete cart[k]);
      updateCartUI();
      await loadMenu();
    });

    return;
  }

  /* ONLINE FLOW */
  if (mode === 'online') {
    resolvedPlaceId = 'WEBSITE';
    locationLabel.textContent = 'Web Order';
    locationSelect.classList.add('hidden');
    modeSelect.classList.add('hidden'); // Hide mode dropdown for online users
    customerBox.classList.remove('hidden');
    customerAddressInput.classList.remove('hidden');

    // Make fields look mandatory
    customerNameInput.placeholder = "Your Name (Required)";
    customerMobileInput.placeholder = "Mobile Number (Required)";

    // Force Delivery mode
    if (modeSelect.value === 'Dine-in') modeSelect.value = 'Delivery';

    await loadMenu();
    return;
  }

  locationLabel.textContent = 'Invalid order link';
});
