// lib/utils.ts
function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    return explicit.startsWith('http') ? explicit : `https://${explicit}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
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
