function closeOrder(payload) {
  const pricing = calculateFinal(
    payload.subtotal,
    payload.discountPercent,
    payload.discountAmount
  );

  const result = updateOrderById(payload.orderId, {
    'Order Status': 'CLOSED',
    'Payment Status': 'PAID',
    'Discount %': payload.discountPercent || '',
    'Discount Amount': pricing.discount,
    'Final Amount': pricing.finalAmount,
    'Payment Mode': payload.paymentMode,
    'Closed At': new Date()
  });

  return jsonResponse(result);
}

function cancelOrder({ orderId, reason }) {
  const result = updateOrderById(orderId, {
    'Order Status': 'CANCELLED',
    'Notes': reason || ''
  });
  return jsonResponse(result);
}

function editOrder(payload) {
  // payload: { orderId, items: [...] }
  // Recalculate totals based on new items
  const subtotal = payload.items.reduce((s, i) => s + (i.price * i.qty), 0);
  
  // We need to fetch existing discount info to recalculate final
  // For simplicity in this edit flow, we will reset discounts or need to read them first.
  // Better approach: Read current order data to preserve discount % if possible, 
  // but for now let's assume the manager re-applies discounts at close if needed.
  // OR: Just update Subtotal and Items, and let Close Order handle the rest.
  
  // However, we should update the 'Total' column (Subtotal)
  
  const result = updateOrderById(payload.orderId, {
    'Items JSON': JSON.stringify(payload.items),
    'Total': subtotal,
    // Reset final amount logic or keep it simple? 
    // If we change items, the previous Final Amount is invalid.
    // Let's clear payment fields to force re-closing
    'Payment Status': '',
    'Final Amount': '',
    'Discount Amount': ''
  });

  return jsonResponse(result);
}
