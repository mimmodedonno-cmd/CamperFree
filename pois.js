const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

function classify(t = {}) {
  if (t.amenity === "fuel") return ["fuel", "⛽", "Carburante"];
  if (t.amenity === "charging_station") return ["charge", "⚡", "Ricarica elettrica"];
  if (t.amenity === "drinking_water" || t.amenity === "sanitary_dump_station")
    return ["service", "💧", "Servizio camper"];
  if (t.tourism === "camp_site") return ["camp", "⛺", "Campeggio"];
  if (t.tourism === "caravan_site") return ["free", "🚐", "Area camper"];
  return null;
}

const rad = x => x * Math.PI / 180;
function km(a,b,c,d){
  const R=6371, x=rad(c-a), y=rad(d-b);
  const q=Math.sin(x/2)**2 + Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function nearest(lat,lng,samples){
  let m=Infinity;
  for(const p of samples) m=Math.min(m, km(lat,lng,p.lat,p.lng));
  return m;
}

function buildAroundQuery(samples, radiusM) {
  const coords = samples.map(p => `${p.lat},${p.lng}`).join(",");
  return `[out:json][timeout:22];
(
  nwr(around:${radiusM},${coords})["tourism"="camp_site"];
  nwr(around:${radiusM},${coords})["tourism"="caravan_site"];
  nwr(around:${radiusM},${coords})["amenity"="fuel"];
  nwr(around:${radiusM},${coords})["amenity"="drinking_water"];
  nwr(around:${radiusM},${coords})["amenity"="sanitary_dump_station"];
  nwr(around:${radiusM},${coords})["amenity"="charging_station"];
);
out center tags;`;
}

async function callOverpass(query) {
  let lastError;
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);
    try {
      const url = endpoint + "?data=" + encodeURIComponent(query);
      const r = await fetch(url, {
        method: "GET",
        headers: { "accept": "application/json" },
        signal: controller.signal,
        cache: "no-store"
      });
      if (!r.ok) throw new Error(`Overpass ${r.status}`);
      const data = await r.json();
      if (Array.isArray(data.elements)) return data.elements;
      throw new Error("Invalid Overpass response");
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("Overpass unavailable");
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "CamperFree POI API",
      version: "1.5.1",
      message: "Use POST with route samples"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST required" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    let samples = Array.isArray(body.samples) ? body.samples : [];
    samples = samples
      .map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    if (!samples.length) {
      return res.status(400).json({ ok: false, error: "Missing route samples" });
    }

    if (samples.length > 18) {
      const reduced = [];
      for (let i = 0; i < 18; i++) {
        reduced.push(samples[Math.round(i * (samples.length - 1) / 17)]);
      }
      samples = reduced;
    }

    const corridorKm = Math.max(3, Math.min(20, Number(body.corridorKm) || 10));
    const radiusM = Math.round((corridorKm + 3) * 1000);

    const query = buildAroundQuery(samples, radiusM);
    const elements = await callOverpass(query);

    const seen = new Set();
    const pois = [];
    const counts = { free:0, camp:0, fuel:0, service:0, charge:0 };

    for (const el of elements) {
      const key = `${el.type}:${el.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const info = classify(el.tags || {});
      if (!info) continue;

      const dist = nearest(lat, lng, samples);
      if (dist > corridorKm * 1.6) continue;

      counts[info[0]]++;
      pois.push({
        lat,
        lng,
        name: el.tags?.name || info[2],
        meta: `${info[2]} · ${dist.toFixed(1)} km dal percorso`,
        kind: info[0],
        emoji: info[1]
      });
    }

    pois.sort((a,b) => {
      const da = parseFloat(a.meta.match(/([\d.]+) km/)?.[1] || 999);
      const db = parseFloat(b.meta.match(/([\d.]+) km/)?.[1] || 999);
      return da - db;
    });

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=240");
    return res.status(200).json({
      ok: true,
      version: "1.5.1",
      counts,
      pois: pois.slice(0, 700)
    });

  } catch (e) {
    console.error("CamperFree POI API error:", e);
    return res.status(502).json({
      ok: false,
      error: "POI provider unavailable",
      detail: String(e && e.message ? e.message : e)
    });
  }
};
