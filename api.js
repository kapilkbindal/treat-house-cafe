/**
 * Central API wrapper
 * Treat House Cafe
 */

const API = (() => {
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbYfnzEZUouEi1jJ99RovxedzMwBK0X_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

  async function safeFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Network error');
    return res.json();
  }

  return {
    /* -----------------------------
       GET MENU
       ----------------------------- */
    async getMenu() {
      const data = await safeFetch(`${BASE_URL}?action=menu`);
      if (data.success === false) throw new Error(data.message);
      return data;
    },

    /* -----------------------------
       GET LOCATIONS
       ----------------------------- */
    async getLocations() {
      const data = await safeFetch(`${BASE_URL}?action=locations`);
      if (data.success === false) throw new Error(data.message);
      return data;
    },

    /* -----------------------------
       PLACE ORDER
       ----------------------------- */
    async placeOrder(payload) {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // IMPORTANT for Apps Script
        },
        body: JSON.stringify({
          action: 'createOrder',
          ...payload
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Order failed');
      }
      return data;
    }
  };
})();
