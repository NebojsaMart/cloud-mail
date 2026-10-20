import { describe, it, expect } from 'vitest';
import resendService from '../src/service/resend-service';

const SECRET_BYTES = 'test-webhook-key-32-bytes-long!!';
const SECRET = 'whsec_' + btoa(SECRET_BYTES);

async function sign(id, timestamp, body) {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET_BYTES), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
	return 'v1,' + btoa(String.fromCharCode(...new Uint8Array(mac)));
}

function ctx(headers, secret = SECRET) {
	return {
		env: { resend_webhook_secret: secret },
		req: { header: (name) => headers[name] }
	};
}

describe('Resend webhook signature', () => {
	const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'abc' } });
	const now = String(Math.floor(Date.now() / 1000));

	it('accepts a valid signature', async () => {
		const headers = { 'svix-id': 'msg_1', 'svix-timestamp': now, 'svix-signature': await sign('msg_1', now, body) };
		expect(await resendService.verifySignature(ctx(headers), body)).toBe(true);
	});

	it('rejects a tampered body', async () => {
		const headers = { 'svix-id': 'msg_1', 'svix-timestamp': now, 'svix-signature': await sign('msg_1', now, body) };
		expect(await resendService.verifySignature(ctx(headers), body.replace('delivered', 'bounced'))).toBe(false);
	});

	it('rejects old timestamps (replay)', async () => {
		const old = String(Math.floor(Date.now() / 1000) - 3600);
		const headers = { 'svix-id': 'msg_1', 'svix-timestamp': old, 'svix-signature': await sign('msg_1', old, body) };
		expect(await resendService.verifySignature(ctx(headers), body)).toBe(false);
	});

	it('rejects everything when no secret is configured', async () => {
		const headers = { 'svix-id': 'msg_1', 'svix-timestamp': now, 'svix-signature': await sign('msg_1', now, body) };
		expect(await resendService.verifySignature(ctx(headers, ''), body)).toBe(false);
	});
});
