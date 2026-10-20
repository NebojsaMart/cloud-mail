import { describe, it, expect } from 'vitest';
import htmlSanitizeUtils from '../src/utils/html-sanitize-utils';

const clean = (html) => htmlSanitizeUtils.sanitize(html);

describe('htmlSanitizeUtils.sanitize', () => {
	it('removes event handler attributes', () => {
		const out = clean('<img src="x" onerror="alert(1)"><div ONCLICK="x()">hi</div>');
		expect(out).not.toMatch(/onerror|onclick/i);
		expect(out).toContain('hi');
	});

	it('removes script-capable and form elements', () => {
		const out = clean('<script>alert(1)</script><iframe src="//evil"></iframe><form><input></form><svg onload="x"></svg><p>ok</p>');
		expect(out).not.toMatch(/<script|<iframe|<form|<input|<svg/i);
		expect(out).toContain('<p>ok</p>');
	});

	it('removes javascript: and data: URLs, even when obfuscated', () => {
		const out = clean('<a href=" java\tscript:alert(1)">a</a><a href="data:text/html,<b>x</b>">b</a><a href="https://ok.example">c</a>');
		expect(out).not.toMatch(/javascript|data:text/i);
		expect(out).toContain('href="https://ok.example"');
	});

	it('keeps inline images and styles', () => {
		const out = clean('<style>.a{color:red}</style><img src="data:image/png;base64,AAAA">');
		expect(out).toContain('<style>');
		expect(out).toContain('src="data:image/png;base64,AAAA"');
	});
});

describe('htmlSanitizeUtils.sanitizeStyle', () => {
	it('strips characters that could close the surrounding style block', () => {
		expect(htmlSanitizeUtils.sanitizeStyle('color:red;}</style><img onerror=x>')).toBe('color:red;/styleimg onerror=x');
	});
});
