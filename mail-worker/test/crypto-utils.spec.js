import { describe, it, expect } from 'vitest';
import cryptoUtils from '../src/utils/crypto-utils';

describe('password hashing', () => {
	it('hashes with PBKDF2 and verifies the same password', async () => {
		const { salt, hash } = await cryptoUtils.hashPassword('correct horse');
		expect(hash.startsWith('pbkdf2$100000$')).toBe(true);
		expect(await cryptoUtils.verifyPassword('correct horse', salt, hash)).toBe(true);
		expect(await cryptoUtils.verifyPassword('wrong', salt, hash)).toBe(false);
	});

	it('still verifies legacy SHA-256 hashes and flags them for rehash', async () => {
		const salt = 'legacy-salt';
		const legacy = await cryptoUtils.genHashPassword('old-password', salt);
		expect(await cryptoUtils.verifyPassword('old-password', salt, legacy)).toBe(true);
		expect(cryptoUtils.needsRehash(legacy)).toBe(true);
		const { hash } = await cryptoUtils.hashPassword('x');
		expect(cryptoUtils.needsRehash(hash)).toBe(false);
	});

	it('rejects missing passwords and hashes', async () => {
		expect(await cryptoUtils.verifyPassword(undefined, 's', 'pbkdf2$100000$abc')).toBe(false);
		expect(await cryptoUtils.verifyPassword('pw', 's', null)).toBe(false);
	});
});

describe('timingSafeEqual', () => {
	it('compares strings of equal and different length', () => {
		expect(cryptoUtils.timingSafeEqual('abc', 'abc')).toBe(true);
		expect(cryptoUtils.timingSafeEqual('abc', 'abd')).toBe(false);
		expect(cryptoUtils.timingSafeEqual('abc', 'abcd')).toBe(false);
	});
});

describe('genRandomPwd', () => {
	it('returns alphanumeric strings of the requested length', () => {
		const pwd = cryptoUtils.genRandomPwd(24);
		expect(pwd).toMatch(/^[A-Za-z0-9]{24}$/);
		expect(cryptoUtils.genRandomPwd()).toHaveLength(16);
	});
});
