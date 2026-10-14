const assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createJevMiddleware}=require('./jevProxy.cjs');
function invoke(middleware,body,options={}) {
  const req=new EventEmitter(),res=new EventEmitter();Object.assign(req,{url:'/api/jev',method:'POST',headers:{host:'localhost:8081',origin:'http://localhost:8081'},...options});
  let resolve;const done=new Promise(r=>resolve=r);res.headers={};res.setHeader=(key,value)=>res.headers[key]=value;res.end=raw=>{res.writableEnded=true;resolve({status:res.statusCode,body:JSON.parse(raw)});};
  middleware(req,res,()=>resolve({next:true}));req.emit('data',typeof body==='string'?body:JSON.stringify(body));req.emit('end');return {req,res,done};
}
const body={model:'arbitrary-model',state:'Sample dialogue',questions:{pick:{type:'choice',criteria:{yes:'fits',none:'none'}}}};
(async()=>{
  let sent;
  const middleware=createJevMiddleware({getKey:()=> 'server-secret',fetchImpl:async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({model:'jev',answers:{pick:{type:'choice',choice:'yes'}},usage:{input_tokens:5}})};}});
  let result=await invoke(middleware,body).done;assert.equal(result.status,200);assert.equal(sent.url,'https://api.typesafe.ai/v1/systemone');assert.equal(sent.options.headers.Authorization,'Bearer server-secret');assert.equal(JSON.parse(sent.options.body).model,'jev-latest');assert.ok(!JSON.stringify(result).includes('server-secret'));
  assert.equal((await invoke(middleware,body,{url:'/other'}).done).next,true);
  assert.equal((await invoke(middleware,body,{method:'GET'}).done).status,405);
  assert.equal((await invoke(middleware,body,{headers:{host:'localhost:8081',origin:'https://other.example'}}).done).status,403);
  assert.equal((await invoke(middleware,'not json').done).status,400);
  assert.equal((await invoke(middleware,'x'.repeat(65537)).done).status,413);
  assert.equal((await invoke(createJevMiddleware({getKey:()=>''}),body).done).status,503);
  const timeout=createJevMiddleware({getKey:()=> 'secret',timeoutMs:2,fetchImpl:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
  assert.equal((await invoke(timeout,body).done).status,504);
  let aborted=false;
  const cancel=createJevMiddleware({getKey:()=> 'secret',fetchImpl:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));}))});
  const pending=invoke(cancel,body);pending.res.destroyed=true;pending.res.emit('close');await new Promise(setImmediate);assert.equal(aborted,true);
  console.log('PASS: same-origin Jev relay, server-only credential, fixed upstream/model, body limits, invalid requests, timeout and client cancellation');
})().catch(error=>{console.error(error);process.exitCode=1;});
