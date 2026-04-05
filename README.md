# model

## Local setup

Create a `.env.local` file in the repository root and add the variables described below.

Use [.env.example](.env.example) as the starting template.

## Supabase

### Database connection variables

These variables are used to build the Prisma database connection URLs.

Add these to `.env.local`:

```env
SUPABASE_PROJECT_REF="your-project-ref"
SUPABASE_DB_REGION="your-db-region"
SUPABASE_DB_PASSWORD="your-db-password"
```

Where to get them:

1. `SUPABASE_PROJECT_REF`
	- This is your Supabase project ref.
	- It is the `<project-ref>` part of your project URL, for example:
	  - `https://<project-ref>.supabase.co`

2. `SUPABASE_DB_REGION`
	- Use the region your database is hosted in, for example `ap-northeast-2`.
	- You can get this from the Supabase project settings or the database connection details.

3. `SUPABASE_DB_PASSWORD`
	- This is the database password for the Postgres database.
	- Use the password configured for your Supabase database.

### Supabase application API variables

These variables are used by the application for auth and server-side test setup.

Add these to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Where to get them:

1. `NEXT_PUBLIC_SUPABASE_URL`
	- This is:
	  - `https://<project-ref>.supabase.co`
	- Replace `<project-ref>` with your Supabase project ref.

2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- In Supabase, go to:
	  - `Project Settings` -> `API`
	- Copy the value labeled:
	  - `anon public`

3. `SUPABASE_SERVICE_ROLE_KEY`
	- In Supabase, go to:
	  - `Project Settings` -> `API`
	- Copy the value labeled:
	  - `service_role secret`

## Stripe

### Stripe API secret key

Add this to `.env.local`:

```env
STRIPE_SECRET_KEY="sk_test_..."
```

Where to get it:

1. Open the Stripe Dashboard.
2. Make sure you are in the correct mode:
	- `Test mode` for local development and BDD tests
	- `Live mode` only for production
3. Go to:
	- `Developers` -> `API keys`
4. Copy the `Secret key`.

Notes:

- The publishable key starts with `pk_...` and is not the right value here.
- The secret key starts with `sk_...` or `sk_test_...`.
- For local development in this repo, use the test key.

### Stripe webhook signing secret

Add this to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

There are two ways to get it.

#### Option 1: From Stripe Dashboard

1. Open the Stripe Dashboard.
2. Make sure you are in the correct mode:
	- `Test mode` for local development and BDD tests
3. Go to:
	- `Developers` -> `Webhooks`
4. Open the webhook endpoint.
5. Reveal the `Signing secret`.
6. Copy the value that starts with `whsec_...`.

#### Option 2: From Stripe CLI for local development

1. Start the app.
2. Run:

```powershell
npm run stripe-cli
```

3. The Stripe CLI prints a line containing:

```text
Your webhook signing secret is whsec_...
```

4. Copy that `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

Important:

- `STRIPE_SECRET_KEY` is the Stripe API secret key and starts with `sk_...`.
- `STRIPE_WEBHOOK_SECRET` is the webhook signing secret and starts with `whsec_...`.
- They are different values and are not interchangeable.

### Stripe price IDs

Add these to `.env.local`:

```env
STRIPE_PRICE_ID_LIGHT="price_..."
STRIPE_PRICE_ID_FULL="price_..."
```

Where to get them:

1. Open the Stripe Dashboard in `Test mode`.
2. Go to:
	- `Product catalog` or `Products`
3. Open the product for the relevant plan.
4. Open the recurring monthly price for that plan.
5. Copy the Stripe price ID that starts with `price_...`.

Variable mapping:

- The Light plan recurring monthly price goes into `STRIPE_PRICE_ID_LIGHT`
- The Full plan recurring monthly price goes into `STRIPE_PRICE_ID_FULL`

## Other local variables

These are also expected in `.env.local` for local development and tests:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_VERSION="dev"
MAILSAC_API_KEY="your-mailsac-api-key"
```

## Example `.env.local`

```env
SUPABASE_PROJECT_REF="your-project-ref"
SUPABASE_DB_REGION="ap-northeast-2"
SUPABASE_DB_PASSWORD="your-db-password"

NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_VERSION="dev"

MAILSAC_API_KEY="your-mailsac-api-key"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_LIGHT="price_..."
STRIPE_PRICE_ID_FULL="price_..."
```

## Local Stripe listener

For payment-related BDD tests, keep the Stripe listener running in a separate terminal:

```powershell
npm run stripe-cli
```

This forwards webhook events to:

```text
http://localhost:3000/api/subscription/webhook
```