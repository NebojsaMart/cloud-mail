import { describe, it, expect } from 'vitest';
import objHeaderUtils from '../src/utils/obj-header-utils';

describe('objHeaderUtils.build', () => {
	it('forces HTML to download even when stored as inline', () => {
		const headers = objHeaderUtils.build({ contentType: 'text/html', contentDisposition: 'inline;filename=evil.html' });
		expect(headers['Content-Disposition']).toBe("attachment; filename*=UTF-8''evil.html");
		expect(headers['X-Content-Type-Options']).toBe('nosniff');
		expect(headers['Content-Security-Policy']).toContain('sandbox');
	});

	it('forces SVG to download', () => {
		const headers = objHeaderUtils.build({ contentType: 'image/svg+xml', contentDisposition: 'inline' });
		expect(headers['Content-Disposition']).toBe('attachment');
	});

	it('allows raster images inline', () => {
		const headers = objHeaderUtils.build({ contentType: 'image/png', contentDisposition: objHeaderUtils.contentDisposition('inline', 'a b.png'), cacheControl: 'max-age=60' });
		expect(headers['Content-Disposition']).toBe("inline; filename*=UTF-8''a%20b.png");
		expect(headers['Cache-Control']).toBe('max-age=60');
	});

	it('encodes non-ASCII and header-breaking filenames', () => {
		const headers = objHeaderUtils.build({ contentType: 'application/pdf', contentDisposition: 'attachment;filename=报告\r\nX: y.pdf' });
		expect(headers['Content-Disposition']).not.toMatch(/[\r\n]/);
		expect(headers['Content-Disposition']).toContain("filename*=UTF-8''");
	});
});
