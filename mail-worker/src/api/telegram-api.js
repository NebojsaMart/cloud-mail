import app from '../hono/hono';
import telegramService from '../service/telegram-service';

app.get('/telegram/getEmail/:token', async (c) => {
	const nonce = crypto.randomUUID().replace(/-/g, '');
	const content = await telegramService.getEmailContent(c, c.req.param(), nonce);
	c.header('Cache-Control', 'private, no-store');
	c.header('Referrer-Policy', 'no-referrer');
	// Only the template's own script may run; remote images and styles from the email are still allowed
	c.header('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' https: http:; img-src * data: blob:; font-src * data:; media-src *; base-uri 'none'; form-action 'none'`);
	return c.html(content)
});
