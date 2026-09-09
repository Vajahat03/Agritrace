/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
      'storage.agritrace.dev',
      'placeholder.supabase.co',
      'zisvaplfxnpvxbfdsmyy.supabase.co',
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://zisvaplfxnpvxbfdsmyy.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_P_xf-4wIrhAr2rHkuD9eFQ_hyA5KPtU',
  },
};

module.exports = nextConfig;
