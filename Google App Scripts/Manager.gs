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
  // SECURITY: Recalculate total on the server using master price list to prevent tampering.
  const menu = getMenu(); // Fetch master price list
  let serverSubtotal = 0;

  const validatedItems = payload.items.map(clientItem => {
    const menuItem = menu.find(m => m.itemId === clientItem.itemId);
    if (!menuItem) throw new Error(`Invalid item ID in payload: ${clientItem.itemId}`);
    
    // Use server price, not client price
    serverSubtotal += menuItem.price * clientItem.qty;

    return { ...clientItem, price: menuItem.price }; // Return item with correct price
  });

  const result = updateOrderById(payload.orderId, {
    'Items JSON': JSON.stringify(validatedItems),
    'Total': serverSubtotal,
    // Reset final amount logic or keep it simple? 
    // If we change items, the previous Final Amount is invalid.
    // Let's clear payment fields to force re-closing
    'Payment Status': '',
    'Final Amount': '',
    'Discount Amount': ''
  });

  return jsonResponse(result);
}
