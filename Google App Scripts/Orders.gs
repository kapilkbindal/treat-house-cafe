/**
 * Orders.gs
 * Order creation ONLY (no business logic creep)
 */

function handleCreateOrder(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ordSheet = ss.getSheetByName('Orders');
  const itmSheet = ss.getSheetByName('OrderItems');

  if (!ordSheet || !itmSheet) {
    return jsonResponse({ success: false, message: 'Sheets not found (Orders or OrderItems)' });
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
    const lastRow = ordSheet.getLastRow();
    let maxSeq = 0;

    if (lastRow > 1) {
      // Get all IDs from Column A (skip header)
      const ids = ordSheet.getRange(2, 1, lastRow - 1, 1).getValues();
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
    // New Schema: A-Q (No Items JSON column)
    ordSheet.appendRow([
      orderId,               // A
      now,                   // B
      locationId,            // C
      mode,                  // D
      staffMember,           // E
      customerName,          // F
      mobile,                // G
      address,               // H
      total,                 // I (Was J)
      'OPEN',                // J (Was K)
      'PENDING',             // K (Was L)
      '', '', '', '', '', '' // L-Q
    ]);

    // -------- Append Items to OrderItems Sheet --------
    const itemRows = items.map((item, index) => [
      orderId,
      `${orderId}-${String(index + 1).padStart(3, '0')}`, // Order Item ID (Unique)
      item.itemId,
      item.name,
      item.price,
      item.qty,
      'OPEN'
    ]);

    if (itemRows.length > 0) {
      itmSheet.getRange(itmSheet.getLastRow() + 1, 1, itemRows.length, 7).setValues(itemRows);
    }

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
