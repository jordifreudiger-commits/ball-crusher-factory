import test from 'node:test';
import assert from 'node:assert/strict';
import {fixMP4,fixWebM,finalizeVideo} from '../src/video.js';
test('MP4 movie duration is corrected from 2 seconds to 30 seconds',()=>{
 const b=new Uint8Array(40),v=new DataView(b.buffer);v.setUint32(0,40);b.set([109,111,111,118],4);v.setUint32(8,32);b.set([109,118,104,100],12);v.setUint32(28,1000);v.setUint32(32,2000);
 const result=fixMP4(b,30);assert.equal(new DataView(result.buffer).getUint32(32),30000);assert.equal(v.getUint32(32),2000);
});
test('WebM receives an explicit duration in timecode units',()=>{
 const b=new Uint8Array([0x18,0x53,0x80,0x67,0xff,0x15,0x49,0xa9,0x66,0x80]);
 const fixed=fixWebM(b,30);assert.equal(new DataView(fixed.buffer).getFloat64(fixed.length-8),30000);
});
test('Invalid recordings are rejected rather than offered with a false duration',async()=>{
 assert.throws(()=>fixMP4(new Uint8Array(1),30));assert.throws(()=>fixWebM(new Uint8Array(1),30));await assert.rejects(finalizeVideo(new Blob(),0));
});
test('MP4 fallback cannot silently choose VP9/Opus for TikTok',async()=>{
 const {selectVideoType}=await import('../src/video.js');
 assert.equal(selectVideoType(t=>t==='video/mp4'),null);
 assert.ok(selectVideoType(t=>t.startsWith('video/webm')).startsWith('video/webm'));
 assert.match(selectVideoType(()=>true),/avc1.*mp4a/);
});
