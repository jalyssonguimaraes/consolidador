declare namespace Cloudflare {
  interface Env {
    BRAPI_API_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
