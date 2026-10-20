import app from '../hono/hono';
import { requirePerm } from '../security/security';
import analysisService from '../service/analysis-service';
import result from '../model/result';

app.get('/analysis/echarts', requirePerm('analysis:query'), async (c) => {
	const data = await analysisService.echarts(c, c.req.query());
	return c.json(result.ok(data));
})
