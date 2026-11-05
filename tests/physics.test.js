import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, MODES, wallCollision, ballCollision, distanceToSegment, toolHitsBall, toolSegment } from '../src/physics.js';
const ball = (x,y,vx,vy)=>({x,y,vx,vy,r:7});
test('Ein Treffer entfernt den Elternball und erzeugt exakt zwei neue IDs',()=>{
 const s=new Simulation({initial:1});const parent=s.balls[0];
 assert.equal(s.split(parent.id),true);assert.equal(s.balls.length,2);
 assert.ok(s.balls.every(b=>b.id!==parent.id));assert.equal(new Set(s.balls.map(b=>b.id)).size,2);
 assert.equal(s.split(parent.id),false);assert.equal(s.balls.length,2);
});
test('Vollständige Generationen wachsen exponentiell: 1, 2, 4, 8, 16',()=>{
 const s=new Simulation({initial:1});for(const expected of [2,4,8,16]){for(const b of [...s.balls])s.split(b.id);assert.equal(s.balls.length,expected);}
});
test('Kugellimit bleibt exakt, auch bei vielen Treffern',()=>{
 const s=new Simulation({initial:1,limit:32});for(let i=0;i<100;i++)s.split(s.balls[0].id);assert.equal(s.balls.length,32);assert.equal(s.splits,31);
});
test('Wand reflektiert radiale Geschwindigkeit und erhält kinetische Energie',()=>{
 const b=ball(208,0,100,20);assert.ok(wallCollision(b,210));assert.equal(b.x,203);assert.equal(b.vx,-100);assert.equal(b.vy,20);
});
test('Wand kehrt bereits nach innen gerichtete Bewegung nicht um',()=>{
 const b=ball(210,0,-100,20);wallCollision(b,210);assert.equal(b.vx,-100);
});
test('Elastischer Kugelstoß tauscht Normalgeschwindigkeit und erhält Impuls/Energie',()=>{
 const a=ball(0,0,100,12),b=ball(12,0,-50,7);assert.ok(ballCollision(a,b));
 assert.equal(a.vx,-50);assert.equal(b.vx,100);assert.equal(a.vy,12);assert.equal(b.vy,7);assert.equal(b.x-a.x,14);
});
test('Exakt überlappende Kugeln werden ohne NaN getrennt',()=>{
 const a=ball(0,0,1,0),b=ball(0,0,-1,0);ballCollision(a,b);assert.equal(Math.abs(b.x-a.x),14);assert.ok(Number.isFinite(a.vx));
});
test('Segmenttest begrenzt Laser und Hammer auf ihre tatsächliche Länge',()=>{
 assert.equal(distanceToSegment(5,3,0,0,10,0),3);assert.equal(distanceToSegment(20,0,0,0,10,0),10);
});
test('Ein physischer Hammerkontakt verdoppelt genau einmal, Kinder haben Schutzzeit',()=>{
 const s=new Simulation({mode:0,initial:1,random:()=>.5});const b=s.balls[0];b.x=s.radius*.77;b.y=0;b.vx=0;b.vy=0;b.born=-1;
 s.step(1/240);assert.equal(s.balls.length,2);s.step(1/240);assert.equal(s.balls.length,2);
});
test('Alle neun Modi bleiben über 20 Sekunden endlich, begrenzt und erzeugen Treffer',()=>{
 for(let mode=0;mode<9;mode++){
   let seed=123;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
   const s=new Simulation({mode,initial:4,limit:128,random});for(let i=0;i<1200;i++)s.step(1/60);
   assert.ok(s.splits>0,`mode ${mode} should split`);assert.ok(s.balls.length<=128);
   assert.equal(s.balls.length,4+s.splits);
   for(const b of s.balls){assert.ok([b.x,b.y,b.vx,b.vy].every(Number.isFinite));assert.ok(Math.hypot(b.x,b.y)<=s.radius-b.r+.001);}
 }
});
test('Mitwachsende Arena vergrößert sich, feste Arena bleibt unverändert',()=>{
 for(const grow of [true,false]){const s=new Simulation({grow,initial:24});s.step(1/60);assert.equal(s.radius>210,grow);}
});
test('Vergrößerte Hammerfläche trifft auch Kugeln am äußeren Kopfbereich',()=>{
 const s=new Simulation({mode:0,initial:1,random:()=>.5});
 const b=s.balls[0];b.x=s.radius*.77;b.y=44;b.vx=0;b.vy=0;b.born=-1;
 assert.ok(toolHitsBall(s.tools()[0],b));s.step(1/240);
 assert.equal(s.balls.length,2);
 // The handle does not split balls.
 assert.equal(toolHitsBall(s.tools()[0],ball(50,0,0,0)),false);
});
test('Freier Laser trifft entlang beider Strahlhälften, aber nicht außerhalb',()=>{
 const tool={x:0,y:0,angle:0,length:116,width:6,centered:true,kind:'laser'};
 for(const x of [-50,50])assert.ok(toolHitsBall(tool,ball(x,0,0,0)));
 assert.equal(toolHitsBall(tool,ball(70,0,0,0)),false);
 assert.equal(toolHitsBall(tool,ball(0,11,0,0)),false);
});
test('Zwei gleichzeitig treffende Laser verdoppeln eine Elternkugel nur einmal',()=>{
 const s=new Simulation({initial:1,mode:6,random:()=>.5});
 for(const laser of s.lasers)Object.assign(laser,{x:0,y:0,vx:0,vy:0,angle:0,spin:0});
 Object.assign(s.balls[0],{x:-35,y:0,vx:0,vy:0,born:-1});
 s.step(1/240);assert.equal(s.balls.length,2);assert.equal(s.splits,1);
 s.step(1/240);assert.equal(s.balls.length,2);
});
test('Fliegende Laser bewegen und drehen sich, reflektieren und bleiben vollständig in der Arena',()=>{
 const s=new Simulation({initial:0,mode:6,grow:false});
 const start=s.lasers.map(l=>({...l}));
 for(let i=0;i<600;i++){
   s.step(1/60);
   for(const tool of s.tools()){
     const [ax,ay,bx,by]=toolSegment(tool);
     assert.ok(Math.max(Math.hypot(ax,ay),Math.hypot(bx,by))+tool.width/2<=s.radius+.001);
   }
 }
 s.lasers.forEach((l,i)=>{
   assert.ok(Math.hypot(l.x-start[i].x,l.y-start[i].y)>1);
   assert.notEqual(l.angle,start[i].angle);
   assert.ok(Math.abs(Math.hypot(l.vx,l.vy)-Math.hypot(start[i].vx,start[i].vy))<.001);
 });
 const l=s.lasers[0];Object.assign(l,{x:s.radius-l.r-.1,y:0,vx:100,vy:0});
 s.step(1/60);assert.ok(l.vx<0);
});
test('Ricochet: Start mit einer Kugel, Abpraller vor echtem Treffer zwischen 0,7 und 1,0 s',()=>{
 for(const seed of [1,2,23,999,4294967295]){
  const s=new Simulation({seed});assert.equal(s.mode,7);assert.equal(s.balls.length,1);
  let first=null;s.onSplit=()=>{first??={time:s.time,bounces:s.bounces};};
  for(let i=0;i<240;i++)s.step(1/240);
  assert.ok(first.time>=.7&&first.time<=1);assert.equal(first.bounces,1);
  assert.equal(s.balls.length,2);assert.ok(Math.hypot(s.balls[0].x-s.balls[1].x,s.balls[0].y-s.balls[1].y)>14);
 }
});
test('Ricochet CCD trifft zwischen zwei Schritten auch bei sehr hoher Geschwindigkeit',()=>{
 const s=new Simulation({mode:7,initial:1});
 Object.assign(s.head,{x:-100,y:0,vx:60000,vy:0});
 Object.assign(s.balls[0],{x:0,y:0,vx:0,vy:0,born:-1});
 s.step(1/240);assert.equal(s.splits,1);assert.equal(s.head.vx,60000);
});
test('Ricochet CCD folgt dem reflektierten Weg und der Schweif löst keine Treffer aus',()=>{
 const s=new Simulation({mode:7,initial:1});
 Object.assign(s.head,{x:190,y:0,vx:60000,vy:0});
 Object.assign(s.balls[0],{x:100,y:0,vx:0,vy:0,born:-1});
 s.step(1/240);assert.equal(s.splits,1);assert.equal(s.bounces,1);assert.ok(s.head.vx<0);
 const t=new Simulation({mode:7,initial:1});
 t.trail=[{x:0,y:0,time:0}];Object.assign(t.head,{x:100,y:100,vx:10,vy:0});
 Object.assign(t.balls[0],{x:0,y:0,vx:0,vy:0,born:-1});t.step(1/240);assert.equal(t.splits,0);
});
test('Pulsring schützt Kinder bis zur nächsten Welle und pausiert am Rand',()=>{
 const s=new Simulation({mode:8,initial:1,grow:false});
 Object.assign(s.balls[0],{x:70,y:0,vx:0,vy:0});
 for(let i=0;i<96;i++)s.step(1/60);
 assert.equal(s.balls.length,2);assert.equal(s.wave.active,false);assert.equal(s.wave.id,1);
 assert.ok(s.balls.every(b=>b.waveId===1));
 for(let i=0;i<144;i++)s.step(1/60);
 assert.equal(s.balls.length,4);assert.ok(s.balls.every(b=>b.waveId===2));
});
test('Gleiche Seed reproduziert alle Modi unabhängig von 30/60 FPS; andere Seed ändert Lauf',()=>{
 for(let mode=0;mode<9;mode++){
  const a=new Simulation({mode,seed:42,limit:128}),b=new Simulation({mode,seed:42,limit:128});
  for(let i=0;i<150;i++)a.step(1/30);
  for(let i=0;i<300;i++)b.step(1/60);
  assert.deepEqual(a.balls,b.balls);assert.deepEqual(a.head,b.head);assert.deepEqual(a.wave,b.wave);
 }
 const a=new Simulation({seed:42}),b=new Simulation({seed:43});assert.notDeepEqual(a.balls,b.balls);
});
