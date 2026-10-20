import app from '../hono/hono';
import { requirePerm } from '../security/security';
import emailService from '../service/email-service';
import result from '../model/result';

app.get('/allEmail/list', requirePerm('all-email:query'), async (c) => {
	const data = await emailService.allList(c, c.req.query());
	return c.json(result.ok(data));
})

app.delete('/allEmail/delete', requirePerm('all-email:delete'), async (c) => {
	const list = await emailService.physicsDelete(c, c.req.query());
	return c.json(result.ok(list));
})

app.delete('/allEmail/batchDelete', requirePerm('all-email:delete'), async (c) => {
	await emailService.batchDelete(c, c.req.query());
	return c.json(result.ok());
})

app.get('/allEmail/latest', requirePerm('all-email:query'), async (c) => {
	const list = await emailService.allEmailLatest(c, c.req.query());
	return c.json(result.ok(list));
})
