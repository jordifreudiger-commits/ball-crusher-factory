// MediaRecorder may omit/falsify duration in fragmented files. Finalize headers
// without transcoding or changing encoded audio/video samples.
const text=(b,a,n)=>String.fromCharCode(...b.subarray(a,a+n));
export function fixMP4(bytes,seconds){
 const b=bytes.slice(),v=new DataView(b.buffer,b.byteOffset,b.byteLength);let movieScale=1000,patched=0;
 function boxes(start,end,visit){for(let p=start;p+8<=end;){let n=v.getUint32(p),h=8;if(n===1){n=Number(v.getBigUint64(p+8));h=16;}if(n===0)n=end-p;if(n<h||p+n>end)throw Error('Ungültige MP4-Struktur');visit(text(b,p+4,4),p+h,p+n);p+=n;}}
 function write(at,version,scale){const value=Math.round(seconds*scale);if(version===1)v.setBigUint64(at,BigInt(value));else v.setUint32(at,Math.min(value,0xffffffff));patched++;}
 function walk(start,end){boxes(start,end,(type,a,z)=>{
  if(['moov','trak','mdia','mvex'].includes(type))walk(a,z);
  else if(type==='mvhd'||type==='mdhd'){const version=b[a],scale=v.getUint32(a+(version===1?20:12));if(type==='mvhd')movieScale=scale;write(a+(version===1?24:16),version,scale);}
  else if(type==='tkhd')write(a+(b[a]===1?28:20),b[a],movieScale);
  else if(type==='mehd')write(a+4,b[a],movieScale);
 });}
 walk(0,b.length);if(!patched)throw Error('MP4-Zeitinformationen fehlen');return b;
}
function vint(b,p,id=false){let n=1,mask=128;while(n<=8&&!(b[p]&mask)){n++;mask>>=1;}if(n>8||p+n>b.length)throw Error('Ungültige WebM-Struktur');let value=id?b[p]:b[p]&(mask-1);let unknown=!id&&value===mask-1;for(let i=1;i<n;i++){value=value*256+b[p+i];unknown=unknown&&b[p+i]===255;}return {n,value,unknown};}
function elements(b,start,end){const out=[];for(let p=start;p<end;){const id=vint(b,p,true),size=vint(b,p+id.n),a=p+id.n+size.n,z=size.unknown?end:a+size.value;if(z>end||z<=p)throw Error('Ungültige WebM-Länge');out.push({id:id.value,start:p,a,z});p=z;}return out;}
function sizeVint(value){let n=1;while(value>=2**(7*n)-1)n++;const b=new Uint8Array(n);for(let i=n-1;i>=0;i--){b[i]=value%256;value=Math.floor(value/256);}b[0]|=1<<(8-n);return b;}
function join(parts){const b=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let p=0;for(const part of parts){b.set(part,p);p+=part.length;}return b;}
export function fixWebM(b,seconds){
 const root=elements(b,0,b.length),segment=root.find(e=>e.id===0x18538067);if(!segment)throw Error('WebM-Segment fehlt');
 const children=elements(b,segment.a,segment.z);let found=false;
 const parts=children.filter(e=>![0x114d9b74,0x1c53bb6b].includes(e.id)).map(e=>{
  if(e.id!==0x1549a966)return b.subarray(e.start,e.z);
  found=true;const info=elements(b,e.a,e.z);const scaleElement=info.find(x=>x.id===0x2ad7b1);let scale=1000000;
  if(scaleElement){scale=0;for(const byte of b.subarray(scaleElement.a,scaleElement.z))scale=scale*256+byte;}
  const duration=new Uint8Array(11);duration.set([0x44,0x89,0x88]);new DataView(duration.buffer).setFloat64(3,seconds*1e9/scale);
  const body=join([...info.filter(x=>x.id!==0x4489).map(x=>b.subarray(x.start,x.z)),duration]);
  return join([new Uint8Array([0x15,0x49,0xa9,0x66]),sizeVint(body.length),body]);
 });if(!found)throw Error('WebM-Zeitinformationen fehlen');
 // Index entries refer to old offsets: omit optional SeekHead/Cues rather than
 // emitting invalid positions. Decoders can still scan the unchanged clusters.
 return join([b.subarray(0,segment.start),new Uint8Array([0x18,0x53,0x80,0x67,0x01,255,255,255,255,255,255,255]),...parts]);
}
export async function finalizeVideo(blob,seconds){if(!Number.isFinite(seconds)||seconds<=0)throw Error('Aufnahmedauer fehlt');const b=new Uint8Array(await blob.arrayBuffer());return new Blob([blob.type.startsWith('video/mp4')?fixMP4(b,seconds):fixWebM(b,seconds)],{type:blob.type});}
