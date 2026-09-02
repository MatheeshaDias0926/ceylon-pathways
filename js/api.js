/* ============================================================
   API.JS — Unified Data Access & Real-Time Sync Layer
   Connects Admin Portal & Public Frontend to Backend REST API
   With JWT Authentication & Cloudinary Upload Support
   ============================================================ */

const API_BASE = '/api';
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ceylon-realtime') : null;

/**
 * Normalizes image paths to support Cloudinary URLs, data URIs, and local paths
 */
export function getImageUrl(src) {
  if (!src) return './images/hero/beach.jpg';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  const clean = src.replace(/^\.?\/?images\//, '');
  return `./images/${clean}`;
}
if (typeof window !== 'undefined') {
  window.getImageUrl = getImageUrl;
}

/* ── Auth Token Management ── */
function getAuthToken() {
  return sessionStorage.getItem('ceylon-admin-token') || '';
}

export function setAuthToken(token) {
  sessionStorage.setItem('ceylon-admin-token', token);
}

export function clearAuthToken() {
  sessionStorage.removeItem('ceylon-admin-token');
  sessionStorage.removeItem('ceylon-admin-user');
}

function getAuthHeaders() {
  const token = getAuthToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// Broadcast mutation event to all open browser tabs
export function broadcastChange(type, data) {
  if (syncChannel) {
    syncChannel.postMessage({ type, data, timestamp: Date.now() });
  }
  document.dispatchEvent(new CustomEvent('ceylon-sync', { detail: { type, data } }));
}

// Listen for real-time changes from other tabs
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    document.dispatchEvent(new CustomEvent('ceylon-sync', { detail: event.data }));
  };
}

/* ── Generic Fetch Helper with Fallback ── */
async function fetchAPI(endpoint, fallbackFile, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 401) {
      // Token expired or invalid — clear auth and redirect to login
      clearAuthToken();
      document.dispatchEvent(new CustomEvent('ceylon-auth-expired'));
      throw new Error('Authentication expired');
    }
    throw new Error(`API error ${res.status}`);
  } catch (err) {
    // Graceful fallback to static JSON if running in pure static preview
    if (options.method && options.method !== 'GET') {
      throw err; // Don't silently swallow mutation errors
    }
    if (fallbackFile) {
      const staticRes = await fetch(`./data/${fallbackFile}`);
      return await staticRes.json();
    }
    throw err;
  }
}

/* ── Authenticated Fetch Helper (for mutations) ── */
async function fetchAuthAPI(endpoint, options = {}) {
  const authHeaders = getAuthHeaders();
  if (!authHeaders.Authorization) {
    throw new Error('Not authenticated. Please log in.');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
    ...options
  });

  if (res.status === 401) {
    clearAuthToken();
    document.dispatchEvent(new CustomEvent('ceylon-auth-expired'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `API error ${res.status}`);
  }

  return await res.json();
}

/* ── PACKAGES API ── */
export async function getPackages() {
  return await fetchAPI('/packages', 'packages.json');
}

export async function getPackageById(id) {
  try {
    const res = await fetch(`${API_BASE}/packages/${id}`);
    if (res.ok) return await res.json();
  } catch (e) {}
  const all = await getPackages();
  return all.find(p => p.id === id) || all[0];
}

export async function createPackage(pkgData) {
  const data = await fetchAuthAPI('/packages', {
    method: 'POST',
    body: JSON.stringify(pkgData)
  });
  broadcastChange('package_created', data);
  return data;
}

export async function updatePackage(id, pkgData) {
  const data = await fetchAuthAPI(`/packages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(pkgData)
  });
  broadcastChange('package_updated', data);
  return data;
}

export async function deletePackage(id) {
  const data = await fetchAuthAPI(`/packages/${id}`, {
    method: 'DELETE'
  });
  broadcastChange('package_deleted', { id });
  return data;
}

/* ── VEHICLES API ── */
export async function getVehicles() {
  return await fetchAPI('/vehicles', 'vehicles.json');
}

export async function createVehicle(vehData) {
  const data = await fetchAuthAPI('/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehData)
  });
  broadcastChange('vehicle_created', data);
  return data;
}

export async function updateVehicle(id, vehData) {
  const data = await fetchAuthAPI(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(vehData)
  });
  broadcastChange('vehicle_updated', data);
  return data;
}

export async function deleteVehicle(id) {
  const data = await fetchAuthAPI(`/vehicles/${id}`, {
    method: 'DELETE'
  });
  broadcastChange('vehicle_deleted', { id });
  return data;
}

/* ── DESTINATIONS API ── */
export async function getDestinations() {
  return await fetchAPI('/destinations', 'destinations.json');
}

export async function createDestination(destData) {
  const data = await fetchAuthAPI('/destinations', {
    method: 'POST',
    body: JSON.stringify(destData)
  });
  broadcastChange('destination_created', data);
  return data;
}

export async function updateDestination(id, destData) {
  const data = await fetchAuthAPI(`/destinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(destData)
  });
  broadcastChange('destination_updated', data);
  return data;
}

export async function deleteDestination(id) {
  const data = await fetchAuthAPI(`/destinations/${id}`, {
    method: 'DELETE'
  });
  broadcastChange('destination_deleted', { id });
  return data;
}

/* ── ENQUIRIES & BOOKINGS API ── */
export async function getEnquiries() {
  return await fetchAPI('/enquiries', 'enquiries.json');
}

export async function submitEnquiry(enquiryData) {
  try {
    const res = await fetch(`${API_BASE}/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiryData)
    });
    if (res.ok) {
      const data = await res.json();
      broadcastChange('enquiry_created', data);
      return data;
    }
  } catch (e) {}

  // Fallback to local storage
  const list = JSON.parse(localStorage.getItem('sl-enquiries') || '[]');
  const fallbackItem = {
    id: `ENQ-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toISOString(),
    status: 'new',
    ...enquiryData
  };
  list.unshift(fallbackItem);
  localStorage.setItem('sl-enquiries', JSON.stringify(list));
  broadcastChange('enquiry_created', fallbackItem);
  return fallbackItem;
}

export async function updateEnquiryStatus(id, status, notes) {
  try {
    const data = await fetchAuthAPI(`/enquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    });
    broadcastChange('enquiry_updated', data);
    return data;
  } catch (e) {
    // Fallback local update
    const list = JSON.parse(localStorage.getItem('sl-enquiries') || '[]');
    const item = list.find(x => x.id === id);
    if (item) {
      item.status = status;
      localStorage.setItem('sl-enquiries', JSON.stringify(list));
      broadcastChange('enquiry_updated', item);
    }
    return { id, status };
  }
}

export async function deleteEnquiry(id) {
  try {
    const data = await fetchAuthAPI(`/enquiries/${id}`, {
      method: 'DELETE'
    });
    broadcastChange('enquiry_deleted', { id });
    return data;
  } catch (e) {
    const list = JSON.parse(localStorage.getItem('sl-enquiries') || '[]');
    const filtered = list.filter(x => x.id !== id);
    localStorage.setItem('sl-enquiries', JSON.stringify(filtered));
    broadcastChange('enquiry_deleted', { id });
    return { success: true, id };
  }
}

/* ── TESTIMONIALS API ── */
export async function getTestimonials() {
  return await fetchAPI('/testimonials', 'testimonials.json');
}

export async function createTestimonial(testData) {
  const data = await fetchAuthAPI('/testimonials', {
    method: 'POST',
    body: JSON.stringify(testData)
  });
  broadcastChange('testimonial_created', data);
  return data;
}

export async function updateTestimonial(id, testData) {
  const data = await fetchAuthAPI(`/testimonials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(testData)
  });
  broadcastChange('testimonial_updated', data);
  return data;
}

export async function deleteTestimonial(id) {
  const data = await fetchAuthAPI(`/testimonials/${id}`, {
    method: 'DELETE'
  });
  broadcastChange('testimonial_deleted', { id });
  return data;
}

/* ── STATS & AUTH ── */
export async function getStats() {
  return await fetchAPI('/stats', null);
}

export async function loginAdmin(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Invalid credentials');
  }

  const data = await res.json();

  // Store JWT token and user info
  if (data.token) {
    setAuthToken(data.token);
    sessionStorage.setItem('ceylon-admin-user', JSON.stringify(data.user));
  }

  return data;
}

export async function updateAdminCredentials(currentPassword, newUsername, newPassword) {
  const data = await fetchAuthAPI('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newUsername, newPassword })
  });

  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.user) {
    sessionStorage.setItem('ceylon-admin-user', JSON.stringify(data.user));
  }

  return data;
}

export function logoutAdmin() {
  clearAuthToken();
  sessionStorage.removeItem('ceylon-admin-user');
}

export function isAuthenticated() {
  return !!getAuthToken();
}

export function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem('ceylon-admin-user') || 'null');
  } catch {
    return null;
  }
}

/* ── IMAGE UPLOAD HELPER (Cloudinary via server) ── */
export async function uploadImage(file, category = 'general') {
  const authHeaders = getAuthHeaders();
  if (!authHeaders.Authorization) {
    // Fallback: return data URL for pure client-side preview
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ success: true, imagePath: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('image', file);
  formData.append('category', category);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { ...authHeaders }, // Don't set Content-Type — browser sets multipart boundary
    body: formData
  });

  if (res.status === 401) {
    clearAuthToken();
    document.dispatchEvent(new CustomEvent('ceylon-auth-expired'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error('Image upload failed');
  }

  return await res.json();
}
