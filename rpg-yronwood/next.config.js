/** @type {import('next').NextConfig} */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const nextConfig = {
  // Na Vercel muita gente só define SUPABASE_* (sem NEXT_PUBLIC_).
  // O Next só embute NEXT_PUBLIC_* no bundle do browser — espelhamos aqui no build.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
