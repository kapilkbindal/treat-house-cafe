document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);

    const placeFromQR = params.get('place');
    const mode = params.get('mode');

    const locationLabel = document.getElementById('locationLabel');
    const locationSelect = document.getElementById('locationSelect');
    const debugInfo = document.getElementById('debugInfo');
    const menuContainer = document.getElementById('menuContainer');

    const cartBar = document.getElementById('cartBar');
    const cartCountEl = document.getElementById('cartCount');
    const cartTotalEl = document.getElementById('cartTotal');

    let resolvedPlaceId = null;
    const cart = {};

    function updateCartUI() {
        const items = Object.values(cart);
        const count = items.reduce((s, i) => s + i.qty, 0);
        const total = items.reduce((s, i) => s + i.qty * i.price, 0);

        if (count === 0) {
            cartBar.classList.add('hidden');
            return;
        }

        cartBar.classList.remove('hidden');
        cartCountEl.textContent = `${count} item${count > 1 ? 's' : ''}`;
        cartTotalEl.textContent = `₹${total}`;
    }

    function changeQty(item, delta) {
        if (!cart[item.id]) {
            cart[item.id] = { ...item, qty: 0 };
        }

        cart[item.id].qty += delta;

        if (cart[item.id].qty <= 0) {
            delete cart[item.id];
        }

        document.getElementById(`qty-${item.id}`).textContent =
            cart[item.id]?.qty || 0;

        updateCartUI();
    }

    async function loadMenu() {
        const res = await fetch('/menu.json');
        const items = await res.json();

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
                                <button class="menu-btn" data-id="${item.id}" data-d="-1">–</button>
                                <span class="menu-qty" id="qty-${item.id}">0</span>
                                <button class="menu-btn" data-id="${item.id}" data-d="1">+</button>
                                <span class="menu-item-price">₹${item.price}</span>
                            </div>
                        `;

                        row.addEventListener('click', e => {
                            if (!e.target.dataset.id) return;
                            changeQty(item, Number(e.target.dataset.d));
                        });

                        section.appendChild(row);
                    });

                menuContainer.appendChild(section);
            });
    }

    // ---------- QR FLOW ----------
    if (placeFromQR) {
        resolvedPlaceId = placeFromQR;
        locationLabel.textContent = `Ordering for: ${placeFromQR}`;
        locationSelect.classList.add('hidden');
        debugInfo.textContent = `Flow: QR | place=${placeFromQR}`;
        await loadMenu();
        return;
    }

    // ---------- STAFF FLOW ----------
    if (mode === 'staff') {
        locationLabel.textContent = 'Select Location';
        locationSelect.classList.remove('hidden');

        const res = await fetch('/locations.json');
        const locations = await res.json();

        locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.id;
            opt.textContent = loc.name;
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

    locationLabel.textContent = 'Invalid order link';
});
