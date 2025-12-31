const Pricing = {

  calculateSubtotal(items) {
    return items.reduce((s, i) => s + i.qty * i.price, 0);
  },

  calculateDiscount(subtotal, discountPercent, discountAmount) {
    if (discountPercent > 0) {
      return Math.round(subtotal * (discountPercent / 100));
    }
    return Math.min(discountAmount || 0, subtotal);
  },

  calculateFinal(subtotal, discount) {
    return Math.max(subtotal - discount, 0);
  },

  calculate(items, discountPercent = 0, discountAmount = 0) {
    const subtotal = this.calculateSubtotal(items);
    const discount = this.calculateDiscount(subtotal, discountPercent, discountAmount);
    const finalAmount = this.calculateFinal(subtotal, discount);

    return {
      subtotal,
      discount,
      finalAmount
    };
  }
};
