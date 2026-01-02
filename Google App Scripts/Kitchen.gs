function updateKitchenStatus({ orderId, nextStatus }) {
  assertAllowed(nextStatus, ['PREPARING', 'READY']);

  const result = updateOrderById(orderId, {
    'Order Status': nextStatus
  });
  return jsonResponse(result);
}
