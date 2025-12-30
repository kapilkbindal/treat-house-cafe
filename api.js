/**
 * Central API configuration & helpers
 * Treat House Cafe
 */

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec'; // your real URL

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || 'API error');
  }

  return data.data;
}

const API = {
  /* -------------------------
     GET MENU
     ------------------------- */
  async getMenu() {
    return await apiFetch(`${BASE_URL}?action=getMenu`);
  },

  /* -------------------------
     GET LOCATIONS
     ------------------------- */
  async getLocations() {
    return await apiFetch(`${BASE_URL}?action=getLocations`);
  },

  /* -------------------------
     PLACE ORDER
     ------------------------- */
  async placeOrder(payload) {
    const res = await fetch(`${BASE_URL}?action=placeOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Order failed');
    }

    return data;
  }
};
