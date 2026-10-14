// Development-only same-origin relay. The upstream address and model are fixed.
function createJevMiddleware({getKey=()=>process.env.JEV_API_KEY,fetchImpl=fetch,timeoutMs=8000}={}) {
  return (req,res,next)=>{
    if(req.url.split('?')[0]!=='/api/jev')return next();
    const send=(status,value)=>{if(res.destroyed || res.writableEnded)return;res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
    if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'METHOD_NOT_ALLOWED'});}
    if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'ORIGIN_NOT_ALLOWED'});}catch{return send(403,{error:'ORIGIN_NOT_ALLOWED'});}}
    const key=(getKey() || '').trim();if(!key)return send(503,{error:'JEV_NOT_CONFIGURED'});
    let raw='',bytes=0,tooLarge=false;
    req.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>65536){tooLarge=true;raw='';send(413,{error:'REQUEST_TOO_LARGE'});}else if(!tooLarge)raw+=chunk.toString();});
    req.on('error',()=>send(400,{error:'INVALID_REQUEST'}));
    req.on('end',async()=>{
      if(tooLarge || res.writableEnded)return;
      let payload;
      try{payload=JSON.parse(raw);const questions=Object.values(payload.questions || {});
        if(payload.state===undefined || !questions.length || questions.length>3 || !questions.every(q=>q && ['choice','noul'].includes(q.type)))throw new Error('Invalid request');
      }catch{return send(400,{error:'INVALID_REQUEST'});}
      const controller=new AbortController();let timedOut=false;
      const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
      const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
      try {
        const upstream=await fetchImpl('https://api.typesafe.ai/v1/systemone',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:'jev-latest',state:payload.state,questions:payload.questions})});
        if(!upstream.ok)return send(upstream.status,{error:`JEV_UPSTREAM_${upstream.status}`});
        const data=await upstream.json();if(!data.answers || typeof data.answers!=='object')return send(502,{error:'INVALID_JEV_RESPONSE'});
        send(200,{model:data.model,answers:data.answers,usage:data.usage});
      } catch {send(timedOut?504:502,{error:timedOut?'JEV_TIMEOUT':'JEV_UNAVAILABLE'});}
      finally {clearTimeout(timer);res.off('close',cancel);}
    });
  };
}
module.exports={createJevMiddleware};
