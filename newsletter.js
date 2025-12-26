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
