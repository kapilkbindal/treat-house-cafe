/**
 * Central API wrapper
 * Treat House Cafe
 */

const BASE_URL = 'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

const API = {
  /* -------------------------
     GET MENU
     ------------------------- */
  async getMenu() {
    const res = await fetch(`${BASE_URL}?action=menu`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid menu response');
    }
    return data;
  },

  /* -------------------------
     GET LOCATIONS
     ------------------------- */
  async getLocations() {
    const res = await fetch(`${BASE_URL}?action=locations`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid locations response');
    }
    return data;
  },

  /* -------------------------
     CREATE ORDER
     ------------------------- */
  async createOrder(payload) {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await res.json();
  }
};
