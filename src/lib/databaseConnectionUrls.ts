interface DatabaseUrlEnv {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  SUPABASE_PROJECT_REF?: string;
  SUPABASE_DB_PASSWORD?: string;
  SUPABASE_DB_REGION?: string;
}

function buildPooledDatabaseUrl(env: DatabaseUrlEnv): string | undefined {
  if (!env.SUPABASE_PROJECT_REF || !env.SUPABASE_DB_PASSWORD) {
    return undefined;
  }

  const region = env.SUPABASE_DB_REGION ?? "ap-northeast-2";
  return `postgresql://postgres.${env.SUPABASE_PROJECT_REF}:${env.SUPABASE_DB_PASSWORD}@aws-1-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
}

function buildDirectDatabaseUrl(env: DatabaseUrlEnv): string | undefined {
  if (!env.SUPABASE_PROJECT_REF || !env.SUPABASE_DB_PASSWORD) {
    return undefined;
  }

  const region = env.SUPABASE_DB_REGION ?? "ap-northeast-2";
  return `postgresql://postgres.${env.SUPABASE_PROJECT_REF}:${env.SUPABASE_DB_PASSWORD}@aws-1-${region}.pooler.supabase.com:5432/postgres`;
}

export function getDatabaseUrl(env: DatabaseUrlEnv): string | undefined {
  return env.DATABASE_URL ?? buildPooledDatabaseUrl(env);
}

export function getDirectDatabaseUrl(env: DatabaseUrlEnv): string | undefined {
  return env.DIRECT_URL ?? buildDirectDatabaseUrl(env);
}