const GEO_URL = "https://api.geoapify.com/v2/places";

const GROUPS = [
  { kind:"camp", categories:"camping.caravan_site,camping.camp_site,camping.camp_pitch" },
  { kind:"fuel", categories:"service.vehicle.fuel" },
  { kind:"charge", categories:"service.vehicle.charging_station" },
  { kind:"service", categories:"amenity.drinking_water,amenity.toilet" },
  { kind:"stop", categories:"parking" }
];

function sendJson(res, status, obj) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(status).json(obj);
}

function thinSamples(samples, max = 2) {
  if (samples.length <= max) return samples;
  const out = [];
  for (let i = 0; i < max; i++) {
    out.push(samples[Math.round(i * (samples.length - 1) / (max - 1))]);
  }
  return out;
}

function titleFor(kind, p) {
  if (p.name) return p.name;
  if (kind === "camp") return "Campeggio / area camper";
  if (kind === "fuel") return "Carburante";
  if (kind === "charge") return "Ricarica";
  if (kind === "service") return "Servizio";
  return "Sosta / parcheggio";
}

async function geoFetch(key, sample, radius, group) {
  const q = new URLSearchParams({
    categories: group.categories,
    filter: `circle:${sample.lng},${sample.lat},${radius}`,
    bias: `proximity:${sample.lng},${sample.lat}`,
    limit: "20",
    lang: "it",
    apiKey: key
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch(`${GEO_URL}?${q.toString()}`, {
      signal: controller.signal,
      headers: { "accept": "application/json" }
    });

    const text = await r.text();

    if (!r.ok) {
      throw new Error(`Geoapify ${r.status}: ${text.slice(0, 200)}`);
    }

    const data = JSON.parse(text);

    return (data.features || []).map(f => {
      const p = f.properties || {};
      const coords = (f.geometry && f.geometry.coordinates) || [];
      const lat = Number(p.lat ?? coords[1]);
      const lng = Number(p.lon ?? coords[0]);

      return {
        id: p.place_id || `${group.kind}-${lng}-${lat}`,
        kind: group.kind,
        name: titleFor(group.kind, p),
        lat,
        lng,
        address: p.formatted || p.address_line2 || "",
        categories: p.categories || [],
        priceType: (() => {
          const raw = (p.datasource && p.datasource.raw) || {};
          const fee = String(raw.fee || "").toLowerCase();
          if (fee === "no" || fee === "false" || fee === "0") return "free";
          if (fee === "yes" || fee === "true") return "paid";
          return "unknown";
        })()
      };
    }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      service: "CamperFree Geoapify POI API",
      version: "1.8",
      configured: Boolean(process.env.GEOAPIFY_API_KEY)
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "Metodo non consentito" });
  }

  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) {
    return sendJson(res, 500, {
      ok: false,
      error: "GEOAPIFY_API_KEY non configurata su Vercel"
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    let samples = (body.samples || [])
      .map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (!samples.length) {
      return sendJson(res, 400, { ok: false, error: "Nessun punto percorso" });
    }

    samples = thinSamples(samples, 2);

    const radius = Math.round(
      Math.max(5000, Math.min(12000, (Number(body.corridorKm) || 10) * 1000))
    );

    const jobs = [];
    for (const s of samples) {
      for (const g of GROUPS) jobs.push(geoFetch(key, s, radius, g));
    }

    const settled = await Promise.allSettled(jobs);

    const pois = [];
    const seen = new Set();
    let failed = 0;
    const errors = [];

    for (const x of settled) {
      if (x.status !== "fulfilled") {
        failed++;
        errors.push(String(x.reason && x.reason.message ? x.reason.message : x.reason));
        continue;
      }

      for (const p of x.value) {
        const k = p.id || `${p.kind}|${p.lat.toFixed(5)}|${p.lng.toFixed(5)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        pois.push(p);
      }
    }

    return sendJson(res, 200, {
      ok: true,
      source: "geoapify",
      version: "1.8",
      pois,
      partial: failed > 0,
      failed,
      errors: errors.slice(0, 3)
    });

  } catch (e) {
    return sendJson(res, 502, {
      ok: false,
      error: "Errore Geoapify",
      detail: e && e.message ? e.message : String(e)
    });
  }
};
