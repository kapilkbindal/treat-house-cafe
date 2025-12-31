/**
 * Central API wrapper – Treat House Cafe
 */

const BASE_URL = 'https://script.google.com/macros/s/AKfycbyfnzEZUouEi1jJ99RovxedzMwBKOX_dEScMCTAETW1vPn89_gRxk2TrIDjt0cmUshicA/exec';

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

const API = {
  async getMenu() {
    return safeFetch(`${BASE_URL}?action=menu`);
  },

  async getLocations() {
    return safeFetch(`${BASE_URL}?action=locations`);
  },

  async placeOrder(payload) {
    return safeFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createOrder',
        ...payload
      })
    });
  },

  async subscribeNewsletter(email) {
    return safeFetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'newsletter',
        email
      })
    });
  }
};
