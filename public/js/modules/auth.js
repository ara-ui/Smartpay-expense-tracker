// auth.js
// Single source of truth for anything token-related. Every other script
// (apiConfig.js, userHeader.js, account.html, settings.html, future pages)
// should go through these functions instead of touching localStorage
// or jwt_decode directly. Depends on the jwt-decode CDN script being
// loaded on the page BEFORE this file.

const AUTH_TOKEN_KEY = "token";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function decodeToken() {
  const token = getToken();
  if (!token) return null;
  try {
    // payload shape: { userId, name, email, profileImage, isPremiumUser, exp, iat }
    return jwt_decode(token);
  } catch (e) {
    return null;
  }
}

function isTokenExpired() {
  const decoded = decodeToken();
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

function isLoggedIn() {
  return !!getToken() && !isTokenExpired();
}

function getCurrentUser() {
  const decoded = decodeToken();
  if (!decoded) return null;
  return {
    id: decoded.userId,
    name: decoded.name,
    email: decoded.email,
    profileImage: decoded.profileImage || null,
    isPremiumUser: !!decoded.isPremiumUser,
  };
}

function isPremium() {
  const user = getCurrentUser();
  return !!(user && user.isPremiumUser);
}

function logout(redirectTo = "login.html") {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.location.href = redirectTo;
}

// Call this at the top of any page that requires a logged-in user
// (account.html, settings.html, and eventually expense/reports/leaderboard).
// Returns the current user object, or redirects to login and returns null.
function requireAuth(redirectTo = "login.html") {
  if (!isLoggedIn()) {
    logout(redirectTo);
    return null;
  }
  return getCurrentUser();
}
