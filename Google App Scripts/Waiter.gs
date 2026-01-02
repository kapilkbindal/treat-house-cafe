function updateWaiterStatus({ orderId, nextStatus }) {
  assertAllowed(nextStatus, ['SERVED', 'HANDED_OVER']);

  const result = updateOrderById(orderId, {
    'Order Status': nextStatus
  });
  return jsonResponse(result);
}
