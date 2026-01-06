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

  // Cascade CANCELLED status to items
  const sheet = SpreadsheetApp.getActive().getSheetByName('OrderItems');
  const data = sheet.getDataRange().getValues();
  const ranges = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(orderId).trim()) {
      ranges.push(`G${i + 1}`); // Status is now Column G
    }
  }
  if (ranges.length > 0) {
    sheet.getRangeList(ranges).setValue('CANCELLED');
  }

  return jsonResponse(result);
}

function editOrder(payload) {
  // payload: { orderId, items: [...] }
  const ss = SpreadsheetApp.getActive();
  const ordSheet = ss.getSheetByName('Orders');
  const itmSheet = ss.getSheetByName('OrderItems');

  if (!ordSheet || !itmSheet) {
    return jsonResponse({ success: false, message: 'Database sheets missing' });
  }

  // 1. Calculate New Total
  let newTotal = 0;
  payload.items.forEach(i => newTotal += (i.price * i.qty));

  // 2. Update Total in Orders Sheet
  const result = updateOrderById(payload.orderId, {
    'Total': newTotal,
    // Reset final amount logic or keep it simple? 
    // If we change items, the previous Final Amount is invalid.
    // Let's clear payment fields to force re-closing
    'Payment Status': '',
    'Final Amount': '',
    'Discount Amount': ''
  });

  // 3. Replace Items in OrderItems Sheet
  // Strategy: Delete old rows for this order, append new ones.
  const itmValues = itmSheet.getDataRange().getValues();
  for (let i = itmValues.length - 1; i >= 1; i--) {
    if (String(itmValues[i][0]) === String(payload.orderId)) {
      itmSheet.deleteRow(i + 1);
    }
  }

  const itemRows = payload.items.map((item, index) => [
    payload.orderId, 
    `${payload.orderId}-${String(index + 1).padStart(3, '0')}`, // Generate new Order Item IDs
    item.itemId, item.name, item.price, item.qty, item.status || 'OPEN'
  ]);

  if (itemRows.length > 0) {
    itmSheet.getRange(itmSheet.getLastRow() + 1, 1, itemRows.length, 7).setValues(itemRows);
  }

  return jsonResponse(result);
}
