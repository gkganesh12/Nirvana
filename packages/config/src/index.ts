export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const optionalEnv = (key: string, fallback?: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
};
