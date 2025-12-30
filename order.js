document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);

    const placeFromQR = params.get('place');
    const mode = params.get('mode');

    const locationLabel = document.getElementById('locationLabel');
    const locationSelect = document.getElementById('locationSelect');
    const debugInfo = document.getElementById('debugInfo');
    const menuContainer = document.getElementById('menuContainer');

    let resolvedPlaceId = null;

    // ---------- LOAD MENU ----------
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

        // Sort categories
        const sortedCategories = Object.entries(categories)
            .sort((a, b) => a[1].order - b[1].order);

        sortedCategories.forEach(([categoryName, categoryData]) => {
            const section = document.createElement('div');
            section.className = 'menu-category';

            const title = document.createElement('h2');
            title.textContent = categoryName;
            section.appendChild(title);

            categoryData.items
                .sort((a, b) => a.itemOrder - b.itemOrder)
                .forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'menu-item';

                    row.innerHTML = `
                        <span class="menu-item-name">${item.name}</span>
                        <span class="menu-item-price">₹${item.price}</span>
                    `;

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

        try {
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
                await loadMenu();
            });

            debugInfo.textContent = 'Flow: Staff | waiting for location selection';

        } catch (err) {
            locationLabel.textContent = 'Failed to load locations';
            debugInfo.textContent = 'Error loading locations.json';
            console.error(err);
        }

        return;
    }

    // ---------- INVALID ----------
    locationLabel.textContent = 'Invalid order link';
    debugInfo.textContent = 'No place or staff mode detected';
});
