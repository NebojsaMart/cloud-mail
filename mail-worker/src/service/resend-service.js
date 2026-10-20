import emailService from './email-service';
import { emailConst } from '../const/entity-const';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import cryptoUtils from '../utils/crypto-utils';

const encoder = new TextEncoder();
const TOLERANCE_SECONDS = 5 * 60;

const resendService = {

	// Resend signs webhooks with Svix: HMAC-SHA256 over "id.timestamp.body", keyed by the base64 part of whsec_...
	async verifySignature(c, rawBody) {

		let secrets = c.env.resend_webhook_secret || [];
		if (typeof secrets === 'string') {
			secrets = secrets.split(',').map(item => item.trim()).filter(Boolean);
		}

		if (secrets.length === 0) {
			console.warn('resend_webhook_secret is not configured; rejecting webhook');
			return false;
		}

		const id = c.req.header('svix-id');
		const timestamp = c.req.header('svix-timestamp');
		const signatureHeader = c.req.header('svix-signature');

		if (!id || !timestamp || !signatureHeader) {
			return false;
		}

		if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) {
			return false;
		}

		const signatures = signatureHeader.split(' ')
			.map(item => item.split(','))
			.filter(([version]) => version === 'v1')
			.map(([, sig]) => sig);

		for (const secret of secrets) {
			const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), ch => ch.charCodeAt(0));
			const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
			const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${id}.${timestamp}.${rawBody}`));
			const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
			if (signatures.some(sig => cryptoUtils.timingSafeEqual(sig, expected))) {
				return true;
			}
		}

		return false;
	},

	async webhooks(c, body) {

		const params = {
			resendEmailId: body.data.email_id,
			status: emailConst.status.SENT
		}

		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED
			params.message = null
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED
			params.message = null
		}

		if (body.type === 'email.bounced') {
			let bounce = body.data.bounce
			bounce = JSON.stringify(bounce);
			params.status = emailConst.status.BOUNCED
			params.message = bounce
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED
			params.message = null
		}

		if (body.type === 'email.failed') {
			params.status = emailConst.status.FAILED
			params.message = body.data.failed.reason
		}

		const emailRow = await emailService.updateEmailStatus(c, params)

		if (!emailRow) {
			throw new BizError(t('updateEmailStatusFail'));
		}

	}
}

export default resendService
