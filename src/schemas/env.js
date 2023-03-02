import { z } from 'zod';

export const EnvSchema = z.object({
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string()
}).passthrough()