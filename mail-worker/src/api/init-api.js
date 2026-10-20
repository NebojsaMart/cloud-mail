import app from '../hono/hono';
import { dbInit } from '../init/init';

// Prefer POST /init with an X-Init-Secret header; the URL form is kept for existing setups
app.get('/init/:secret', (c) => {
	return dbInit.init(c, c.req.param('secret'));
})

app.post('/init', (c) => {
	return dbInit.init(c, c.req.header('X-Init-Secret'));
})
