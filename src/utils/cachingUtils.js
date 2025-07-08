import crypto from "crypto";
const BASE_URL = process.env.CACHE_API_URL || "http://localhost:3010";

// Generate a hash of the req object
export function generateReqHash(req) {
  const reqString = JSON.stringify(req, null, 0); // Convert to string
  return crypto.createHash("sha256").update(reqString).digest("hex");
}

// Get cached data
export async function getCachedData(key) {
  try {
    const response = await fetch(`${BASE_URL}/cache/${key}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting cached data:", error);
    throw error;
  }
}

// Store data in cache
export async function setCachedData(key, value, ttl = null) {
  try {
    const response = await fetch(`${BASE_URL}/cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, value, ttl }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error setting cached data:", error);
    throw error;
  }
}

// Delete cached data
export async function deleteCachedData(key) {
  try {
    const response = await fetch(`${BASE_URL}/cache/${key}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error deleting cached data:", error);
    throw error;
  }
}

// Get all cache keys
export async function getCacheKeys() {
  try {
    const response = await fetch(`${BASE_URL}/cache/keys`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error getting cache keys:", error);
    throw error;
  }
}

// Clear all cache
export async function clearCache() {
  try {
    const response = await fetch(`${BASE_URL}/cache/clear`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error clearing cache:", error);
    throw error;
  }
}
