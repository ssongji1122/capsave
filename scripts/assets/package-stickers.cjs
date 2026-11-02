// Separate transparent generated sheets into deliverable files without redrawing them.
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const sources = require('../sticker-sources.json');
const out = path.resolve('apps/web/public/stickers');
(async () => {
 await fs.mkdir(out, {recursive:true});
 const result=[];
 const existing = JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8').catch(()=>'[]'));
 for (const source of sources) {
  if(path.resolve(source.path)!==path.join(out,source.name+'.png')) await fs.copyFile(source.path, path.join(out, source.name+'.png'));
  const { data, info } = await sharp(source.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];
  for(let i=0;i<w*h;i++) {
   if(seen[i]||data[i*4+3]<160)continue;
   let start=0,end=1;queue[0]=i;seen[i]=1;
   let left=w,top=h,right=0,bottom=0,count=0;
   while(start<end){const p=queue[start++],x=p%w,y=Math.floor(p/w);count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=160){seen[n]=1;queue[end++]=n;}
   }
   if(count>3000)components.push({left,top,right,bottom,count});
  }
  // Disconnected parts of one sticker (for example a float and fish) may share a box.
  while(components.length>10){
   let merged=false;
   for(let a=0;a<components.length&&!merged;a++)for(let b=a+1;b<components.length;b++){
    const x=components[a],y=components[b];
    if(x.left<=y.right&&y.left<=x.right&&x.top<=y.bottom&&y.top<=x.bottom){
     components[a]={left:Math.min(x.left,y.left),right:Math.max(x.right,y.right),top:Math.min(x.top,y.top),bottom:Math.max(x.bottom,y.bottom),count:x.count+y.count};components.splice(b,1);merged=true;break;
    }
   }
   if(!merged)break;
  }
  if(components.length!==10)throw Error(source.name+': expected 10 complete silhouettes, found '+components.length);
  components.sort((a,b)=>Math.floor((a.top+a.bottom)/2/(h/2))-Math.floor((b.top+b.bottom)/2/(h/2))||a.left-b.left);
  for(let i=0;i<components.length;i++){
   const c=components[i],left=Math.max(0,c.left-5),top=Math.max(0,c.top-5),right=Math.min(w,c.right+6),bottom=Math.min(h,c.bottom+6);
   const file=source.name+'-'+String(i+1).padStart(2,'0')+'.png';
   await sharp(source.path).extract({left,top,width:right-left,height:bottom-top}).png().toFile(path.join(out,file));
   result.push({id:result.length+1,theme:source.name,file,subject:source.subjects.split(', ')[i],label:existing.find(item=>item.file===file)?.label ?? source.subjects.split(', ')[i]});
  }
  console.log(source.name+': 10 transparent stickers separated');
 }
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(result,null,2));
 console.log('Total: '+result.length);
})().catch(e=>{console.error(e.message);process.exit(1)});
