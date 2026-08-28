const GEO_URL = "https://api.geoapify.com/v2/places";

const GROUPS = [
  { kind:"camp", categories:"camping.caravan_site,camping.camp_site,camping.camp_pitch" },
  { kind:"fuel", categories:"service.vehicle.fuel" },
  { kind:"charge", categories:"service.vehicle.charging_station" },
  { kind:"service", categories:"amenity.drinking_water,amenity.toilet" },
  { kind:"stop", categories:"parking" }
];

function json(res,status,obj){
  res.status(status).setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  return res.send(JSON.stringify(obj));
}

function thinSamples(samples,max=2){
  if(samples.length<=max) return samples;
  const out=[];
  for(let i=0;i<max;i++) out.push(samples[Math.round(i*(samples.length-1)/(max-1))]);
  return out;
}

function titleFor(kind,p){
  if(p.name) return p.name;
  if(kind==="camp") return "Campeggio / area camper";
  if(kind==="fuel") return "Carburante";
  if(kind==="charge") return "Ricarica";
  if(kind==="service") return "Servizio";
  return "Sosta / parcheggio";
}

async function geoFetch(key, sample, radius, group){
  const q=new URLSearchParams({
    categories:group.categories,
    filter:`circle:${sample.lng},${sample.lat},${radius}`,
    bias:`proximity:${sample.lng},${sample.lat}`,
    limit:"20",
    lang:"it",
    apiKey:key
  });
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const r=await fetch(`${GEO_URL}?${q}`,{signal:controller.signal});
    const txt=await r.text();
    if(!r.ok) throw new Error(`Geoapify ${r.status}: ${txt.slice(0,180)}`);
    const data=JSON.parse(txt);
    return (data.features||[]).map(f=>{
      const p=f.properties||{};
      return {
        id:p.place_id || `${group.kind}-${p.lon}-${p.lat}`,
        kind:group.kind,
        name:titleFor(group.kind,p),
        lat:Number(p.lat ?? f.geometry?.coordinates?.[1]),
        lng:Number(p.lon ?? f.geometry?.coordinates?.[0]),
        address:p.formatted || p.address_line2 || "",
        categories:p.categories||[]
      };
    }).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  } finally { clearTimeout(timer); }
}

export default async function handler(req,res){
  if(req.method==="GET"){
    return json(res,200,{
      ok:true, service:"CamperFree Geoapify POI API", version:"1.7.3",
      configured:Boolean(process.env.GEOAPIFY_API_KEY)
    });
  }
  if(req.method!=="POST") return json(res,405,{ok:false,error:"Metodo non consentito"});

  const key=process.env.GEOAPIFY_API_KEY;
  if(!key) return json(res,500,{ok:false,error:"GEOAPIFY_API_KEY non configurata su Vercel"});

  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
    let samples=(body.samples||[])
      .map(p=>({lat:Number(p.lat),lng:Number(p.lng)}))
      .filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));

    if(!samples.length) return json(res,400,{ok:false,error:"Nessun punto percorso"});
    samples=thinSamples(samples,2);
    const radius=Math.round(Math.max(5000,Math.min(12000,(Number(body.corridorKm)||10)*1000)));

    // 2 route samples x 5 groups = max 10 lightweight requests.
    // allSettled lets partial POIs survive a provider/network error.
    const jobs=[];
    for(const s of samples) for(const g of GROUPS) jobs.push(geoFetch(key,s,radius,g));
    const settled=await Promise.allSettled(jobs);

    const pois=[], seen=new Set();
    let failed=0;
    for(const x of settled){
      if(x.status!=="fulfilled"){ failed++; continue; }
      for(const p of x.value){
        const k=p.id || `${p.kind}|${p.lat.toFixed(5)}|${p.lng.toFixed(5)}`;
        if(seen.has(k)) continue;
        seen.add(k); pois.push(p);
      }
    }

    return json(res,200,{ok:true,source:"geoapify",pois,partial:failed>0,failed});
  }catch(e){
    return json(res,502,{ok:false,error:"Errore Geoapify",detail:e?.message||String(e)});
  }
}
