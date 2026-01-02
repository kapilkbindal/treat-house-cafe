/**
 * Calculations.gs
 * Server-side pricing authority
 */

function validatePricing(items, discountPercent, discountAmount, clientFinal) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  let discount = 0;

  if (discountPercent && discountPercent > 0) {
    discount = Math.round(subtotal * (discountPercent / 100));
  } else if (discountAmount && discountAmount > 0) {
    discount = Math.min(discountAmount, subtotal);
  }

  const finalAmount = Math.max(subtotal - discount, 0);

  if (clientFinal !== undefined && finalAmount !== clientFinal) {
    throw new Error('Pricing mismatch');
  }

  return {
    subtotal,
    discount,
    finalAmount
  };
}

function calculateFinal(subtotal, discountPercent, discountAmount) {
  let discount = 0;

  if (discountPercent && discountPercent > 0) {
    discount = Math.round(subtotal * (discountPercent / 100));
  } else if (discountAmount && discountAmount > 0) {
    discount = Math.min(discountAmount, subtotal);
  }

  const finalAmount = Math.max(subtotal - discount, 0);

  return { subtotal, discount, finalAmount };
}
