/**
 * Central API wrapper – Treat House Cafe
 */

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

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
   API OBJECT
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
     ORDER CREATION
  ----------------------------- */
  async placeOrder(payload) {
    return safeFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createOrder',
        ...payload
      })
    });
  },

  /* -----------------------------
     NEWSLETTER
  ----------------------------- */
  async subscribeNewsletter(email) {
    return safeFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'newsletter',
        email
      })
    });
  },

  /* -----------------------------
     KITCHEN VIEW
  ----------------------------- */
  async getKitchenOrders() {
    return safeFetch(`${BASE_URL}?action=kitchenOrders`);
  },

  async updateKitchenStatus(orderId, nextStatus) {
    return safeFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateKitchenStatus',
        orderId,
        nextStatus
      })
    });
  },

  /* -----------------------------
     MANAGER VIEW
  ----------------------------- */
  async getManagerOrders() {
    return safeFetch(`${BASE_URL}?action=managerOrders`);
  },

  async closeOrder({ orderId, paymentMode, notes }) {
    return safeFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'closeOrder',
        orderId,
        paymentMode,
        notes
      })
    });
  }
};
