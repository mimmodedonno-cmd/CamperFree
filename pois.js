const ENDPOINTS=[
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
];
const rad=x=>x*Math.PI/180;
function km(a,b,c,d){const R=6371,x=rad(c-a),y=rad(d-b),q=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function nearest(lat,lng,samples){let best=Infinity;for(const p of samples)best=Math.min(best,km(lat,lng,p.lat,p.lng));return best}
function classify(t={}){
  if(t.amenity==="fuel")return["fuel","⛽","Carburante"];
  if(t.amenity==="charging_station")return["charge","⚡","Ricarica elettrica"];
  if(t.amenity==="drinking_water"||t.amenity==="sanitary_dump_station")return["service","💧","Servizio camper"];
  if(t.tourism==="camp_site")return["camp","⛺","Campeggio"];
  if(t.tourism==="caravan_site")return["free","🚐","Area camper"];
  return null
}
function q(samples,radius){
 const around=samples.map(p=>`nwr(around:${radius},${p.lat},${p.lng})`).join(";");
 const blocks=samples.map(p=>`
 nwr(around:${radius},${p.lat},${p.lng})["tourism"="camp_site"];
 nwr(around:${radius},${p.lat},${p.lng})["tourism"="caravan_site"];
 nwr(around:${radius},${p.lat},${p.lng})["amenity"="fuel"];
 nwr(around:${radius},${p.lat},${p.lng})["amenity"="drinking_water"];
 nwr(around:${radius},${p.lat},${p.lng})["amenity"="sanitary_dump_station"];
 nwr(around:${radius},${p.lat},${p.lng})["amenity"="charging_station"];`).join("");
 return `[out:json][timeout:22];(${blocks});out center tags;`
}
async function ask(query){
 let last;
 for(const endpoint of ENDPOINTS){
   const c=new AbortController(),t=setTimeout(()=>c.abort(),24000);
   try{
     const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(query),signal:c.signal});
     if(!r.ok)throw new Error("Overpass HTTP "+r.status);
     const data=await r.json();
     if(Array.isArray(data.elements))return data.elements;
   }catch(e){last=e}finally{clearTimeout(t)}
 }
 throw last||new Error("Overpass non disponibile")
}
module.exports=async function(req,res){
 if(req.method==="GET")return res.status(200).json({ok:true,service:"CamperFree POI API",version:"1.7.1"});
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"POST required"});
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
  let samples=(body.samples||[]).map(p=>({lat:Number(p.lat),lng:Number(p.lng)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  if(!samples.length)return res.status(400).json({ok:false,error:"Percorso mancante"});
  if(samples.length>10){const x=[];for(let i=0;i<10;i++)x.push(samples[Math.round(i*(samples.length-1)/9)]);samples=x}
  const corridor=Math.max(5,Math.min(18,Number(body.corridorKm)||10));
  const elements=await ask(q(samples,Math.round((corridor+1)*1000)));
  const seen=new Set(),pois=[];
  for(const e of elements){
    const key=e.type+":"+e.id;if(seen.has(key))continue;seen.add(key);
    const lat=e.lat??e.center?.lat,lng=e.lon??e.center?.lon;if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
    const info=classify(e.tags||{});if(!info)continue;
    const d=nearest(lat,lng,samples);if(d>corridor*1.8)continue;
    pois.push({lat,lng,name:e.tags?.name||info[2],meta:`${info[2]} · ${d.toFixed(1)} km dal percorso`,kind:info[0],emoji:info[1]});
  }
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({ok:true,version:"1.7.1",pois:pois.slice(0,700)});
 }catch(e){
  console.error(e);
  return res.status(502).json({ok:false,error:"Servizio POI non disponibile",detail:String(e?.message||e)})
 }
};