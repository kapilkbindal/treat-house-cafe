/**
 * Central API wrapper – Treat House Cafe
 */

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

// This is a "public" key, safe to expose in frontend code. It's just to prevent simple spam.
const PUBLIC_API_KEY = 'your-very-secret-random-string';

function getAuthToken() {
  try {
    const user = JSON.parse(sessionStorage.getItem('thc_user'));
    return user ? user.token : null;
  } catch (e) { return null; }
}

/* ---------------------------------------------------
   SAFE FETCH WRAPPER
--------------------------------------------------- */
async function safeFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  return res.json();
}

/* ---------------------------------------------------
   API OBJECT (SINGLE SOURCE OF TRUTH)
--------------------------------------------------- */
const API = {
  /* -----------------------------
     MENU & LOCATIONS
  ----------------------------- */
  async getMenu() {
    return safeFetch(`${BASE_URL}?action=menu&_t=${Date.now()}`);
  },

  async getLocations() {
    return safeFetch(`${BASE_URL}?action=locations`);
  },

  async getManagerMenu() {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=getManagerMenu&token=${encodeURIComponent(token)}`);
  },

  async updateMenuItem(payload) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=updateMenuItem`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateMenuItem',
        token,
        ...payload
      })
    });
  },

  async batchUpdateMenuItems(updates) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=batchUpdateMenuItems`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'batchUpdateMenuItems',
        token,
        updates
      })
    });
  },

  /* -----------------------------
     ORDERS (UNIFIED – REQUIRED)
  ----------------------------- */
  async getOrders() {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=orders&_t=${Date.now()}&token=${encodeURIComponent(token)}`);
  },

  /* -----------------------------
     ORDER CREATION
  ----------------------------- */
  async placeOrder(payload) {
    return safeFetch(`${BASE_URL}?action=createOrder`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createOrder',
        secret: PUBLIC_API_KEY,
        ...payload
      })
    });
  },

  /* -----------------------------
     ORDER STATUS UPDATE (GENERIC)
  ----------------------------- */
  async updateOrderStatus(orderId, nextStatus, cascade = true) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=updateOrderStatus&orderId=${encodeURIComponent(orderId)}&nextStatus=${encodeURIComponent(nextStatus)}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateOrderStatus',
        orderId,
        nextStatus,
        cascade,
        token
      })
    });
  },

  async updateItemStatus(orderId, orderItemId, nextStatus) {
    const token = getAuthToken();
    // Use safeFetch to ensure sequential processing and avoid race conditions
    return safeFetch(`${BASE_URL}?action=updateItemStatus`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateItemStatus',
        orderId,
        orderItemId,
        nextStatus,
        token
      })
    });
  },

  /* -----------------------------
     MANAGER ACTIONS
  ----------------------------- */
  async closeOrder(payload) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=closeOrder`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'closeOrder',
        ...payload,
        token
      })
    });
  },

  async cancelOrder(orderId, reason = '') {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=cancelOrder&orderId=${encodeURIComponent(orderId)}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'cancelOrder',
        orderId,
        reason,
        token
      })
    });
  },

  async editOrder(orderId, items) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=editOrder`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'editOrder',
        orderId,
        items,
        token
      })
    });
  },

  /* -----------------------------
     NEWSLETTER
  ----------------------------- */
  async subscribeNewsletter(email) {
    return safeFetch(`${BASE_URL}?action=newsletter`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'newsletter',
        secret: PUBLIC_API_KEY,
        email
      })
    });
  },

  /* -----------------------------
     AUTH
  ----------------------------- */
  async login(username, password) {
    return safeFetch(`${BASE_URL}?action=login`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username,
        password
      })
    });
  },

  async logout() {
    const token = getAuthToken();
    if (!token) return;
    return safeFetch(`${BASE_URL}?action=logout`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'logout',
        token
      })
    });
  },

  async changePassword(oldPassword, newPassword) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=changePassword`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'changePassword',
        token,
        oldPassword,
        newPassword
      })
    });
  },

  async adminResetPassword(targetUsername, newPassword) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=adminResetPassword`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'adminResetPassword',
        token,
        targetUsername,
        newPassword
      })
    });
  },

  async getUsers() {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=getUsers&token=${encodeURIComponent(token)}`);
  },

  async createUser(user) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=createUser`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createUser',
        token,
        ...user
      })
    });
  },

  async deleteUser(targetUsername) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=deleteUser`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'deleteUser',
        token,
        targetUsername
      })
    });
  },

  async updateUser(user) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=updateUser`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateUser',
        token,
        ...user
      })
    });
  }
};
