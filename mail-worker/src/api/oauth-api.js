import app from '../hono/hono';
import result from "../model/result";
import oauthService from "../service/oauth-service";
import sessionCookie from '../security/session-cookie';

// The session token goes into the HttpOnly cookie, never into the response body
function toLoginResult(c, { userInfo, token, bindTicket }) {
	if (token) {
		sessionCookie.set(c, token);
	}
	return result.ok({ userInfo, bindTicket, loggedIn: !!token });
}

app.post('/oauth/linuxDo/login', async (c) => {
	const loginInfo = await oauthService.linuxDoLogin(c, await c.req.json());
	return c.json(toLoginResult(c, loginInfo))
});

app.post('/oauth/github/login', async (c) => {
	const loginInfo = await oauthService.githubLogin(c, await c.req.json());
	return c.json(toLoginResult(c, loginInfo))
});

app.post('/oauth/google/login', async (c) => {
	const loginInfo = await oauthService.googleLogin(c, await c.req.json());
	return c.json(toLoginResult(c, loginInfo))
});

app.put('/oauth/bindUser', async (c) => {
	const loginInfo = await oauthService.bindUser(c, await c.req.json());
	return c.json(toLoginResult(c, loginInfo))
})
