const {getDefaultConfig}=require('expo/metro-config');
const {createJevMiddleware}=require('./scripts/jevProxy.cjs');
require('@expo/env').load(__dirname);
const config=getDefaultConfig(__dirname);
const enhance=config.server.enhanceMiddleware;
const jev=createJevMiddleware();
config.server.enhanceMiddleware=(middleware,server)=>{
  const base=enhance?enhance(middleware,server):middleware;
  return (req,res,next)=>jev(req,res,()=>base(req,res,next));
};
module.exports=config;
