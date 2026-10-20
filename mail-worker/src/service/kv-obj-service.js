import objHeaderUtils from '../utils/obj-header-utils';

const kvObjService = {

	async putObj(c, key, content, metadata) {
		await c.env.kv.put(key, content, { metadata: metadata });
	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}

		await Promise.all(keys.map( key => c.env.kv.delete(key)));
	},

	async getObj(c, key) {
		const obj = await c.env.kv.getWithMetadata(key, { type: "arrayBuffer"});
		if (!obj.value) {
			return null;
		}

		return new Response(obj.value, {
			headers: objHeaderUtils.build({
				contentType: obj.metadata?.contentType,
				contentDisposition: obj.metadata?.contentDisposition,
				cacheControl: obj.metadata?.cacheControl
			})
		});
	},

	async toObjResp(c, key) {

		return await this.getObj(c, key) || new Response('Not found', { status: 404 });

	}

};

export default kvObjService;
