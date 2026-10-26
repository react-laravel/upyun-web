import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const root=fs.realpathSync(process.cwd())
const start=createRequire(path.join(root,'package.json'))
function resolvePackage(req,name){
 let entry
 try{entry=req.resolve(name+'/package.json')}catch{entry=req.resolve(name)}
 let p=path.dirname(entry)
 if(path.basename(entry)==='package.json')p=path.dirname(entry)
 while(p!==path.dirname(p)){
  const manifest=path.join(p,'package.json')
  if(fs.existsSync(manifest)){
   const meta=JSON.parse(fs.readFileSync(manifest,'utf8'))
   if(meta.name===name)return [fs.realpathSync(p),meta]
  }
  p=path.dirname(p)
 }
 throw new Error('Package manifest could not be resolved: '+name)
}
const found=new Map(),pending=[]
for(const n of ['express','multer','basic-ftp'])pending.push(resolvePackage(start,n))
while(pending.length){
 const [dir,meta]=pending.shift()
 if(found.has(dir))continue
 if(!dir.startsWith(root+'/node_modules/'))throw new Error('Dependency outside installed application')
 found.set(dir,meta)
 const req=createRequire(path.join(dir,'package.json'))
 for(const name of Object.keys(meta.dependencies||{}))pending.push(resolvePackage(req,name))
 for(const name of Object.keys(meta.optionalDependencies||{})){
  try{pending.push(resolvePackage(req,name))}catch{}
 }
 for(const name of Object.keys(meta.peerDependencies||{})){
  try{pending.push(resolvePackage(req,name))}catch(error){if(!meta.peerDependenciesMeta?.[name]?.optional)throw error}
 }
}
const packages=[...found].map(([dir,meta])=>({relative:path.relative(root,dir),name:meta.name,version:meta.version})).sort((a,b)=>a.relative.localeCompare(b.relative))
let total=0, files=0
for(const item of packages){
 const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name==='node_modules')continue
  const p=path.join(dir,entry.name)
  if(entry.isDirectory())visit(p)
  else if(entry.isFile()){total+=fs.statSync(p).size;files++}
  else if(entry.isSymbolicLink())throw new Error('Unexpected package symlink')
 }};visit(path.join(root,item.relative))
}
console.log(JSON.stringify({source:root,runtime_roots:['express','multer','basic-ftp'],package_count:packages.length,package_files:files,package_file_bytes:total,packages},null,2))
