/**
 * Orders.gs
 * Order creation ONLY (no business logic creep)
 */

function handleCreateOrder(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');

  if (!sheet) {
    return jsonResponse({ success: false, message: 'Orders sheet not found' });
  }

  try {
    const {
      locationId,
      mode,
      staffMember = '',
      customerName = '',
      mobile = '',
      address = '',
      items,
      total
    } = payload;

    if (!locationId || !items || items.length === 0 || total == null) {
      return jsonResponse({
        success: false,
        message: 'Invalid order data'
      });
    }

    // -------- Order ID (ORD-YYYY-MM-DD-XXX) --------
    const now = new Date();
    const orderId = `ORD-${Date.now()}`; // Unique timestamp ID

    // -------- Append ONLY creation data --------
    sheet.appendRow([
      orderId,               // A
      now,                   // B
      locationId,            // C
      mode,                  // D
      staffMember,           // E
      customerName,          // F
      mobile,                // G
      address,               // H
      JSON.stringify(items), // I
      total,                 // J
      'OPEN',                // K
      '', '', '', '', '', '', '' // L-R (Payment Status, Discount %, Discount Amt, Final Amt, Pay Mode, Closed At, Notes)
    ]);

    return jsonResponse({ success: true, orderId });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.message
    });
  }
}
