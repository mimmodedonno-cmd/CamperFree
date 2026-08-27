const ENDPOINTS=[
 "https://overpass-api.de/api/interpreter",
 "https://overpass.kumi.systems/api/interpreter"
];
const rad=x=>x*Math.PI/180;
function km(a,b,c,d){const R=6371,x=rad(c-a),y=rad(d-b),q=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function near(lat,lng,s){let m=Infinity;for(const p of s)m=Math.min(m,km(lat,lng,p.lat,p.lng));return m}
function makeQuery(s,r){return `[out:json][timeout:28];(${s.map(p=>`
nwr(around:${r},${p.lat},${p.lng})["tourism"="camp_site"];
nwr(around:${r},${p.lat},${p.lng})["tourism"="caravan_site"];
nwr(around:${r},${p.lat},${p.lng})["amenity"="fuel"];
nwr(around:${r},${p.lat},${p.lng})["amenity"="drinking_water"];
nwr(around:${r},${p.lat},${p.lng})["amenity"="sanitary_dump_station"];
nwr(around:${r},${p.lat},${p.lng})["amenity"="charging_station"];`).join("")});out center tags;`}
function classify(t={}){if(t.amenity==="fuel")return["fuel","⛽","Carburante"];if(t.amenity==="charging_station")return["charge","⚡","Ricarica elettrica"];if(["drinking_water","sanitary_dump_station"].includes(t.amenity))return["service","💧","Servizio camper"];if(t.tourism==="camp_site")return["camp","⛺","Campeggio"];if(t.tourism==="caravan_site")return["free","🚐","Area camper"];return null}
async function callOverpass(query){
 let last;
 for(const ep of ENDPOINTS){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);
  try{
   const r=await fetch(ep,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8","accept":"application/json"},body:"data="+encodeURIComponent(query),signal:c.signal});
   if(!r.ok)throw Error("Overpass "+r.status);
   const d=await r.json(); if(Array.isArray(d.elements))return d.elements;
  }catch(e){last=e}finally{clearTimeout(timer)}
 }
 throw last||Error("Overpass unavailable")
}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"POST required"});
 try{
  let s=(req.body?.samples||[]).map(p=>({lat:+p.lat,lng:+p.lng})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)).slice(0,36);
  if(!s.length)return res.status(400).json({ok:false,error:"route"});
  const corridor=Math.max(2,Math.min(25,+req.body.corridorKm||10));
  const radius=Math.max(9000,Math.min(16000,(corridor+4)*1000));
  const chunks=[];for(let i=0;i<s.length;i+=4)chunks.push(s.slice(i,i+4));
  let elements=[];
  for(let i=0;i<chunks.length;i+=3){
    const settled=await Promise.allSettled(chunks.slice(i,i+3).map(c=>callOverpass(makeQuery(c,radius))));
    for(const r of settled)if(r.status==="fulfilled")elements.push(...r.value);
  }
  if(!elements.length)return res.status(200).json({ok:true,pois:[],source:"overpass-empty"});
  const seen=new Set(),pois=[];
  for(const e of elements){
   const key=e.type+":"+e.id;if(seen.has(key))continue;seen.add(key);
   const lat=e.lat??e.center?.lat,lng=e.lon??e.center?.lon,info=classify(e.tags);
   if(!Number.isFinite(lat)||!Number.isFinite(lng)||!info)continue;
   const dist=near(lat,lng,s); if(dist>corridor*1.45)continue;
   pois.push({lat,lng,name:e.tags?.name||info[2],meta:info[2]+" · "+dist.toFixed(1)+" km dal percorso",kind:info[0],emoji:info[1]});
  }
  pois.sort((a,b)=>parseFloat(a.meta.match(/([\d.]+) km/)?.[1]||999)-parseFloat(b.meta.match(/([\d.]+) km/)?.[1]||999));
  res.setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300");
  return res.status(200).json({ok:true,pois:pois.slice(0,700),source:"overpass"});
 }catch(e){console.error(e);return res.status(502).json({ok:false,error:"POI provider unavailable"})}
};