const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseDotEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function findStripeExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error('LOCALAPPDATA is not set.');
  }

  const packagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
  const packageDirs = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('Stripe.StripeCli_'));

  for (const dir of packageDirs) {
    const candidate = path.join(packagesDir, dir.name, 'stripe.exe');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Stripe CLI not found. Install via winget install --id Stripe.StripeCLI --accept-package-agreements --accept-source-agreements',
  );
}

function main() {
  const repoRoot = process.cwd();
  const envFilePath = path.join(repoRoot, '.env.local');

  if (!fs.existsSync(envFilePath)) {
    throw new Error('.env.local not found.');
  }

  const envFile = parseDotEnv(envFilePath);
  const stripeSecretKey = envFile.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY not found in .env.local');
  }

  const stripeExecutable = findStripeExecutable();

  const child = spawn(
    stripeExecutable,
    [
      'listen',
      '--api-key',
      stripeSecretKey,
      '--latest',
      '--forward-to',
      'localhost:3000/api/subscription/webhook',
    ],
    {
      stdio: 'inherit',
      cwd: repoRoot,
    },
  );

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
}

main();