import test from 'node:test';
import assert from 'node:assert/strict';
import {ASMR,settings} from '../src/audio.js';
import {Simulation} from '../src/physics.js';
test('Audio settings validate storage and clamp volume',()=>{assert.equal(settings({volume:9}).volume,1);assert.equal(settings({preset:50}).preset,0);assert.equal(settings({enabled:'yes'}).enabled,false);});
test('Mute and channel switches suppress events',()=>{const a=new ASMR();a.event('split');assert.equal(a.pending.length,0);a.settings.enabled=true;a.settings.balls=false;a.event('ball');a.event('wall');assert.equal(a.pending.length,0);a.event('split');assert.equal(a.pending.length,1);});
test('Dense collisions are bounded and priority events survive',()=>{const a=new ASMR();a.settings.enabled=true;for(let i=0;i<500;i++)a.event('ball',200,i*.01);a.event('laser',200,5);assert.ok(a.pending.length<=32);assert.equal(a.pending.at(-1).kind,'laser');});
test('Audio observation does not change deterministic physics',()=>{const a=new Simulation({mode:0,initial:24,seed:2}),b=new Simulation({mode:0,initial:24,seed:2});let events=0;a.onAudio=()=>events++;for(let i=0;i<120;i++){a.step(1/60);b.step(1/60);}assert.ok(events>0);assert.deepEqual(a.balls,b.balls);});
