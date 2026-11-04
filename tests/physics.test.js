import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation, wallCollision, ballCollision, distanceToSegment } from '../src/physics.js';
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
 const s=new Simulation({initial:1,random:()=>.5});const b=s.balls[0];b.x=s.radius*.77;b.y=0;b.vx=0;b.vy=0;b.born=-1;
 s.step(1/240);assert.equal(s.balls.length,2);s.step(1/240);assert.equal(s.balls.length,2);
});
test('Alle sechs Modi bleiben über 20 Sekunden endlich, begrenzt und erzeugen Treffer',()=>{
 for(let mode=0;mode<6;mode++){
   let seed=123;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
   const s=new Simulation({mode,limit:128,random});for(let i=0;i<1200;i++)s.step(1/60);
   assert.ok(s.splits>0,`mode ${mode} should split`);assert.ok(s.balls.length<=128);
   assert.equal(s.balls.length,4+s.splits);
   for(const b of s.balls){assert.ok([b.x,b.y,b.vx,b.vy].every(Number.isFinite));assert.ok(Math.hypot(b.x,b.y)<=s.radius-b.r+.001);}
 }
});
test('Mitwachsende Arena vergrößert sich, feste Arena bleibt unverändert',()=>{
 for(const grow of [true,false]){const s=new Simulation({grow,initial:24});s.step(1/60);assert.equal(s.radius>210,grow);}
});
