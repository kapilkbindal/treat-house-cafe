document.addEventListener('DOMContentLoaded', () => {

    const WEB_APP_URL =
        'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

    const form = document.getElementById('newsletterForm');
    if (!form) return;

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

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage('Please enter a valid email address', true);
            return;
        }

        submitButton.disabled = true;
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'inline-block';
        messageBox.style.display = 'none';

        const formData = new FormData();
        formData.append('email', email);

        fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });

        showMessage('Thank you for subscribing! 🎉');
        emailInput.value = '';

        submitButton.disabled = false;
        buttonText.style.display = 'inline';
        buttonLoader.style.display = 'none';
    });
});
