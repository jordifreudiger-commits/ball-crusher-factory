import {Simulation,ballCollision,wallCollision,distanceToSegment} from './physics.js';
export const CONFIG={
 9:{initial:['Startkugeln',3,1,24,1],gap:['Öffnung (°)',70,25,130,5],rotation:['Drehung (°/s, − = links)',12,-45,45,1],speed:['Kugeltempo',150,60,350,10],limit:['Kugellimit',48,8,96,1]},
 10:{team:['Kugeln pro Team',8,2,24,1],speed:['Kugeltempo',95,40,220,5],orbit:['Umlauftempo',2,0.5,5,.1],reach:['Reichweite',22,16,36,1],shield:['Schutzphase (s)',.8,.3,2,.1]},
 11:{bumpers:['Klangkörper',8,4,12,1],layout:['Anordnung: 0 = Kaskade, 1 = Zickzack',0,0,1,1],initial:['Startkugeln',3,1,12,1],limit:['Maximalkugeln',8,1,24,1],gravity:['Schwerkraft',100,40,240,10],addEvery:['Neue Kugel alle … s (0 = aus)',0,0,10,1],character:['Klang: 0 = Holz, 1 = Marimba',0,0,1,1]}
};
export const CURATED={
 9:[['Erster Ausbruch',{seed:1,initial:3,gap:70,rotation:12,speed:150,limit:24}],['Breites Tor',{seed:17,initial:6,gap:110,rotation:-18,speed:200,limit:64}],['Nadelöhr',{seed:39,initial:4,gap:35,rotation:6,speed:240,limit:32}]],
 10:[['Duell',{seed:1,team:8,speed:95,reach:22,orbit:2,shield:.8}],['Nahkampf',{seed:17,team:14,speed:140,reach:30,orbit:3,shield:.5}],['Zeitlupe',{seed:39,team:5,speed:60,reach:28,orbit:1,shield:1.3}]],
 11:[['Pentatonische Kaskade',{seed:1,bumpers:8,layout:0,initial:3,limit:6,gravity:100,addEvery:0,character:1}],['Holz-Zickzack',{seed:17,bumpers:10,layout:1,initial:4,limit:8,gravity:150,addEvery:0,character:0}],['Wachsender Garten',{seed:39,bumpers:12,layout:0,initial:2,limit:10,gravity:80,addEvery:4,character:1}]]
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function config(mode,values={}){return Object.fromEntries(Object.entries(CONFIG[mode]).map(([k,[,d,min,max,step]])=>{const value=clamp(Number.isFinite(+values[k])?+values[k]:d,min,max);return [k,step===1?Math.round(value):value];}));}
export function energyPoint(b,t,c){const a=b.phase+t*c.orbit;return {x:b.x+Math.cos(a)*c.reach,y:b.y+Math.sin(a)*c.reach};}
export function resolveConversions(balls,hits,time,shield){
 const pairs=new Set(hits.map(([a,b])=>`${a}:${b}`)),byId=new Map(balls.map(b=>[b.id,b]));const changes=new Map();
 for(const [a,b] of hits){if(pairs.has(`${b}:${a}`))continue;const from=byId.get(a),to=byId.get(b);if(from&&to&&from.team!==to.team&&from.protectedUntil<=time&&to.protectedUntil<=time)changes.set(b,from.team);}
 // A participant in a mutual hit cannot gain from processing order or other attackers.
 for(const [a,b] of hits)if(pairs.has(`${b}:${a}`)){changes.delete(a);changes.delete(b);}
 for(const [id,team] of changes){const b=byId.get(id);b.team=team;b.protectedUntil=time+shield;b.changedAt=time;}return changes.size;
}
export class StudioSimulation extends Simulation {
 constructor(options={}){
  super({...options,initial:0});this.c=config(this.mode,options);this.radius=265;this.duration=clamp(options.duration||30,15,60);this.limit=this.c.limit||48;
  this.escaped=0;this.ghosts=[];this.endAt=null;this.done=false;this.result='';this.events=0;this.nextAdd=this.c.addEvery;this.processed=new Set();
  const count=this.mode===10?this.c.team*2:Math.min(this.c.initial,this.limit);
  for(let i=0;i<count;i++){const b=this.spawn();if(this.mode===10){b.team=i%2;b.phase=this.random()*Math.PI*2;b.protectedUntil=0;b.changedAt=-10;}}
  this.bumpers=Array.from({length:this.c.bumpers||0},(_,i)=>({id:i,x:this.c.layout?((i%2?1:-1)*(75+(i%3)*25)):Math.sin(i*2.4)*155,y:-225+i*450/Math.max(1,this.c.bumpers-1),r:19,note:[261.63,293.66,329.63,392,440][i%5]*(i>7?2:1),hit:-10}));
 }
 spawn(){let x,y;for(let i=0;i<600;i++){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random())*175;x=Math.cos(a)*r;y=Math.sin(a)*r;if(this.balls.every(b=>Math.hypot(x-b.x,y-b.y)>23))break;}
  const b=this.makeBall(x,y);b.r=9;const a=this.random()*Math.PI*2,s=this.c.speed||70;b.vx=Math.cos(a)*s;b.vy=Math.sin(a)*s;b.contacts=new Set();b.cooldown={};
  if(this.mode===11){b.x=(this.random()-.5)*300;b.y=-310-this.random()*50;b.vx=(this.random()-.5)*55;b.vy=30;}
  this.balls.push(b);return b;
 }
 gapAngle(t=this.time){return this.c.rotation*Math.PI/180*t;}
 openAt(x,y,t,r){const a=Math.atan2(y,x)-this.gapAngle(t),delta=Math.abs(Math.atan2(Math.sin(a),Math.cos(a)));return delta+Math.asin(Math.min(1,r/this.radius))<this.c.gap*Math.PI/360;}
 escapeBall(b){if(this.balls.length>=this.limit||this.processed.has(b.id)||!this.balls.includes(b))return false;this.processed.add(b.id);this.balls.splice(this.balls.indexOf(b),1);this.escaped++;this.events++;this.ghosts.push({...b,at:this.time});this.spawn();this.spawn();this.onSplit?.(b);return true;}
 finish(){if(this.endAt!==null)return;this.endAt=this.time;const red=this.balls.filter(b=>b.team===0).length,blue=this.balls.length-red;this.result=this.mode===10?(red===blue?'UNENTSCHIEDEN':red>blue?'ROT '+red+' : '+blue:'BLAU '+blue+' : '+red):this.mode===9&&this.balls.length>=this.limit?'LIMIT ERREICHT':'ZEIT ABGELAUFEN';}
 tick(dt){if(this.done)return;this.time+=dt;if(this.endAt!==null){this.done=this.time-this.endAt>=1;return;}
  this.balls.sort((a,b)=>a.id-b.id);
  if(this.mode===9)this.escapeStep(dt);else if(this.mode===10)this.clashStep(dt);else this.gardenStep(dt);
  this.ghosts=this.ghosts.filter(g=>this.time-g.at<.7);
  if(this.time+1e-8>=this.duration || (this.mode===9&&this.balls.length>=this.limit))this.finish();
  if(this.mode===10&&this.balls.every(b=>b.team===this.balls[0].team))this.finish();
 }
 escapeStep(dt){
  for(const b of [...this.balls]){
   const n=Math.max(1,Math.ceil((Math.hypot(b.vx,b.vy)+Math.abs(this.c.rotation)*Math.PI/180*this.radius)*dt/1.5));
   for(let i=0;i<n;i++){
    const x=b.x,y=b.y,t=this.time-dt+dt*(i+1)/n;b.x+=b.vx*dt/n;b.y+=b.vy*dt/n;
    if(Math.hypot(b.x,b.y)>this.radius-b.r){
     if(Math.hypot(b.x,b.y)>=Math.hypot(x,y) && (!this.openAt(b.x,b.y,t,b.r)||!this.openAt(x,y,t-dt/n,b.r))){
      b.x=x;b.y=y;const d=Math.hypot(x,y)||1,nx=x/d,ny=y/d,v=b.vx*nx+b.vy*ny;
      if(v>0){b.vx-=2*v*nx;b.vy-=2*v*ny;this.onAudio?.('wall',v);}continue;
     }
     if(Math.hypot(b.x,b.y)>this.radius+b.r){this.escapeBall(b);break;}
    }
   }
   if(this.balls.length>=this.limit)break;
  }
  this.pairs();
 }
 pairs(){for(let i=0;i<this.balls.length;i++)for(let j=i+1;j<this.balls.length;j++){
  const a=this.balls[i],b=this.balls[j],old=[[a.x,a.y],[b.x,b.y]],strength=Math.hypot(a.vx-b.vx,a.vy-b.vy);if(ballCollision(a,b)&&strength>8)this.onAudio?.('ball',strength);
  if(this.mode===9)[a,b].forEach((ball,k)=>{if(Math.hypot(ball.x,ball.y)>this.radius-ball.r&&!this.openAt(ball.x,ball.y,this.time,ball.r)&&Math.hypot(ball.x,ball.y)>Math.hypot(...old[k]))[ball.x,ball.y]=old[k];});
 }}
 clashStep(dt){const previous=new Map(this.balls.map(b=>[b.id,{x:b.x,y:b.y,point:energyPoint(b,this.time-dt,this.c)}]));
  for(const b of this.balls){b.x+=b.vx*dt;b.y+=b.vy*dt;wallCollision(b,this.radius);}this.pairs();for(const b of this.balls)wallCollision(b,this.radius);
  const hits=[];for(const a of this.balls){if(a.protectedUntil>this.time)continue;const p=energyPoint(a,this.time,this.c),old=previous.get(a.id).point;
   for(const b of this.balls){if(b.team===a.team||b.protectedUntil>this.time)continue;const prev=previous.get(b.id);if(distanceToSegment(0,0,old.x-prev.x,old.y-prev.y,p.x-b.x,p.y-b.y)<=b.r+4)hits.push([a.id,b.id]);}}
  const changed=resolveConversions(this.balls,hits,this.time,this.c.shield);this.events+=changed;if(changed)this.onAudio?.('split',140);
 }
 gardenStep(dt){
  if(this.c.addEvery>0&&this.time>=this.nextAdd){if(this.balls.length<this.limit)this.spawn();this.nextAdd+=this.c.addEvery;}
  for(const b of this.balls){b.vy=Math.min(350,b.vy+this.c.gravity*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(Math.abs(b.x)>235-b.r){b.x=Math.sign(b.x)*(235-b.r);b.vx*=-1;}
   if(b.y>365){b.x=(this.random()-.5)*260;b.y=-350;b.vy=35;b.vx=(this.random()-.5)*55;b.contacts.clear();}
   const contact=new Set();for(const p of this.bumpers){const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),r=b.r+p.r;
    if(d>r+1)continue;contact.add(p.id);const nx=d?dx/d:0,ny=d?dy/d:-1,v=b.vx*nx+b.vy*ny;
    if(d<r){b.x=p.x+nx*r;b.y=p.y+ny*r;if(v<0){b.vx-=1.75*v*nx;b.vy-=1.75*v*ny;}}
    if(v<-8&&!b.contacts.has(p.id)&&this.time-(b.cooldown[p.id]??-10)>.18){b.cooldown[p.id]=this.time;p.hit=this.time;this.events++;this.onNote?.(p.note,Math.abs(v),p.x/235,this.c.character);}
   }b.contacts=contact;
  }
 }
 tools(){return [];}
}
export function renderStudio(ctx,sim,w,h){const scale=w/850;ctx.save();ctx.translate(w/2,h*.46);ctx.scale(scale,scale);const c=sim.c;
 ctx.strokeStyle='#70ebc7';ctx.lineWidth=3;
 if(sim.mode===11){ctx.strokeRect(-235,-350,470,700);for(const p of sim.bumpers){ctx.fillStyle=`hsl(${170+(p.id%5)*25} 65% ${sim.time-p.hit<.15?80:50}%)`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d9ffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-7,p.y);ctx.lineTo(p.x+7,p.y);ctx.stroke();}}
 else{ctx.beginPath();if(sim.mode===9){const a=sim.gapAngle(),g=c.gap*Math.PI/360;ctx.arc(0,0,sim.radius,a+g,a+Math.PI*2-g);}else ctx.arc(0,0,sim.radius,0,Math.PI*2);ctx.stroke();}
 for(const b of sim.balls){ctx.fillStyle=sim.mode===10?(b.team===0?'#ff737e':'#65b6ff'):'#88e8d7';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
  if(sim.mode===10){const p=energyPoint(b,sim.time,c);ctx.fillStyle='#fff3ac';ctx.globalAlpha=b.protectedUntil>sim.time?.3:1;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(b.protectedUntil>sim.time){ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r+4,0,Math.PI*2);ctx.stroke();}}}
 for(const g of sim.ghosts){const age=sim.time-g.at;ctx.globalAlpha=Math.max(0,1-age/.7);ctx.fillStyle='#fff3ac';ctx.beginPath();ctx.arc(g.x+g.vx*age,g.y+g.vy*age,g.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.restore();
 ctx.textAlign='center';ctx.fillStyle='#edf5ff';ctx.font=`600 ${32*scale}px system-ui`;
 const red=sim.balls.filter(b=>b.team===0).length;
 ctx.fillText(sim.mode===9?`${sim.balls.length} innen · ${sim.escaped} entkommen`:sim.mode===10?`Rot ${red} : ${sim.balls.length-red} Blau`:String(sim.balls.length),w/2,h*.78);
 if(sim.endAt!==null&&sim.mode!==11){ctx.font=`600 ${22*scale}px system-ui`;ctx.fillText(sim.result,w/2,h*.82);}
}
