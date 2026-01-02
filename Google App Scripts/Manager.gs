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
