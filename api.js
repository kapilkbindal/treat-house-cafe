/**
 * Central API wrapper – Treat House Cafe
 */

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

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
    return safeFetch(`${BASE_URL}?action=menu`);
  },

  async getLocations() {
    return safeFetch(`${BASE_URL}?action=locations`);
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
        ...payload
      })
    });
  },

  /* -----------------------------
     ORDER STATUS UPDATE (GENERIC)
  ----------------------------- */
  async updateOrderStatus(orderId, nextStatus) {
    const token = getAuthToken();
    return safeFetch(`${BASE_URL}?action=updateOrderStatus&orderId=${encodeURIComponent(orderId)}&nextStatus=${encodeURIComponent(nextStatus)}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateOrderStatus',
        orderId,
        nextStatus,
        token
      })
    });
  },

  async updateItemStatus(orderId, itemId, nextStatus) {
    const token = getAuthToken();
    // Fire-and-forget to avoid CORS issues on file:// protocol
    fetch(`${BASE_URL}?action=updateItemStatus`, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'updateItemStatus',
        orderId,
        itemId,
        nextStatus,
        token
      })
    });
    // Immediately return a success promise as we can't read the actual response
    return Promise.resolve({ success: true });
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
