import i18next from 'i18next';
import { AsyncLocalStorage } from 'node:async_hooks';
import zh from './zh.js'
import en from './en.js'
import app from '../hono/hono';

// Each request keeps its own language; a shared global would leak between concurrent requests in the same isolate
const langStore = new AsyncLocalStorage();

app.use('*', async (c, next) => {
	const lang = c.req.header('accept-language')?.split('-')[0]
	return langStore.run(lang, () => next())
})

const resources = {
	en: {
		translation: en
	},
	zh: {
		translation: zh,
	},
};

i18next.init({
	fallbackLng: 'zh',
	resources,
});

export const t = (key, values) => i18next.getFixedT(langStore.getStore() || null)(key, values)

export default i18next;
