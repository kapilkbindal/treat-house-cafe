/**
 * Orders.gs
 * Order creation ONLY (no business logic creep)
 */

function handleCreateOrder(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');

  if (!sheet) {
    return jsonResponse({ success: false, message: 'Orders sheet not found' });
  }

  const lock = LockService.getScriptLock();

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

    // Acquire lock to ensure unique ID generation (wait up to 10s)
    if (!lock.tryLock(10000)) {
      throw new Error('Server busy, please try again.');
    }

    // -------- Order ID (ORD-YYYY-MM-DD-XXX) --------
    const now = new Date();
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    const dateStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const prefix = `ORD-${dateStr}-`;

    // Calculate daily sequence by checking existing IDs
    const lastRow = sheet.getLastRow();
    let maxSeq = 0;

    if (lastRow > 1) {
      // Get all IDs from Column A (skip header)
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        const id = String(ids[i][0]);
        if (id.startsWith(prefix)) {
          const parts = id.split('-');
          const seq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
    }
    const orderId = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;

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
  } finally {
    lock.releaseLock();
  }
}
