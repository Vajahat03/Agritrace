import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WEATHER_API_KEY: z.string().optional(),
  AI_SERVICE_URL: z.string().optional().default('http://localhost:8000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Environment configuration warning. Using default fallback configuration.');
}

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: parseInt(process.env.PORT || '5000', 10),
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
      WEATHER_API_KEY: process.env.WEATHER_API_KEY,
      AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    };
