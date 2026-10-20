<p align="center">
    <img src="doc/demo/logo.png" width="80px" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center"><strong>All-in-one email service platform built on Cloudflare</strong></p>
    <p align="center">
        <img src="https://img.shields.io/badge/Cloudflare-F38020?labelColor=F38020&amp;color=F38020&amp;logo=cloudflare&amp;logoColor=white" alt="Cloudflare" />
        <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license" />
    </p>
</p>

> This is a fork of [maillab/cloud-mail](https://github.com/maillab/cloud-mail) with security fixes and English-only docs. The upstream [deployment guide](https://docs.skymail.ink/en/) still applies, with the extra configuration listed under [Configuration](#configuration).

## Description

With only one domain, you can create multiple different email addresses, similar to major email platforms. This project can be deployed on Cloudflare Workers to reduce server costs and build your own email service.

## Project Showcase

| ![](/doc/demo/en/demo.jpg)  | ![](/doc/demo/en/demo1.jpg) |
|-----------------------------|-----------------------------|
| ![](/doc/demo/en/demo2.jpg) | ![](/doc/demo/en/demo3.jpg) |


## Features

- **💰 Low-Cost Usage**: Deploy to Cloudflare Workers to reduce server costs

- **💻 Responsive Design**: Responsive layout that adapts to desktop and most mobile browsers

- **📧 Email Sending**: Integrated with Resend; supports bulk sending, inline images and attachments, and delivery status tracking

- **🛡️ Admin Features**: Manage users and emails, with RBAC permissions to restrict features and resource usage

- **📦 Attachment Support**: Send and receive attachments, stored and downloaded via R2 object storage

- **🔔 Email Push**: Forward received emails to Telegram bots or other email providers

- **📡 Open API**: Batch-create users via API and query emails with multiple conditions 

- **🔢 Verification Code Recognition**: Automatically detect verification codes in emails using Workers AI 

- **📈 Data Visualization**: Visualize system data and user/email growth with ECharts

- **🎨 Personalization**: Customize the site title, login background, and transparency

- **🤖 CAPTCHA**: Integrated Turnstile CAPTCHA to prevent automated bulk registration

- **📜 More Features**: Under development...



## Tech Stack

- **Platform**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)

- **Web Framework**: [Hono](https://hono.dev/)

- **ORM**: [Drizzle](https://orm.drizzle.team/)

- **Frontend Framework**: [Vue3](https://vuejs.org/) 

- **UI Framework**: [Element Plus](https://element-plus.org/) 

- **Email Service**: [Resend](https://resend.com/)

- **Cache**: [Cloudflare KV](https://developers.cloudflare.com/kv/)

- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/)

- **File Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/)

## Project Structure

```
cloud-mail
├── mail-worker                    # Backend worker project
│   ├── src
│   │   ├── api                    # API layer
│   │   ├── const                  # Project constants
│   │   ├── dao                    # Data access layer
│   │   ├── email                  # Email receiving and processing
│   │   ├── entity                 # Database entities
│   │   ├── error                  # Custom exceptions
│   │   ├── hono                   # Web framework config, middleware, global error handling
│   │   ├── i18n                   # Internationalization
│   │   ├── init                   # Database and cache initialization
│   │   ├── model                  # Response data models
│   │   ├── security               # Authentication and authorization
│   │   ├── service                # Business logic layer
│   │   ├── template               # Message templates
│   │   ├── utils                  # Utilities
│   │   └── index.js               # Entry point
│   ├── package.json               # Project dependencies
│   └── wrangler.toml              # Project configuration
│
├── mail-vue                       # Frontend Vue project
│   ├── src
│   │   ├── axios                  # Axios configuration
│   │   ├── components             # Custom components
│   │   ├── echarts                # ECharts imports
│   │   ├── i18n                   # Internationalization
│   │   ├── init                   # Startup initialization
│   │   ├── layout                 # Main layout components
│   │   ├── perm                   # Permission checks
│   │   ├── request                # API requests
│   │   ├── router                 # Router configuration
│   │   ├── store                  # Global state management
│   │   ├── utils                  # Utilities
│   │   ├── views                  # Page components
│   │   ├── app.vue                # Root component
│   │   ├── main.js                # Entry JS file
│   │   └── style.css              # Global styles
│   ├── package.json               # Project dependencies
└── └── env.release                # Project configuration
```

## Local development

Requirements: Node.js 20+ and pnpm 11 (`npm i -g pnpm@11`, or use `npx pnpm@11`).

```bash
# Backend (Worker) on http://127.0.0.1:8787
cd mail-worker
pnpm install
cp .dev.vars.example .dev.vars   # then fill in the secrets
pnpm dev

# One-time database setup (local D1 and KV are created automatically)
curl -X POST -H "X-Init-Secret: <init_secret from .dev.vars>" http://127.0.0.1:8787/api/init

# Frontend (Vite) on http://localhost:3001; /api is proxied to the local Worker
cd ../mail-vue
pnpm install
pnpm dev
```

Then register the admin address from `wrangler-dev.toml` (`admin@example.com` by default) on the login page.

Tests: `cd mail-worker && pnpm test`.

## Configuration

Worker settings are Wrangler `vars`. Put secrets in `.dev.vars` locally and set them with `wrangler secret put <name>` (or GitHub repository secrets for the deploy workflow) in production; never commit them.

| Name | Required | Description |
|---|---|---|
| `domain` | yes | JSON array of email domains, e.g. `["example.com"]` |
| `admin` | yes | Admin email address; this account bypasses all permission checks |
| `jwt_secret` | yes, secret | Signs login tokens. Use a long random value (`openssl rand -hex 32`) |
| `init_secret` | recommended, secret | Protects `/api/init`. Falls back to `jwt_secret` if unset |
| `resend_webhook_secret` | if using Resend webhooks, secret | Signing secret (`whsec_...`) from the Resend dashboard. Webhooks are rejected without it. Comma-separate several values for several Resend accounts |
| `cors_origin` | no | Extra origins allowed to call the API with the session cookie. Not needed normally: the frontend is served from the same origin and the dev server proxies `/api` |
| `ai_model` | no | Workers AI model for verification-code extraction |
| `analysis_cache` | no | Cache dashboard data in KV |
| `orm_log` | no | Log SQL queries |

The GitHub deploy workflow reads the same values from repository secrets/variables: `JWT_SECRET`, `INIT_SECRET`, `RESEND_WEBHOOK_SECRET`, `ADMIN`, `DOMAIN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and optionally `NAME`, `CUSTOM_DOMAIN`, `D1_DATABASE_ID`, `KV_NAMESPACE_ID`, `R2_BUCKET_NAME`, `AI_MODEL`.

### Upgrading an existing deployment

- Existing passwords keep working and are upgraded to PBKDF2 automatically on each user's next login.
- Telegram "View" links sent before this version stop working; new links expire after 7 days.
- Users must enter their current password to change it (except accounts created through OAuth sign-in).
- Set `resend_webhook_secret`, otherwise delivery-status updates from Resend are rejected.
- Login sessions moved from `localStorage` to an HttpOnly cookie, so everyone has to sign in once after upgrading. `/api/login` no longer returns the token in its response; scripts should use the public API instead.
- Public API tokens from `/api/public/genToken` now expire (90 days by default; pass `expireDays`, 1–365). Tokens generated before this version keep working until regenerated.
- The Worker needs the `nodejs_als` compatibility flag (already set in the bundled `wrangler*.toml` files).

## License

This project is licensed under the [MIT](LICENSE) license. Original work © 2025 aslost ([maillab/cloud-mail](https://github.com/maillab/cloud-mail)).
