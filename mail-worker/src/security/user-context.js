import JwtUtils from '../utils/jwt-utils';
import sessionCookie from './session-cookie';

const userContext = {
	getUserId(c) {
		return c.get('user').userId;
	},

	getUser(c) {
		return c.get('user');
	},

	// Session id (the uuid inside the JWT) of the current request, or undefined when not logged in
	async getToken(c) {
		if (c.get('token')) {
			return c.get('token');
		}
		const { jwt } = sessionCookie.read(c);
		if (!jwt) {
			return undefined;
		}
		const result = await JwtUtils.verifyToken(c, jwt);
		return result && !result.typ ? result.token : undefined;
	},
};
export default userContext;
