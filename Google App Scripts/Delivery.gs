function updateDeliveryStatus({ orderId, nextStatus }) {
  assertAllowed(nextStatus, ['OUT_FOR_DELIVERY', 'DELIVERED']);

  const result = updateOrderById(orderId, {
    'Order Status': nextStatus
  });
  return jsonResponse(result);
}
