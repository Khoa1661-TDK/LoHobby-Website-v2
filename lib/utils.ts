// lib/utils.ts

// `APP_URL` is read FIRST and is intentionally NOT prefixed `NEXT_PUBLIC_`:
// Next.js inlines `NEXT_PUBLIC_*` as literals at build time (even in server
// bundles), so a baked value cannot be changed per-deployment. A plain runtime
// var is read by Node at server start, letting one prebuilt image serve any
// domain via `APP_URL=https://yourshop.com` (e.g. set in Portainer). The
// `NEXT_PUBLIC_*` fallbacks remain for Vercel/legacy build-time configuration.
export function resolveBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const appUrl =
    env.APP_URL ?? env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_SITE_URL;
  if (appUrl) {
    return appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
  }
  if (env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export const baseUrl = resolveBaseUrl();

export function createUrl(
  pathname: string,
  params: URLSearchParams | ReadonlyURLSearchParams,
): string {
  const paramsString = params.toString();
  const queryString = paramsString.length > 0 ? `?${paramsString}` : '';
  return `${pathname}${queryString}`;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function ensureStartsWith(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value : `${prefix}${value}`;
}

export function validateEnvironmentVariables(): void {
  const requiredEnvironmentVariables = ['DATABASE_URL'] as const;
  const missingEnvironmentVariables: string[] = [];

  for (const name of requiredEnvironmentVariables) {
    if (!process.env[name]) {
      missingEnvironmentVariables.push(name);
    }
  }

  if (missingEnvironmentVariables.length > 0) {
    throw new Error(
      `The following environment variables are missing: ${missingEnvironmentVariables.join(
        ', ',
      )}\n`,
    );
  }
}

type ReadonlyURLSearchParams = {
  toString: () => string;
};
