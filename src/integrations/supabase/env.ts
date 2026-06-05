type SupabasePublicEnv = {
  url?: string;
  publishableKey?: string;
  projectId?: string;
};

type SupabaseServerEnv = SupabasePublicEnv & {
  serviceRoleKey?: string;
};

function getImportMetaEnv(): Record<string, string | undefined> {
  return ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const viteEnv = getImportMetaEnv();

  return {
    url:
      viteEnv.VITE_SUPABASE_URL ??
      process.env.VITE_SUPABASE_URL ??
      process.env.SUPABASE_URL,
    publishableKey:
      viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY,
    projectId:
      viteEnv.VITE_SUPABASE_PROJECT_ID ??
      process.env.VITE_SUPABASE_PROJECT_ID ??
      process.env.SUPABASE_PROJECT_ID,
  };
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  return {
    ...getSupabasePublicEnv(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getMissingSupabasePublicEnvVars(env = getSupabasePublicEnv()) {
  return [
    ...(!env.url ? ["SUPABASE_URL"] : []),
    ...(!env.publishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ];
}

export function getMissingSupabaseServerEnvVars(env = getSupabaseServerEnv()) {
  return [
    ...getMissingSupabasePublicEnvVars(env),
    ...(!env.serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
  ];
}
