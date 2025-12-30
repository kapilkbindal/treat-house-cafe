document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);

    const placeFromQR = params.get('place');     // e.g. T01
    const mode = params.get('mode');             // staff

    const locationLabel = document.getElementById('locationLabel');
    const locationSelect = document.getElementById('locationSelect');
    const debugInfo = document.getElementById('debugInfo');

    let resolvedPlaceId = null;

    // CASE 1: QR FLOW
    if (placeFromQR) {
        resolvedPlaceId = placeFromQR;

        locationLabel.textContent = `Ordering for: ${placeFromQR}`;
        locationSelect.classList.add('hidden');

        debugInfo.textContent = `Flow: QR | place=${placeFromQR}`;
        return;
    }

    // CASE 2: STAFF FLOW
    if (mode === 'staff') {
        locationLabel.textContent = 'Select Location';
        locationSelect.classList.remove('hidden');

        debugInfo.textContent = 'Flow: Staff (location selectable)';
        return;
    }

    // CASE 3: INVALID ACCESS
    locationLabel.textContent = 'Invalid order link';
    debugInfo.textContent = 'No place or staff mode detected';
});
