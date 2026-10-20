import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/service/perm-service', () => ({
	default: { userPermKeys: vi.fn(async () => []) }
}));

import app from '../src/hono/webs';
import permService from '../src/service/perm-service';
import jwtUtils from '../src/utils/jwt-utils';
import KvConst from '../src/const/kv-const';
import { makeEnv, ctxFor } from './helpers';

// Every permission-gated route and the permission it needs
const PERM_ROUTES = [
	['DELETE', '/email/delete', 'email:delete'],
	['POST', '/email/send', 'email:send'],
	['POST', '/account/add', 'account:add'],
	['GET', '/account/list', 'account:query'],
	['DELETE', '/account/delete', 'account:delete'],
	['DELETE', '/my/delete', 'my:delete'],
	['POST', '/role/add', 'role:add'],
	['PUT', '/role/set', 'role:set'],
	['PUT', '/role/setDefault', 'role:set'],
	['GET', '/role/list', 'role:query'],
	['GET', '/role/tree', 'role:query'],
	['DELETE', '/role/delete', 'role:delete'],
	['GET', '/user/list', 'user:query'],
	['GET', '/user/allAccount', 'user:query'],
	['POST', '/user/add', 'user:add'],
	['PUT', '/user/resetSendCount', 'user:reset-send'],
	['PUT', '/user/setPwd', 'user:set-pwd'],
	['PUT', '/user/setStatus', 'user:set-status'],
	['PUT', '/user/restore', 'user:set-status'],
	['PUT', '/user/setType', 'user:set-type'],
	['DELETE', '/user/delete', 'user:delete'],
	['DELETE', '/user/deleteAccount', 'user:delete'],
	['GET', '/allEmail/list', 'all-email:query'],
	['GET', '/allEmail/latest', 'all-email:query'],
	['DELETE', '/allEmail/delete', 'all-email:delete'],
	['DELETE', '/allEmail/batchDelete', 'all-email:delete'],
	['GET', '/setting/query', 'setting:query'],
	['PUT', '/setting/set', 'setting:set'],
	['PUT', '/setting/setBackground', 'setting:set'],
	['DELETE', '/setting/deleteBackground', 'setting:set'],
	['PUT', '/setting/setBlacklist', 'setting:set'],
	['GET', '/analysis/echarts', 'analysis:query'],
	['POST', '/regKey/add', 'reg-key:add'],
	['GET', '/regKey/list', 'reg-key:query'],
	['GET', '/regKey/history', 'reg-key:query'],
	['DELETE', '/regKey/delete', 'reg-key:delete'],
	['DELETE', '/regKey/clearNotUse', 'reg-key:delete'],
];

async function session(env, email = 'user@example.com') {
	const jwt = await jwtUtils.generateToken(ctxFor(env), { userId: 7, token: 'sess' });
	env.store.set(KvConst.AUTH_INFO + 7, JSON.stringify({
		tokens: ['sess'],
		user: { userId: 7, email },
		refreshTime: new Date().toISOString()
	}));
	return jwt;
}

async function call(env, method, path, jwt) {
	const res = await app.fetch(new Request(`http://mail.example${path}`, {
		method,
		headers: { Authorization: jwt, 'Content-Type': 'application/json' },
		body: ['GET', 'HEAD'].includes(method) ? undefined : '{}'
	}), env);
	return res.json();
}

describe('per-route permissions', () => {
	beforeEach(() => permService.userPermKeys.mockReset());

	it.each(PERM_ROUTES)('%s %s is denied without %s', async (method, path) => {
		permService.userPermKeys.mockResolvedValue([]);
		const env = makeEnv();
		const body = await call(env, method, path, await session(env));
		expect(body.code).toBe(403);
	});

	it.each(PERM_ROUTES)('%s %s passes the check with %s', async (method, path, key) => {
		permService.userPermKeys.mockResolvedValue([key]);
		const env = makeEnv();
		const body = await call(env, method, path, await session(env));
		// The handler then fails without a database; we only care that it got past the permission check
		expect(body.code).not.toBe(403);
		expect(body.code).not.toBe(401);
	});

	it('lets the admin through without any permission rows', async () => {
		permService.userPermKeys.mockResolvedValue([]);
		const env = makeEnv();
		const body = await call(env, 'GET', '/user/list', await session(env, 'admin@example.com'));
		expect(body.code).not.toBe(403);
		expect(permService.userPermKeys).not.toHaveBeenCalled();
	});

	it('does not grant a permission to a different route with the same prefix', async () => {
		permService.userPermKeys.mockResolvedValue(['user:delete']);
		const env = makeEnv();
		const body = await call(env, 'PUT', '/user/setPwd', await session(env));
		expect(body.code).toBe(403);
	});
});
