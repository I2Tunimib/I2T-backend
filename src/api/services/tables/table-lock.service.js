// In-memory table editing locks
// Map<tableId, { userId: string, timestamp: number }>
const tableEditLocks = new Map();
const LOCK_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes

const acquireTableLock = (tableId, userId) => {
  const now = Date.now();
  console.log(
    `[LOCK] Attempting to acquire lock for table ${tableId} by user ${userId}`,
  );
  const existing = tableEditLocks.get(tableId);
  // Release lock if it's expired
  if (existing && now - existing.timestamp > LOCK_TIMEOUT_MS) {
    console.log(`[LOCK] Expired lock found for table ${tableId}, removing`);
    tableEditLocks.delete(tableId);
  }
  // Check if table is locked by someone else
  const currentLock = tableEditLocks.get(tableId);
  if (currentLock && String(currentLock.userId) !== String(userId)) {
    console.log(
      `[LOCK] Table ${tableId} is locked by user ${currentLock.userId}, denying access to ${userId}`,
    );
    return {
      acquired: false,
      lockedBy: currentLock.userId,
      since: currentLock.timestamp,
    };
  }
  // Acquire or refresh lock
  console.log(`[LOCK] Lock acquired for table ${tableId} by user ${userId}`);
  tableEditLocks.set(tableId, { userId: String(userId), timestamp: now });
  console.log(
    `[LOCK] Current locks: ${JSON.stringify([...tableEditLocks.entries()])}`,
  );
  return { acquired: true };
};

const releaseTableLock = (tableId, userId) => {
  console.log(
    `[LOCK] Attempting to release lock for table ${tableId} by user ${userId}`,
  );
  const lock = tableEditLocks.get(tableId);
  if (lock) {
    console.log(`[LOCK] Found lock: owned by ${lock.userId}`);
    if (String(lock.userId) === String(userId)) {
      console.log(
        `[LOCK] Lock released for table ${tableId} by user ${userId}`,
      );
      tableEditLocks.delete(tableId);
      console.log(
        `[LOCK] Current locks: ${JSON.stringify([...tableEditLocks.entries()])}`,
      );
      return true;
    } else {
      console.log(
        `[LOCK] Cannot release: lock owned by ${lock.userId}, not ${userId}`,
      );
      return false;
    }
  } else {
    console.log(`[LOCK] No lock found for table ${tableId}`);
    return false;
  }
};

const getTableLock = (tableId) => {
  const now = Date.now();
  const lock = tableEditLocks.get(tableId);
  console.log(
    `[LOCK] Getting lock for table ${tableId}: ${lock ? `locked by ${lock.userId}` : "no lock"}`,
  );
  // Clean up expired locks
  if (lock && now - lock.timestamp > LOCK_TIMEOUT_MS) {
    console.log(`[LOCK] Lock expired for table ${tableId}, removing`);
    tableEditLocks.delete(tableId);
    return null;
  }
  return lock || null;
};

export default {
  acquireTableLock,
  releaseTableLock,
  getTableLock,
};
