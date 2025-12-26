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
});