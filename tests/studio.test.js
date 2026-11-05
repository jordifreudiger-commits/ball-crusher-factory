import test from 'node:test';import assert from 'node:assert/strict';
import {StudioSimulation,resolveConversions,CURATED} from '../src/studio.js';
const advance=(s,seconds,fps=60)=>{for(let i=0;i<Math.round(seconds*fps);i++)s.step(1/fps);};
test('Escape processes actual crossing once and creates exactly two separated children',()=>{
 const s=new StudioSimulation({mode:9,initial:1,rotation:0,gap:70});const b=s.balls[0];Object.assign(b,{x:240,y:0,vx:20000,vy:0});s.step(1/240);
 assert.equal(s.escaped,1);assert.equal(s.balls.length,2);assert.equal(s.escapeBall(b),false);assert.ok(s.balls.every(x=>Math.hypot(x.x,x.y)<180));assert.ok(Math.hypot(s.balls[0].x-s.balls[1].x,s.balls[0].y-s.balls[1].y)>18);
});
test('Fast escape respects closed walls and opening edges',()=>{
 for(const angle of [Math.PI,35*Math.PI/180]){const s=new StudioSimulation({mode:9,initial:1,rotation:0,gap:70});Object.assign(s.balls[0],{x:240*Math.cos(angle),y:240*Math.sin(angle),vx:20000*Math.cos(angle),vy:20000*Math.sin(angle)});s.step(1/240);assert.equal(s.escaped,0);assert.ok(Math.hypot(s.balls[0].x,s.balls[0].y)<265);}
});
test('Rotating opening does not move stationary balls through the wall',()=>{const s=new StudioSimulation({mode:9,initial:1,rotation:45});Object.assign(s.balls[0],{x:260,y:0,vx:0,vy:0});advance(s,2);assert.equal(s.escaped,0);assert.equal(s.balls[0].x,260);});
test('Mutual Color Clash hits cancel independent of ordering; shields block attack and defence',()=>{
 const make=()=>[{id:0,team:0,protectedUntil:0},{id:1,team:1,protectedUntil:0}];for(const reverse of [false,true]){const b=make();if(reverse)b.reverse();assert.equal(resolveConversions(b,[[0,1],[1,0]],1,.8),0);}
 const b=make();assert.equal(resolveConversions(b,[[0,1]],1,.8),1);assert.equal(b[1].team,0);b[0].team=1;assert.equal(resolveConversions(b,[[1,0],[0,1]],1.2,.8),0);
});
test('Color Clash maintains population and reports draw or real winner',()=>{const s=new StudioSimulation({mode:10,team:4,duration:15});advance(s,16.1);assert.equal(s.balls.length,8);assert.ok(s.done);const red=s.balls.filter(b=>b.team===0).length;assert.ok(s.result.includes(red===4?'UNENTSCHIEDEN':red>4?'ROT':'BLAU'));const t=new StudioSimulation({mode:10});t.balls.forEach(b=>b.team=0);t.step(1/60);assert.ok(t.result.startsWith('ROT'));});
test('Garden only triggers on contact onset, applies cooldown, and respawns below arena',()=>{
 const s=new StudioSimulation({mode:11,initial:1,gravity:40});const b=s.balls[0],p=s.bumpers[0];let notes=0;s.onNote=()=>notes++;
 Object.assign(b,{x:p.x,y:p.y-p.r-b.r,vx:0,vy:50});s.step(1/240);assert.equal(notes,1);
 Object.assign(b,{x:p.x,y:p.y-p.r-b.r,vx:0,vy:50});s.step(1/240);assert.equal(notes,1);b.y=370;s.step(1/240);assert.ok(b.y< -300);assert.equal(s.balls.length,1);
});
test('All new modes replay exactly at 30/60 FPS and remain within limits',()=>{
 for(const mode of [9,10,11]){const options={mode,...CURATED[mode][0][1]},a=new StudioSimulation(options),b=new StudioSimulation(options);advance(a,12,30);advance(b,12,60);assert.deepEqual(a.balls,b.balls);assert.equal(a.events,b.events);assert.ok(a.balls.length<= (mode===10?a.c.team*2:a.limit));}
 const garden=new StudioSimulation({mode:11,initial:2,limit:3,addEvery:1});advance(garden,10);assert.equal(garden.balls.length,3);
 const escape=new StudioSimulation({mode:9,...CURATED[9][1][1],limit:8});advance(escape,30);assert.equal(escape.balls.length,8);assert.ok(escape.done);
});
test('Ordinary opposing ball collision does not change colors without energy contact',()=>{
 const s=new StudioSimulation({mode:10,team:2});s.balls=s.balls.slice(0,2);
 Object.assign(s.balls[0],{x:-8,y:0,vx:50,vy:0,phase:Math.PI,team:0});
 Object.assign(s.balls[1],{x:8,y:0,vx:-50,vy:0,phase:0,team:1});
 s.step(1/240);assert.deepEqual(s.balls.map(b=>b.team),[0,1]);assert.equal(s.events,0);
});
