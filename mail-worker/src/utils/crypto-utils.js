const encoder = new TextEncoder();

// Workers caps PBKDF2 at 100,000 iterations
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_PREFIX = 'pbkdf2$';

const toBase64 = (buff) => btoa(String.fromCharCode(...new Uint8Array(buff)));

const cryptoUtils = {

	generateSalt(length = 16) {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return toBase64(array);
	},


	async hashPassword(password) {
		const salt = this.generateSalt();
		const hash = await this.genPbkdf2Hash(password, salt, PBKDF2_ITERATIONS);
		return { salt, hash };
	},

	async genPbkdf2Hash(password, salt, iterations) {
		const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
		const bits = await crypto.subtle.deriveBits(
			{ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations },
			key,
			256
		);
		return `${PBKDF2_PREFIX}${iterations}$${toBase64(bits)}`;
	},

	// Legacy format: single SHA-256 of salt + password
	async genHashPassword(password, salt) {
		const data = encoder.encode(salt + password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		return toBase64(hashBuffer);
	},

	async verifyPassword(inputPassword, salt, storedHash) {
		if (typeof inputPassword !== 'string' || !storedHash) {
			return false;
		}

		let hash;
		if (storedHash.startsWith(PBKDF2_PREFIX)) {
			const iterations = Number(storedHash.split('$')[1]);
			hash = await this.genPbkdf2Hash(inputPassword, salt, iterations);
		} else {
			hash = await this.genHashPassword(inputPassword, salt);
		}

		return this.timingSafeEqual(hash, storedHash);
	},

	needsRehash(storedHash) {
		return !storedHash?.startsWith(`${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$`);
	},

	timingSafeEqual(a, b) {
		const aBytes = encoder.encode(String(a));
		const bBytes = encoder.encode(String(b));
		let diff = aBytes.length ^ bBytes.length;
		for (let i = 0; i < Math.max(aBytes.length, bBytes.length); i++) {
			diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
		}
		return diff === 0;
	},

	genRandomPwd(length = 16) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		// 248 is the largest multiple of 62 below 256, so rejecting higher bytes avoids modulo bias
		const limit = 256 - (256 % chars.length);
		let result = '';
		while (result.length < length) {
			const bytes = new Uint8Array(length * 2);
			crypto.getRandomValues(bytes);
			for (const byte of bytes) {
				if (byte < limit && result.length < length) {
					result += chars[byte % chars.length];
				}
			}
		}
		return result;
	}
};

export default cryptoUtils;
