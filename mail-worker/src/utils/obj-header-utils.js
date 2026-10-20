// Stored objects come from email senders, so only plain raster images may render inline.
// Everything else (HTML, SVG, XML, PDF...) is forced to download and sandboxed in case a browser renders it anyway.
const INLINE_TYPES = [
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp',
	'image/bmp',
	'image/avif',
	'image/x-icon',
	'image/vnd.microsoft.icon'
];

const objHeaderUtils = {

	contentDisposition(type, filename) {
		return `${type}; filename*=UTF-8''${encodeURIComponent(filename || 'file')}`;
	},

	parseFilename(disposition) {
		if (!disposition) return null;
		const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
		if (encoded) {
			try {
				return decodeURIComponent(encoded[1].trim());
			} catch {
				return encoded[1].trim();
			}
		}
		const plain = disposition.match(/filename="?([^";]+)"?/i);
		return plain ? plain[1].trim() : null;
	},

	build({ contentType, contentDisposition, cacheControl }) {
		const mime = (contentType || '').split(';')[0].trim().toLowerCase();
		const inline = INLINE_TYPES.includes(mime) && /^\s*inline/i.test(contentDisposition || 'inline');
		const filename = this.parseFilename(contentDisposition);

		const headers = {
			'Content-Type': contentType || 'application/octet-stream',
			'Content-Disposition': filename
				? this.contentDisposition(inline ? 'inline' : 'attachment', filename)
				: (inline ? 'inline' : 'attachment'),
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"
		};

		if (cacheControl) {
			headers['Cache-Control'] = cacheControl;
		}

		return headers;
	}
};

export default objHeaderUtils;
