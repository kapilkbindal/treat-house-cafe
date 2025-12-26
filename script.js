// Menu data
const menuData = {
    'chai': ['Adrak Chai', 'Pudina Chai', 'Honey Ginger Lemon Tea', 'Masala Chai', 'Kesar Chai'],
    'hot-beverages': ['Hot Cappuccino', 'Chocolate Cappuccino', 'Hot Chocolate'],
    'cold-beverages': ['Cold Coffee', 'Chocolate Shake', 'KitKat Shake', 'Oreo Shake', 'Strawberry Shake', 'Blueberry Shake', 'Vanilla Scotch Shake'],
    'coolers': ['Fresh Lime Soda', 'Masala Lime Soda', 'Virgin Mojito', 'Strawberry Mojito', 'Lemon Mint Ice Tea', 'Peach Ice Tea', 'Watermelon Ice Tea'],
    'soups': ['Vegetable Soup', 'Tomato Soup', 'Sweet Corn Soup'],
    'maggi': ['Plain Maggi', 'Masala Veg Maggi', 'Cheese Masala Maggi'],
    'paratha-poha': ['Aloo Paratha', 'Aloo-Pyaaz Paratha', 'Paneer Paratha', 'Pap-Arazzi Paratha', 'Poha'],
    'sandwiches': ['Grilled Veg', 'Grilled Cheese', 'Grilled Tandoori Paneer', 'Bombay Style', 'Corn & Cheese', 'Baked Cheese Loaded'],
    'burgers': ['Aaloo Tikki', 'Aaloo Tikki Paneer', 'Veggie Crunchy', 'Chilli Garlic Special', 'Jumbo Double Decker'],
    'pastas': ['Red Sauce Pasta', 'White Sauce Pasta', 'Pink Sauce Pasta'],
    'garlic-breads': ['Cheesy Garlic Bread', 'Veg Mix Garlic Bread', 'Jalo-Herbs Garlic Bread'],
    'french-fries': ['Salted Fries', 'Peri-Peri Fries', 'Cheesy PP Fries'],
    'pizzas': ['Classic Margherita', 'OTC Mix Special', 'Peri-Peri Paneer', 'Cheesy Heaven', 'Veg Farm Loaded'],
    'quick-bites': ['Honey Chilli Potato', 'Chilli Paneer', 'Crispy Corn', 'Fried Rice', 'Sauté Vegetables'],
    'noodles': ['Veg Chowmein', 'Hakka Noodles', 'Schezwan Noodles', 'Burnt Garlic Noodles'],
    'momos': ['Veg Steamed Momos', 'Pan Fried Veg Momos', 'Veg Crunchy Momos', 'Cheese Corn Fried Momos'],
    'cheese-toasts': ['Chilli Cheese Toast', 'Jalapeno Cheese Toast'],
    'nachos': ['Nachos with Dip', 'Loaded Cheese Nachos', 'Jalapeno Cheese Nachos']
};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const popup = document.getElementById('menuPopup');
    const popupTitle = document.querySelector('.popup-title');
    const menuItemsContainer = document.querySelector('.menu-items-container');
    const closeBtn = document.querySelector('.close-popup');
    const categoryCards = document.querySelectorAll('.category-card');
    const body = document.body;
    
    // Mobile menu elements
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links a');

    // Function to open popup
    function openPopup(category, title) {
        popupTitle.textContent = title;
        menuItemsContainer.innerHTML = '';
        
        // Add menu items
        const items = menuData[category] || [];
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'menu-item';
            itemElement.innerHTML = `<h4>${item}</h4>`;
            menuItemsContainer.appendChild(itemElement);
        });
        
        // Show popup
        popup.classList.add('active');
        body.style.overflow = 'hidden';
    }

    // Function to close popup
    function closePopup() {
        popup.classList.remove('active');
        body.style.overflow = '';
    }

    // Add click event to category cards
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            const title = this.querySelector('h3').textContent;
            openPopup(category, title);
        });
    });

    // Close popup when clicking close button
    closeBtn.addEventListener('click', closePopup);

    // Close popup when clicking outside content
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            closePopup();
        }
    });

    // Close popup with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePopup();
        }
    });
    
    // Create overlay for menu
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);
    
    // Function to close menu
    function closeMobileMenu() {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        overlay.style.pointerEvents = 'none';
    }

    // Mobile menu toggle
    if (menuToggle && navLinks) {
        // Set initial state
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-controls', 'nav-links');
        menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
        
        // Toggle menu when clicking the menu button
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = !this.classList.contains('active');
            
            if (isOpen) {
                // Close any open popups first
                if (popup) closePopup();
                
                // Open menu
                this.setAttribute('aria-expanded', 'true');
                this.classList.add('active');
                navLinks.classList.add('active');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                overlay.style.pointerEvents = 'auto';
                
                // Focus management for better accessibility
                const firstNavItem = navLinks.querySelector('a');
                if (firstNavItem) firstNavItem.focus();
            } else {
                closeMobileMenu();
            }
        });
        
        // Close menu when clicking on a nav link
        navItems.forEach(item => {
            item.addEventListener('click', closeMobileMenu);
            
            // Add keyboard navigation support
            item.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeMobileMenu();
                    menuToggle.focus();
                }
            });
        });
        
        // Close with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                closeMobileMenu();
                menuToggle.focus();
            }
        });
        
        // Close when clicking outside
        overlay.addEventListener('click', closeMobileMenu);
        
        // Close when clicking outside on mobile
        document.addEventListener('touchstart', function(e) {
            if (navLinks.classList.contains('active') && 
                !navLinks.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        });
    }

    // ===== GALLERY CAROUSEL FUNCTIONALITY =====
    const carouselTrack = document.querySelector('.carousel-track');
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const prevButton = document.querySelector('.carousel-button--left');
    const nextButton = document.querySelector('.carousel-button--right');
    const carouselNav = document.querySelector('.carousel-nav');
    
    let currentSlide = 0;
    let autoplayInterval;
    const autoplayDelay = 5000; // 5 seconds

    if (carouselTrack && carouselSlides.length > 0) {
        // Create indicator dots
        carouselSlides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = 'carousel-indicator';
            dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(index));
            carouselNav.appendChild(dot);
        });

        const indicators = document.querySelectorAll('.carousel-indicator');

        // Function to update carousel position
        function updateCarousel() {
            const slideWidth = carouselSlides[0].clientWidth;
            carouselTrack.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
            
            // Update indicators
            indicators.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        }

        // Function to go to specific slide
        function goToSlide(index) {
            currentSlide = index;
            updateCarousel();
            resetAutoplay();
        }

        // Function to go to next slide
        function nextSlide() {
            currentSlide = (currentSlide + 1) % carouselSlides.length;
            updateCarousel();
        }

        // Function to go to previous slide
        function prevSlide() {
            currentSlide = (currentSlide - 1 + carouselSlides.length) % carouselSlides.length;
            updateCarousel();
        }

        // Event listeners for buttons
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                nextSlide();
                resetAutoplay();
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                prevSlide();
                resetAutoplay();
            });
        }

        // Autoplay functionality
        function startAutoplay() {
            autoplayInterval = setInterval(nextSlide, autoplayDelay);
        }

        function stopAutoplay() {
            clearInterval(autoplayInterval);
        }

        function resetAutoplay() {
            stopAutoplay();
            startAutoplay();
        }

        // Pause autoplay on hover
        const carouselContainer = document.querySelector('.gallery-carousel');
        if (carouselContainer) {
            carouselContainer.addEventListener('mouseenter', stopAutoplay);
            carouselContainer.addEventListener('mouseleave', startAutoplay);
        }

        // Touch/swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        carouselTrack.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoplay();
        });

        carouselTrack.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoplay();
        });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
        }

        // Handle window resize
        window.addEventListener('resize', updateCarousel);

        // Start autoplay
        startAutoplay();
    }

    // ===== BACK TO TOP BUTTON FUNCTIONALITY =====
    const backToTopButton = document.querySelector('.back-to-top');
    
    if (backToTopButton) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        // Smooth scroll to top when clicked
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ===== NEWSLETTER FORM HANDLER =====
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';
    const newsletterForm = document.getElementById('newsletterForm');
    
    if (newsletterForm) {
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const submitButton = newsletterForm.querySelector('button[type="submit"]');
        const buttonText = submitButton.querySelector('.button-text');
        const buttonLoader = submitButton.querySelector('.button-loader');
        const formMessage = newsletterForm.querySelector('.form-message');

        // Function to show message
        function showMessage(message, isError = false) {
            formMessage.textContent = message;
            formMessage.style.display = 'block';
            formMessage.style.color = isError ? '#ff4444' : '#4CAF50';
        }

        // Function to reset form
        function resetForm() {
            if (formMessage) formMessage.style.display = 'none';
            if (buttonText) buttonText.textContent = 'Subscribe';
            if (buttonLoader) buttonLoader.style.display = 'none';
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.querySelector('.button-text').style.display = 'inline';
            }
        }

        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            
            // Validate email
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showMessage('Please enter a valid email address', true);
                return;
            }

            // Update UI
            if (submitButton) {
                submitButton.disabled = true;
                if (buttonText) buttonText.textContent = 'Subscribing...';
                if (buttonLoader) buttonLoader.style.display = 'inline-block';
            }

            try {
                // Using FormData for better compatibility
                const formData = new FormData();
                formData.append('email', email);

                const response = await fetch(WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: formData
                });

                // With no-cors, we can't read the response, so we'll assume success
                showMessage('Thank you for subscribing! We\'ll keep you updated.', false);
                emailInput.value = '';
                
            } catch (error) {
                console.error('Error:', error);
                showMessage('Failed to subscribe. Please try again later.', true);
            } finally {
                resetForm();
            }
        });
    }
});
