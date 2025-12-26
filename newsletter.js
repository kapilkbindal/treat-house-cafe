document.addEventListener('DOMContentLoaded', () => {

    const WEB_APP_URL =
        'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

    const form = document.getElementById('newsletterForm');
    if (!form) return; // safety

    const emailInput = form.querySelector('input[type="email"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonLoader = submitButton.querySelector('.button-loader');
    const messageBox = form.querySelector('.form-message');

    function showMessage(text, isError = false) {
        messageBox.textContent = text;
        messageBox.style.display = 'block';
        messageBox.style.color = isError ? '#ff4444' : '#4CAF50';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage('Please enter a valid email address', true);
            return;
        }

        // UI state
        submitButton.disabled = true;
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'inline-block';
        messageBox.style.display = 'none';

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const text = await response.text();

            // Apps Script wraps JSON in HTML
            const match = text.match(/\{.*\}/);
            const data = match ? JSON.parse(match[0]) : null;

            if (data?.success) {
                showMessage('Thank you for subscribing! 🎉');
                emailInput.value = '';
            } else {
                showMessage(data?.message || 'Subscription failed', true);
            }

        } catch (err) {
            console.error('Newsletter error:', err);
            showMessage('Something went wrong. Please try again.', true);
        } finally {
            submitButton.disabled = false;
            buttonText.style.display = 'inline';
            buttonLoader.style.display = 'none';
        }
    });
});
