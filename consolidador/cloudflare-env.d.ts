declare namespace Cloudflare {
  interface Env {
    BRAPI_API_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
