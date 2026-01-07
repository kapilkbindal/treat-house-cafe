document.addEventListener('DOMContentLoaded', async () => {
  // Inject Page Loader
  const loader = document.createElement('div');
  loader.id = 'pageLoader';
  loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#f8f4e9;z-index:10000;display:flex;justify-content:center;align-items:center;flex-direction:column;transition:opacity 0.3s ease-out;';
  loader.innerHTML = '<div style="width:40px;height:40px;border:4px solid #ccc;border-top-color:#6F4E37;border-radius:50%;animation:spin 0.8s linear infinite;"></div><div style="margin-top:10px;color:#6F4E37;font-weight:bold;">Loading...</div><style>@keyframes spin {to{transform: rotate(360deg);}}</style>';
  document.body.appendChild(loader);

  function hideLoader() {
    loader.style.opacity = '0';
    setTimeout(() => { if(loader.parentNode) loader.parentNode.removeChild(loader); }, 300);
  }

  /* URL PARAMS */
  const params = new URLSearchParams(window.location.search);
  const placeFromQR = params.get('place');
  const mode = params.get('mode');
  const orderIdParam = params.get('orderId');

  /* DOM */
  const locationLabel = document.getElementById('locationLabel');
  const locationSelect = document.getElementById('locationSelect');
  const modeSelect = document.getElementById('modeSelect');
  const debugInfo = document.getElementById('debugInfo');
  const menuContainer = document.getElementById('menuContainer');

  const cartBar = document.getElementById('cartBar');
  const cartTop = document.querySelector('.cart-top');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  const customerBox = document.getElementById('customerBox');
  const customerNameInput = document.getElementById('customerName');
  const customerMobileInput = document.getElementById('customerMobile');
  const customerAddressInput = document.getElementById('customerAddress');

  /* STATE */
  let resolvedPlaceId = null;
  const cart = {}; // { itemId: { itemId, name, price, qty } }
  let existingOrderItems = [];
  let existingOrderMode = '';
  let existingFoodTotal = 0;

  /* CART UI */
  function updateCartUI() {
    const items = Object.values(cart);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

    let total = subtotal;
    let deliveryFee = 0;

    // Check if delivery mode is active (Online or Staff selected Delivery)
    let isDelivery = false;
    if (orderIdParam) {
      isDelivery = (existingOrderMode === 'Delivery');
    } else if (mode === 'online') {
      isDelivery = true;
    } else if (mode === 'staff' && modeSelect && modeSelect.value === 'Delivery') {
      isDelivery = true;
    }

    // Delivery Fee Logic
    if (isDelivery && subtotal < 500 && subtotal > 0) {
      deliveryFee = 50;
      total += deliveryFee;
    }

    // --- EDIT MODE OVERRIDE ---
    if (orderIdParam) {
      // Recalculate totals considering existing items
      const combinedFoodTotal = existingFoodTotal + subtotal; // subtotal here is only new items
      let finalDeliveryFee = 0;
      
      if (isDelivery && combinedFoodTotal < 500 && combinedFoodTotal > 0) {
        finalDeliveryFee = 50;
      }
      
      const grandTotal = combinedFoodTotal + finalDeliveryFee;
      
      // Show cart bar if we have new items OR if we just want to show the total (usually only if new items added)
      // But user might want to see total even if cart empty? The logic below hides if count === 0.
      // Let's keep hiding if cart is empty to avoid clutter, or show if we want.
    }

    // If count is 0, hide bar UNLESS we are in Edit/Add mode (orderIdParam exists)
    // In Add mode, we want to show the "Previous Total" summary even if new cart is empty.
    if (count === 0 && !orderIdParam) {
      cartBar.classList.add('hidden');
      placeOrderBtn.disabled = true;
      return;
    }

    cartBar.classList.remove('hidden');
    
    let breakdownHtml = '';

    if (orderIdParam) {
      // Edit Mode Breakdown
      const combinedFoodTotal = existingFoodTotal + subtotal;
      let finalDeliveryFee = 0;
      if (isDelivery && combinedFoodTotal < 500 && combinedFoodTotal > 0) {
        finalDeliveryFee = 50;
      }
      const grandTotal = combinedFoodTotal + finalDeliveryFee;

      breakdownHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:0.9em; color:#ccc">
          <span>Previous Food Total</span>
          <span>₹${existingFoodTotal}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
          <span>New Items (${count})</span>
          <span>₹${subtotal}</span>
        </div>
        ${finalDeliveryFee > 0 ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; color:#ccc; font-size:0.9em">
          <span>Delivery Fee</span>
          <span>₹${finalDeliveryFee}</span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; font-size:1.1em; border-top:1px dashed #666; padding-top:4px; margin-bottom:8px">
          <span>New Total</span>
          <span>₹${grandTotal}</span>
        </div>
      `;
    } else {
      // Standard Mode Breakdown
      breakdownHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
          <span>Subtotal (${count} items)</span>
          <span>₹${subtotal}</span>
        </div>
        ${deliveryFee > 0 ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; color:#ccc; font-size:0.9em">
          <span>Delivery Charge</span>
          <span>₹${deliveryFee}</span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; font-size:1.1em; border-top:1px dashed #666; padding-top:4px; margin-bottom:8px">
          <span>Total</span>
          <span>₹${total}</span>
        </div>
      `;
    }
    
    cartTop.innerHTML = breakdownHtml;
    cartTop.style.display = 'block';
    
    // In Add Mode, disable button if no NEW items are added
    if (count === 0 && orderIdParam) {
      placeOrderBtn.disabled = true;
    } else {
      placeOrderBtn.disabled = false;
    }
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
    // --- EDIT / ADD ITEMS FLOW ---
    if (orderIdParam) {
      if (Object.keys(cart).length === 0) {
        alert('Please add items to add to the order');
        return;
      }

      const newItems = Object.values(cart).map(i => ({
        itemId: i.itemId,
        name: i.name,
        qty: i.qty,
        price: i.price,
        // Status will be handled by backend or we can default it here.
        // Manager.gs defaults to OPEN if missing, but we want PREPARING if order is active.
        // We'll let the dashboard logic or backend handle status assignment if possible,
        // but Manager.gs editOrder uses `item.status || 'OPEN'`.
        // We should ideally know the order status to set this correctly, but 'OPEN' is a safe default for new items.
      }));

      // Recalculate Delivery Fee for the whole order
      const combinedFoodItems = [...existingOrderItems, ...newItems];
      const combinedTotal = combinedFoodItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
      
      const finalItems = [...combinedFoodItems];
      
      // If Delivery mode, check fee
      if (existingOrderMode === 'Delivery' && combinedTotal < 500) {
        finalItems.push({
          itemId: 'DELIVERY_FEE', name: 'Delivery Fee', qty: 1, price: 50, status: 'OPEN'
        });
      }

      placeOrderBtn.disabled = true;
      placeOrderBtn.textContent = 'Updating...';

      try {
        const result = await API.editOrder(orderIdParam, finalItems);
        if (result.success) {
          alert('Order updated successfully!');
          window.location.href = 'dashboard.html';
        } else {
          alert('Update failed: ' + (result.message || 'Unknown error'));
        }
      } catch (err) {
        alert(err.message || 'Update failed');
      } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Update Order';
      }
      return;
    }

    // --- CREATE NEW ORDER FLOW ---
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
      if (result.success) {
        alert(`Order placed! Order ID: ${result.orderId}`);
        location.reload();
      } else {
        alert('Order failed: ' + (result.message || 'Unknown error'));
      }
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
    hideLoader();
    return;
  }

  /* STAFF FLOW */
  if (mode === 'staff') {
    // Security: Restrict staff mode to dashboard-order.html
    if (!window.location.pathname.includes('dashboard-order.html') && !window.location.pathname.includes('order.html')) {
      window.location.href = '../index.html';
      return;
    }

    // Hide public website elements to maintain "App" feel
    document.querySelectorAll('.navbar, .footer, .hero, header, footer').forEach(el => {
      if (el) el.style.display = 'none';
    });
    document.body.style.paddingTop = '0'; // Reset if navbar was fixed

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

    // --- EDIT ORDER OVERRIDE ---
    if (orderIdParam) {
      locationLabel.textContent = `Adding items to Order #${orderIdParam}`;
      locationSelect.classList.add('hidden');
      modeSelect.classList.add('hidden');
      customerBox.classList.add('hidden'); // Hide editable inputs
      placeOrderBtn.textContent = 'Update Order';

      // Fetch existing order details
      try {
        const orders = await API.getOrders();
        const order = orders.find(o => o['Order ID'] === orderIdParam);
        
        if (order) {
          // Filter out delivery fee from existing items so it doesn't duplicate or show as a "Preparing" item
          existingOrderItems = order.items.filter(i => i.itemId !== 'DELIVERY_FEE');
          existingFoodTotal = existingOrderItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
          existingOrderMode = order['Mode'];
          resolvedPlaceId = order['Location ID']; // Keep existing location
          
          updateCartUI(); // Refresh UI to show previous totals immediately
          
          // Render Order Details as Text
          const detailsContainer = document.createElement('div');
          detailsContainer.style.cssText = 'background:#fff; padding:15px; margin-bottom:20px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); border:1px solid #e2e8f0;';
          
          let detailsHtml = `
            <h3 style="margin-top:0; border-bottom:1px solid #eee; padding-bottom:10px; font-size:1.1em; color:#334155;">Order #${orderIdParam}</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.95em;">
              <div><strong>Customer:</strong><br>${order['Customer Name'] || 'N/A'}</div>
              <div><strong>Mobile:</strong><br>${order['Mobile'] || 'N/A'}</div>
              <div><strong>Mode:</strong><br>${order['Mode']}</div>
              <div><strong>Table/Loc:</strong><br>${order['Location ID']}</div>
          `;
          
          if (order['Address']) {
            detailsHtml += `<div style="grid-column:span 2"><strong>Address:</strong><br>${order['Address']}</div>`;
          }
          
          detailsHtml += `</div>`;
          detailsContainer.innerHTML = detailsHtml;
          
          // Insert details before menu
          menuContainer.parentNode.insertBefore(detailsContainer, menuContainer);

          // Render existing items
          const existingContainer = document.createElement('div');
          existingContainer.style.cssText = 'background:#fff; padding:15px; margin-bottom:20px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05); border:1px solid #e2e8f0;';
          existingContainer.innerHTML = `
            <h3 style="margin-top:0; border-bottom:1px solid #eee; padding-bottom:10px; font-size:1.1em; color:#334155;">
              Existing Items <span style="float:right; font-size:0.9em">₹${existingFoodTotal}</span>
            </h3>`;
          
          existingOrderItems.forEach(i => {
             const row = document.createElement('div');
             row.style.cssText = 'display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f8f8f8; font-size:0.95em;';
             row.innerHTML = `
               <span>${i.name} <small style="color:#666">x${i.qty}</small></span>
               <span style="font-weight:600; font-size:0.85em; padding:2px 6px; background:#f1f5f9; border-radius:4px; color:#334155">${i.status || 'OPEN'}</span>
             `;
             existingContainer.appendChild(row);
          });
          
          menuContainer.parentNode.insertBefore(existingContainer, menuContainer);

          // Force load menu since we have the location now
          await loadMenu();
        }
      } catch (e) {
        console.error('Failed to load order details', e);
        alert('Could not load order details');
      }
    }

    hideLoader();
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
    hideLoader();
    return;
  }

  locationLabel.textContent = 'Invalid order link';
  hideLoader();
});
