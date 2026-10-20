import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import constant from '../const/constant';
import reqUtils from '../utils/req-utils';

const COOKIE_NAME = 'cm_session';

// The login token lives in an HttpOnly cookie so page scripts (including injected ones) can never read it.
// The Authorization header is still accepted for API clients.
const sessionCookie = {

	options(c) {
		return {
			path: '/api',
			httpOnly: true,
			sameSite: 'Strict',
			secure: new URL(c.req.url).protocol === 'https:'
		};
	},

	set(c, jwt) {
		setCookie(c, COOKIE_NAME, jwt, { ...this.options(c), maxAge: constant.TOKEN_EXPIRE });
	},

	clear(c) {
		deleteCookie(c, COOKIE_NAME, this.options(c));
	},

	read(c) {
		const header = c.req.header(constant.TOKEN_HEADER);
		// Older frontends sent the literal string "null" when logged out
		if (header && header !== 'null' && header !== 'undefined') {
			return { jwt: header, fromCookie: false };
		}
		const cookie = getCookie(c, COOKIE_NAME);
		return { jwt: cookie, fromCookie: !!cookie };
	},

	// Cookies are sent automatically, so state-changing requests must come from our own pages (CSRF protection)
	isSameOrigin(c) {
		const origin = c.req.header('Origin');
		if (!origin) {
			return c.req.header('Sec-Fetch-Site') === 'same-origin';
		}
		return origin === new URL(c.req.url).origin || reqUtils.allowedOrigins(c).includes(origin);
	}
};

export default sessionCookie;
