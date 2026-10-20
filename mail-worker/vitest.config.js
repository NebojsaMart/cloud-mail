import { defineConfig } from 'vitest/config';

// The worker code only uses web-standard APIs (fetch, WebCrypto), so tests run in plain Node
export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/**/*.spec.js']
	}
});
