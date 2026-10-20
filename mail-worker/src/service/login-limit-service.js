import BizError from '../error/biz-error';
import KvConst from '../const/kv-const';
import reqUtils from '../utils/req-utils';
import { t } from '../i18n/i18n';

const MAX_FAILS = 10;
const WINDOW_SECONDS = 15 * 60;

// Per-IP counter of failed password checks, stored in KV with a sliding TTL
const loginLimitService = {

	key(c, scope) {
		return `${KvConst.LOGIN_FAIL}${scope}:${reqUtils.getIp(c)}`;
	},

	async assertAllowed(c, scope) {
		const count = Number(await c.env.kv.get(this.key(c, scope))) || 0;
		if (count >= MAX_FAILS) {
			throw new BizError(t('tooManyAttempts'), 429);
		}
	},

	async recordFail(c, scope) {
		const key = this.key(c, scope);
		const count = Number(await c.env.kv.get(key)) || 0;
		await c.env.kv.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS });
	},

	async clear(c, scope) {
		await c.env.kv.delete(this.key(c, scope));
	}
};

export default loginLimitService;
