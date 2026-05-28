if (process.env.AZURE_DATABASE_URL && process.env.AZURE_DATABASE_URL.trim()) {
  const masked = process.env.AZURE_DATABASE_URL.replace(/:([^:@]+)@/, ":****@");
  console.log(`[db-cutover] AZURE_DATABASE_URL detected — routing DATABASE_URL to Azure: ${masked}`);
  process.env.DATABASE_URL = process.env.AZURE_DATABASE_URL;
} else {
  console.log("[db-cutover] No AZURE_DATABASE_URL set — using default DATABASE_URL (Neon).");
}
