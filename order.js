document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);

    const placeFromQR = params.get('place');
    const mode = params.get('mode');

    const locationLabel = document.getElementById('locationLabel');
    const locationSelect = document.getElementById('locationSelect');
    const debugInfo = document.getElementById('debugInfo');

    let resolvedPlaceId = null;

    // ---------- QR FLOW ----------
    if (placeFromQR) {
        resolvedPlaceId = placeFromQR;
        locationLabel.textContent = `Ordering for: ${placeFromQR}`;
        locationSelect.classList.add('hidden');
        debugInfo.textContent = `Flow: QR | place=${placeFromQR}`;
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

            locationSelect.addEventListener('change', () => {
                if (!locationSelect.value) return;

                resolvedPlaceId = locationSelect.value;
                debugInfo.textContent = `Flow: Staff | place=${resolvedPlaceId}`;
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
