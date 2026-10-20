import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import app from '../src/hono/webs';
import sessionCookie from '../src/security/session-cookie';
import publicService from '../src/service/public-service';
import jwtUtils from '../src/utils/jwt-utils';
import KvConst from '../src/const/kv-const';
import { makeEnv, ctxFor } from './helpers';

async function cookieSession(env) {
	const jwt = await jwtUtils.generateToken(ctxFor(env), { userId: 3, token: 'cookie-sess' });
	env.store.set(KvConst.AUTH_INFO + 3, JSON.stringify({
		tokens: ['cookie-sess'],
		user: { userId: 3, email: 'u@example.com' },
		refreshTime: new Date().toISOString()
	}));
	return `cm_session=${jwt}`;
}

describe('session cookie', () => {
	it('is HttpOnly, SameSite=Strict, scoped to /api and Secure on https', async () => {
		const mini = new Hono();
		mini.get('/x', (c) => { sessionCookie.set(c, 'jwt-value'); return c.text('ok'); });
		const res = await mini.fetch(new Request('https://mail.example/x'));
		const cookie = res.headers.get('Set-Cookie');
		expect(cookie).toContain('cm_session=jwt-value');
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('SameSite=Strict');
		expect(cookie).toContain('Path=/api');
		expect(cookie).toContain('Secure');
	});

	it('authenticates GET requests from the cookie', async () => {
		const env = makeEnv();
		const res = await app.fetch(new Request('http://mail.example/role/selectUse', {
			headers: { Cookie: await cookieSession(env) }
		}), env);
		const body = await res.json();
		expect(body.code).not.toBe(401);
	});

	it('rejects cookie-authenticated writes from another origin (CSRF)', async () => {
		const env = makeEnv();
		const res = await app.fetch(new Request('http://mail.example/email/read', {
			method: 'PUT',
			headers: { Cookie: await cookieSession(env), Origin: 'https://evil.example', 'Content-Type': 'application/json' },
			body: '{}'
		}), env);
		expect((await res.json()).code).toBe(403);
	});

	it('rejects cookie-authenticated writes with no Origin or Sec-Fetch-Site', async () => {
		const env = makeEnv();
		const res = await app.fetch(new Request('http://mail.example/email/read', {
			method: 'PUT',
			headers: { Cookie: await cookieSession(env), 'Content-Type': 'application/json' },
			body: '{}'
		}), env);
		expect((await res.json()).code).toBe(403);
	});

	it('allows cookie-authenticated writes from the same origin', async () => {
		const env = makeEnv();
		const res = await app.fetch(new Request('http://mail.example/email/read', {
			method: 'PUT',
			headers: { Cookie: await cookieSession(env), Origin: 'http://mail.example', 'Content-Type': 'application/json' },
			body: '{}'
		}), env);
		const code = (await res.json()).code;
		expect(code).not.toBe(403);
		expect(code).not.toBe(401);
	});

	it('ignores the literal "null" Authorization header old frontends sent', async () => {
		const env = makeEnv();
		const res = await app.fetch(new Request('http://mail.example/role/selectUse', {
			headers: { Cookie: await cookieSession(env), Authorization: 'null' }
		}), env);
		expect((await res.json()).code).not.toBe(401);
	});
});

describe('public API token', () => {
	it('stores only a hash and verifies the plain token', async () => {
		const env = makeEnv();
		const token = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
		env.store.set(KvConst.PUBLIC_KEY, await publicService.hashToken(token));
		expect(env.store.get(KvConst.PUBLIC_KEY)).not.toContain(token);
		expect(await publicService.verifyToken(ctxFor(env), token)).toBe(true);
		expect(await publicService.verifyToken(ctxFor(env), 'wrong')).toBe(false);
	});

	it('still accepts tokens stored in plain text by older versions', async () => {
		const env = makeEnv();
		env.store.set(KvConst.PUBLIC_KEY, 'legacy-uuid');
		expect(await publicService.verifyToken(ctxFor(env), 'legacy-uuid')).toBe(true);
	});

	it('rejects everything when no token exists (expired)', async () => {
		expect(await publicService.verifyToken(ctxFor(makeEnv()), 'anything')).toBe(false);
	});
});

describe('request language', () => {
	it('keeps each concurrent request in its own language', async () => {
		const env = makeEnv();
		const req = (lang) => app.fetch(new Request('http://mail.example/email/list', { headers: { 'Accept-Language': lang } }), env).then(r => r.json());
		const results = await Promise.all([req('en'), req('zh'), req('en'), req('zh')]);
		expect(results[0].message).toBe(results[2].message);
		expect(results[1].message).toBe(results[3].message);
		expect(results[0].message).not.toBe(results[1].message);
		expect(results[0].message).toMatch(/[A-Za-z]/);
	});
});
