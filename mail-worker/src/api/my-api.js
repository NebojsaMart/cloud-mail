import app from '../hono/hono';
import { requirePerm } from '../security/security';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';
import sessionCookie from '../security/session-cookie';

app.get('/my/loginUserInfo', async (c) => {
	const user = await userService.loginUserInfo(c, userContext.getUserId(c));
	return c.json(result.ok(user));
});

app.put('/my/resetPassword', async (c) => {
	await userService.resetPassword(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/my/delete', requirePerm('my:delete'), async (c) => {
	await userService.delete(c, userContext.getUserId(c));
	sessionCookie.clear(c);
	return c.json(result.ok());
});


