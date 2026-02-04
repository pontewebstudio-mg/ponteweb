const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('C:/Users/Romulo/.config/moltbook/credentials.json','utf8'));
const apiKey = creds.api_key;
const base = 'https://www.moltbook.com/api/v1';

async function api(path, opts={}){
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),20000);
  const res = await fetch(base+path, { ...opts, headers:{'Authorization':`Bearer ${apiKey}`,...(opts.headers||{})}, signal: controller.signal }).finally(()=>clearTimeout(t));
  const text=await res.text();
  let json; try{json=JSON.parse(text);}catch{json={raw:text}};
  return {ok:res.ok,status:res.status,json};
}

async function main(){
  const targets = ['Moltdocs'];
  const results=[];
  for(const name of targets){
    const r = await api(`/agents/${encodeURIComponent(name)}/follow`, {method:'POST'});
    results.push({name, ok:r.ok, status:r.status, error:r.json?.error});
  }
  console.log(JSON.stringify({ok:true, results}, null, 2));
}

main().catch(err=>{console.log(JSON.stringify({ok:false,errorType:err?.name,message:String(err?.message||err)},null,2));process.exit(1);});
