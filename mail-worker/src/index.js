import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import kvObjService from './service/kv-obj-service';
import oauthService from './service/oauth-service';
import analysisService from './service/analysis-service';

// Email bodies are untrusted HTML rendered inside the app, so scripts are limited to our own files and Turnstile.
// Images, fonts and styles stay open because emails load them from anywhere.
const SPA_CSP = [
	"default-src 'self'",
	"script-src 'self' https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline' https:",
	"img-src * data: blob:",
	"font-src * data:",
	"media-src * data: blob:",
	"connect-src 'self' https://api.github.com https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com",
	"frame-src 'self' blob: https://challenges.cloudflare.com",
	"worker-src 'self' blob:",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'"
].join('; ');

function withPageHeaders(resp) {
	if (!resp.headers.get('Content-Type')?.includes('text/html')) {
		return resp;
	}
	const headers = new Headers(resp.headers);
	headers.set('Content-Security-Policy', SPA_CSP);
	headers.set('X-Frame-Options', 'DENY');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}

async function runJob(name, job) {
	try {
		await job();
	} catch (e) {
		console.error(`Scheduled job ${name} failed:`, e);
	}
}

export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		 if (['/static/','/attachments/'].some(p => url.pathname.startsWith(p))) {
			 return await kvObjService.toObjResp( { env }, url.pathname.substring(1));
		 }

		return withPageHeaders(await env.assets.fetch(req));
	},
	email: email,
	async scheduled(c, env, ctx) {
		if (c.cron === '*/30 * * * *') {
			await runJob('refreshEchartsCache', () => analysisService.refreshEchartsCache({ env }));
			return;
		}

		// Each job runs independently so one failure doesn't skip the rest
		await runJob('clearRecord', () => verifyRecordService.clearRecord({ env }));
		await runJob('resetDaySendCount', () => userService.resetDaySendCount({ env }));
		await runJob('completeReceiveAll', () => emailService.completeReceiveAll({ env }));
		await runJob('autoClean', () => emailService.autoClean({ env }));
		await runJob('refreshEchartsCache', () => analysisService.refreshEchartsCache({ env }));
		await runJob('clearNoBindOathUser', () => oauthService.clearNoBindOathUser({ env }));
	},
};
