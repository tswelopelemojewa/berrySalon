// session.js
const sessions = new Map();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Initialize a session for a user
export function getSession(user) {
  const now = Date.now();
  const existing = sessions.get(user);
  let wasReset = false;

  // If session exists, check if it's still active or needs to be reset
  if (existing) {
    const inactiveFor = now - existing.lastActive;
    if (inactiveFor > SESSION_TIMEOUT_MS) {
      sessions.set(user, { state: null, data: {}, lastActive: now });
      wasReset = true;
    } 
    else {
      existing.lastActive = now;
    }
  } 
  else {
    sessions.set(user, { state: null, data: {}, lastActive: now });
    wasReset = true;
  }

  return { session: sessions.get(user), wasReset };
}

// clear the session for a user
export function clearSession(user) {
  sessions.delete(user);
}
