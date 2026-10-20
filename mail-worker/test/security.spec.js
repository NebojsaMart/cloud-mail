import { describe, it, expect } from 'vitest';
import app from '../src/hono/webs';
import jwtUtils from '../src/utils/jwt-utils';
import KvConst from '../src/const/kv-const';
import { makeEnv, ctxFor } from './helpers';

async function call(env, path, init = {}) {
	const res = await app.fetch(new Request(`http://mail.example${path}`, init), env);
	const type = res.headers.get('Content-Type') || '';
	return { res, body: type.includes('json') ? await res.json() : await res.text() };
}

describe('auth middleware', () => {
	it('rejects protected routes without a token', async () => {
		const { body } = await call(makeEnv(), '/email/list');
		expect(body.code).toBe(401);
	});

	it('no longer lets /test paths skip authentication', async () => {
		const { body } = await call(makeEnv(), '/test');
		expect(body.code).toBe(401);
	});

	it('rejects Telegram link tokens used as a login session', async () => {
		const env = makeEnv();
		const token = await jwtUtils.generateToken(ctxFor(env), { typ: 'tg-email', emailId: 1, userId: 1, token: 'abc' });
		env.store.set(KvConst.AUTH_INFO + 1, JSON.stringify({ tokens: ['abc'], user: { userId: 1 } }));
		const { body } = await call(env, '/email/list', { headers: { Authorization: token } });
		expect(body.code).toBe(401);
	});

	it('rejects tokens that are not in the KV session list', async () => {
		const env = makeEnv();
		const token = await jwtUtils.generateToken(ctxFor(env), { userId: 1, token: 'revoked' });
		env.store.set(KvConst.AUTH_INFO + 1, JSON.stringify({ tokens: ['other'], user: { userId: 1 } }));
		const { body } = await call(env, '/email/list', { headers: { Authorization: token } });
		expect(body.code).toBe(401);
	});

	it('rejects the public API when no public token has been generated', async () => {
		const { body } = await call(makeEnv(), '/public/emailList', { method: 'POST', body: '{}' });
		expect(body.code).toBe(401);
	});

	it('rejects the public API with a wrong token', async () => {
		const env = makeEnv();
		env.store.set(KvConst.PUBLIC_KEY, 'right-token');
		const { body } = await call(env, '/public/emailList', { method: 'POST', body: '{}', headers: { Authorization: 'wrong-token' } });
		expect(body.code).toBe(401);
	});
});

describe('OAuth bind', () => {
	it('requires a bind ticket', async () => {
		const { body } = await call(makeEnv(), '/oauth/bindUser', {
			method: 'PUT',
			body: JSON.stringify({ oauthUserId: '12345', email: 'attacker@example.com' })
		});
		expect(body.code).toBe(401);
	});

	it('rejects other signed tokens as a bind ticket', async () => {
		const env = makeEnv();
		const bindTicket = await jwtUtils.generateToken(ctxFor(env), { typ: 'tg-email', oauthId: 1 });
		const { body } = await call(env, '/oauth/bindUser', {
			method: 'PUT',
			body: JSON.stringify({ bindTicket, email: 'attacker@example.com' })
		});
		expect(body.code).toBe(401);
	});
});

describe('init endpoint', () => {
	it('rejects a wrong secret in the URL', async () => {
		const { res } = await call(makeEnv({ init_secret: 'init-secret' }), '/init/test-jwt-secret');
		expect(res.status).toBe(403);
	});

	it('rejects a POST without the secret header', async () => {
		const { res } = await call(makeEnv(), '/init', { method: 'POST' });
		expect(res.status).toBe(403);
	});
});

describe('login rate limiting', () => {
	it('blocks an IP after 10 failed attempts', async () => {
		const env = makeEnv();
		env.store.set(`${KvConst.LOGIN_FAIL}login:203.0.113.9`, '10');
		const { body } = await call(env, '/login', {
			method: 'POST',
			headers: { 'CF-Connecting-IP': '203.0.113.9' },
			body: JSON.stringify({ email: 'a@example.com', password: 'whatever' })
		});
		expect(body.code).toBe(429);
	});
});

describe('CORS', () => {
	it('sends no CORS headers to unknown origins', async () => {
		const { res } = await call(makeEnv(), '/setting/websiteConfig', { headers: { Origin: 'https://evil.example' } });
		expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('allows configured origins', async () => {
		const env = makeEnv({ cors_origin: ['http://localhost:3001'] });
		const { res } = await call(env, '/email/list', { headers: { Origin: 'http://localhost:3001' } });
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
	});
});
