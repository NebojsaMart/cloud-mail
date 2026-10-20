import resendService from '../service/resend-service';
import app from '../hono/hono';
app.post('/webhooks',async (c) => {
	const rawBody = await c.req.text();

	if (!await resendService.verifySignature(c, rawBody)) {
		return c.text('Invalid signature', 401);
	}

	try {
		await resendService.webhooks(c, JSON.parse(rawBody));
		return c.text('success', 200)
	} catch (e) {
		console.error('Resend webhook failed:', e);
		return c.text('error', 500)
	}
})
