export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Metodo non consentito"
    });
  }

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(500).json({
      ok: false,
      error: "Configurazione Supabase non disponibile"
    });
  }

  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    ok: true,
    url,
    key
  });
}
