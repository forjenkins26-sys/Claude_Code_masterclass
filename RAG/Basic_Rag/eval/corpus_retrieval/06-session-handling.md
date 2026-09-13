# Session Handling

A logged-in session expires after 30 minutes of inactivity.
Logging out invalidates the session token immediately.
A session token replayed after logout is refused with 401 Unauthorized.
Sessions are not shared across browser profiles.
