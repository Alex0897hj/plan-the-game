import type { Config } from "@netlify/functions";

// Runs every 15 minutes, calls the Next.js cron API route
export default async () => {
  const baseUrl = process.env.URL; // Netlify sets this automatically
  if (!baseUrl) {
    console.error("[auto-cancel] URL env var not set");
    return;
  }

  const secret = process.env.CRON_SECRET ?? "";
  const res = await fetch(`${baseUrl}/api/cron/games/auto-cancel`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.json();
  console.log("[auto-cancel]", res.status, JSON.stringify(body));
};

export const config: Config = {
  schedule: "*/15 * * * *",
};
