import r2Service from '../service/r2-service';
import app from '../hono/hono';
import objHeaderUtils from '../utils/obj-header-utils';

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	const obj = await r2Service.getObj(c, key);

	if (!obj) {
		return c.text('Not found', 404);
	}

	// KV and S3 already return a Response with safe headers
	if (obj instanceof Response) {
		return obj;
	}

	return new Response(obj.body, {
		headers: objHeaderUtils.build({
			contentType: obj.httpMetadata?.contentType,
			contentDisposition: obj.httpMetadata?.contentDisposition,
			cacheControl: obj.httpMetadata?.cacheControl
		})
	});
});
