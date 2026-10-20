import BizError from '../error/biz-error';
import constant from '../const/constant';
import jwtUtils from '../utils/jwt-utils';
import KvConst from '../const/kv-const';
import dayjs from 'dayjs';
import userService from '../service/user-service';
import permService from '../service/perm-service';
import publicService from '../service/public-service';
import { t } from '../i18n/i18n'
import app from '../hono/hono';
import sessionCookie from './session-cookie';

// Routes reachable without a login session; every other route requires one (deny by default)
const PUBLIC_ROUTES = new Set([
	'/login',
	'/register',
	'/setting/websiteConfig',
	'/webhooks',
	'/init',
	'/public/genToken',
	'/oauth/linuxDo/login',
	'/oauth/github/login',
	'/oauth/google/login',
	'/oauth/bindUser'
]);

const PUBLIC_PREFIXES = [
	'/oss/',
	'/init/',
	'/telegram/getEmail/'
];

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

app.use('*', async (c, next) => {

	const path = c.req.path;

	if (PUBLIC_ROUTES.has(path) || PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) {
		return await next();
	}

	if (path.startsWith('/public/')) {
		if (!await publicService.verifyToken(c, c.req.header(constant.TOKEN_HEADER))) {
			throw new BizError(t('publicTokenFail'), 401);
		}
		return await next();
	}

	const { jwt, fromCookie } = sessionCookie.read(c);

	if (fromCookie && !SAFE_METHODS.includes(c.req.method) && !sessionCookie.isSameOrigin(c)) {
		throw new BizError(t('unauthorized'), 403);
	}

	const result = await jwtUtils.verifyToken(c, jwt);

	// Tokens with a typ claim (Telegram links, OAuth bind tickets) are not login sessions
	if (!result || result.typ || !result.userId || !result.token) {
		throw new BizError(t('authExpired'), 401);
	}

	const { userId, token } = result;
	const authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userId, { type: 'json' });

	if (!authInfo) {
		throw new BizError(t('authExpired'), 401);
	}

	if (!authInfo.tokens.includes(token)) {
		throw new BizError(t('authExpired'), 401);
	}

	const refreshTime = dayjs(authInfo.refreshTime).startOf('day');
	const nowTime = dayjs().startOf('day')

	if (!nowTime.isSame(refreshTime)) {
		authInfo.refreshTime = dayjs().toISOString();
		await userService.updateUserInfo(c, authInfo.user.userId);
		await c.env.kv.put(KvConst.AUTH_INFO + userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
	}

	c.set('user', authInfo.user)
	c.set('token', token)

	return await next();
});

// Route-level permission check; the admin account (env.admin) has every permission
export function requirePerm(permKey) {
	return async (c, next) => {
		const user = c.get('user');

		if (user.email !== c.env.admin) {
			const permKeys = await permService.userPermKeys(c, user.userId);
			if (!permKeys.includes(permKey)) {
				throw new BizError(t('unauthorized'), 403);
			}
		}

		return await next();
	};
}
