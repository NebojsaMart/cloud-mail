// Minimal in-memory stand-in for the KV binding; enough for auth and rate-limit paths that never reach D1
export function makeEnv(extra = {}) {
	const store = new Map();
	return {
		jwt_secret: 'test-jwt-secret',
		admin: 'admin@example.com',
		domain: ['example.com'],
		kv: {
			async get(key, opts) {
				const value = store.get(key);
				if (value === undefined) return null;
				return opts?.type === 'json' ? JSON.parse(value) : value;
			},
			async put(key, value) {
				store.set(key, value);
			},
			async delete(key) {
				store.delete(key);
			},
			async getWithMetadata() {
				return { value: null, metadata: null };
			}
		},
		store,
		...extra
	};
}

export function ctxFor(env) {
	return { env };
}
