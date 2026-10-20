import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import reqUtils from '../utils/req-utils';

// The SPA is served from the same origin, so CORS is only needed for extra origins such as the Vite dev server
app.use('*', cors({
	origin: (origin, c) => reqUtils.allowedOrigins(c).includes(origin) ? origin : null,
	credentials: true
}));

// Telegram embeds the email view in an iframe and attachments may be loaded from a separate r2Domain,
// so framing and cross-origin resource rules are set per response instead of globally
app.use('*', secureHeaders({
	xFrameOptions: false,
	crossOriginResourcePolicy: false,
	crossOriginEmbedderPolicy: false
}));

app.onError((err, c) => {
	if (err.name === 'BizError') {
		console.log(err.message);
		return c.json(result.fail(err.message, err.code));
	}

	console.error(err);

	if (err.message === `Cannot read properties of undefined (reading 'get')`) {
		return c.json(result.fail('KV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'put')`) {
		return c.json(result.fail('KV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
		return c.json(result.fail('D1 database not bound',502));
	}

	if (err.message?.includes('D1_ERROR: no such column')) {
		return c.json(result.fail('Please update the database as documented',502));
	}

	// Details stay in the logs; clients only get a generic message
	return c.json(result.fail('Internal server error', 500));
});

export default app;
