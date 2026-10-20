// The login token is an HttpOnly cookie the page can't read; this flag only remembers that a session exists
// so the router knows whether to show the login page. The server still checks the cookie on every request.
const FLAG = 'loggedIn'

// Older versions kept the token itself in localStorage
localStorage.removeItem('token')

export function isLoggedIn() {
    return localStorage.getItem(FLAG) === '1'
}

export function markLoggedIn() {
    localStorage.setItem(FLAG, '1')
}

export function clearSession() {
    localStorage.removeItem(FLAG)
}
