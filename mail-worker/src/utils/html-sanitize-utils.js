import { parseHTML } from 'linkedom';

// Elements that can run script, load active content, or phish credentials
const BLOCKED_TAGS = [
	'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'base', 'meta', 'link',
	'form', 'input', 'button', 'textarea', 'select', 'noscript', 'template', 'portal', 'svg', 'math'
];

const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'background', 'poster', 'srcset', 'data', 'ping'];

const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|bmp|avif);/i;

function isUnsafeUrl(name, value) {
	// Browsers ignore whitespace and control characters inside the scheme
	const normalized = value.replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase();
	if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) {
		return true;
	}
	if (normalized.startsWith('data:')) {
		return !(name === 'src' && SAFE_DATA_IMAGE.test(normalized));
	}
	return false;
}

const htmlSanitizeUtils = {

	sanitize(html) {
		const { document } = parseHTML(html || '');

		document.querySelectorAll(BLOCKED_TAGS.join(',')).forEach(el => el.remove());

		document.querySelectorAll('*').forEach(el => {
			for (const attr of [...el.attributes]) {
				const name = attr.name.toLowerCase();
				if (name.startsWith('on') || (URL_ATTRS.includes(name) && isUnsafeUrl(name, attr.value))) {
					el.removeAttribute(attr.name);
				}
			}
		});

		return document.toString();
	},

	// The body style is pasted into a <style> block, so it must not be able to close that block or open a rule
	sanitizeStyle(style) {
		return (style || '').replace(/[<>{}]/g, '');
	}
};

export default htmlSanitizeUtils;
