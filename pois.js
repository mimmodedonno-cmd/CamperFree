const ENDPOINTS=[
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

const rad=x=>x*Math.PI/180;
function km(a,b,c,d){
  const R=6371, x=rad(c-a), y=rad(d-b);
  const q=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function nearest(lat,lng,samples){
  let best=Infinity;
  for(const p of samples) best=Math.min(best,km(lat,lng,p.lat,p.lng));
  return best;
}
function classify(t={}){
  if(t.amenity==="fuel") return ["fuel","⛽","Carburante"];
  if(t.amenity==="charging_station") return ["charge","⚡","Ricarica elettrica"];
  if(t.amenity==="drinking_water" || t.amenity==="sanitary_dump_station") return ["service","💧","Servizio camper"];
  if(t.tourism==="camp_site") return ["camp","⛺","Campeggio"];
  if(t.tourism==="caravan_site") return ["free","🚐","Area camper"];
  return null;
}
function query(samples,radius){
  const coords=samples.map(p=>`${p.lat},${p.lng}`).join(",");
  return `[out:json][timeout:18];
(
 nwr(around:${radius},${coords})["tourism"="camp_site"];
 nwr(around:${radius},${coords})["tourism"="caravan_site"];
 nwr(around:${radius},${coords})["amenity"="fuel"];
 nwr(around:${radius},${coords})["amenity"="drinking_water"];
 nwr(around:${radius},${coords})["amenity"="sanitary_dump_station"];
 nwr(around:${radius},${coords})["amenity"="charging_station"];
);
out center tags;`;
}
async function askOverpass(q){
  let last;
  for(const endpoint of ENDPOINTS){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9000);
    try{
      const r=await fetch(endpoint,{
        method:"POST",
        headers:{
          "content-type":"application/x-www-form-urlencoded;charset=UTF-8",
          "accept":"application/json"
        },
        body:"data="+encodeURIComponent(q),
        signal:controller.signal
      });
      if(!r.ok) throw new Error("Overpass HTTP "+r.status);
      const data=await r.json();
      if(Array.isArray(data.elements)) return data.elements;
      throw new Error("Risposta Overpass non valida");
    }catch(e){ last=e; }
    finally{ clearTimeout(timer); }
  }
  throw last || new Error("Overpass non disponibile");
}

module.exports=async function handler(req,res){
  if(req.method==="GET"){
    return res.status(200).json({
      ok:true,service:"CamperFree POI API",version:"1.6",
      message:"API attiva. Usa POST per i POI del percorso."
    });
  }
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"POST required"});

  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
    let samples=(body.samples||[])
      .map(p=>({lat:Number(p.lat),lng:Number(p.lng)}))
      .filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));

    if(!samples.length) return res.status(400).json({ok:false,error:"Percorso mancante"});

    if(samples.length>16){
      const reduced=[];
      for(let i=0;i<16;i++) reduced.push(samples[Math.round(i*(samples.length-1)/15)]);
      samples=reduced;
    }

    const corridor=Math.max(3,Math.min(20,Number(body.corridorKm)||10));
    const radius=Math.round((corridor+5)*1000);
    const elements=await askOverpass(query(samples,radius));

    const seen=new Set(), pois=[];
    const counts={free:0,camp:0,fuel:0,service:0,charge:0};

    for(const e of elements){
      const key=`${e.type}:${e.id}`;
      if(seen.has(key)) continue;
      seen.add(key);

      const lat=e.lat ?? e.center?.lat;
      const lng=e.lon ?? e.center?.lon;
      if(!Number.isFinite(lat)||!Number.isFinite(lng)) continue;

      const info=classify(e.tags||{});
      if(!info) continue;

      const dist=nearest(lat,lng,samples);
      if(dist>corridor*1.8) continue;

      counts[info[0]]++;
      pois.push({
        lat,lng,
        name:e.tags?.name||info[2],
        meta:`${info[2]} · ${dist.toFixed(1)} km dal percorso`,
        kind:info[0],emoji:info[1]
      });
    }

    pois.sort((a,b)=>{
      const da=parseFloat(a.meta.match(/([\d.]+) km/)?.[1]||999);
      const db=parseFloat(b.meta.match(/([\d.]+) km/)?.[1]||999);
      return da-db;
    });

    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({
      ok:true,version:"1.6",counts,pois:pois.slice(0,700)
    });
  }catch(e){
    console.error(e);
    return res.status(502).json({
      ok:false,error:"Servizio POI non disponibile",
      detail:String(e?.message||e)
    });
  }
};