export const PRESETS=['Bubble ASMR','Crystal ASMR','Laser ASMR','Chaos Mix'];
export const defaults={enabled:false,volume:.55,preset:0,balls:true,splits:true,laser:true,hammer:true};
export function settings(value={}){const s={...defaults};for(const k of ['enabled','balls','splits','laser','hammer'])if(typeof value[k]==='boolean')s[k]=value[k];if(Number.isFinite(value.volume))s.volume=Math.max(0,Math.min(1,value.volume));if(Number.isInteger(value.preset)&&value.preset>=0&&value.preset<4)s.preset=value.preset;return s;}
export class ASMR {
 constructor(){try{this.settings=settings(JSON.parse(localStorage.getItem('chaosloop-audio')||'{}'));}catch{this.settings=settings();}this.voices=[];this.pending=[];this.last={};this.serial=0;}
 save(){try{localStorage.setItem('chaosloop-audio',JSON.stringify(this.settings));}catch{}this.apply();}
 async unlock(){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)throw Error('Web Audio fehlt');if(!this.ctx){
 this.ctx=new Audio();const c=this.ctx;this.master=c.createGain();this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=6500;
 this.limiter=c.createDynamicsCompressor();Object.assign(this.limiter.threshold,{value:-12});this.limiter.knee.value=8;this.limiter.ratio.value=20;this.limiter.attack.value=.002;this.limiter.release.value=.08;
 // Hard output bound after compression, followed by conservative headroom.
 this.ceiling=c.createWaveShaper();this.ceiling.curve=Float32Array.from({length:2049},(_,i)=>.75*Math.tanh(2*(i/1024-1)));
 this.dest=c.createMediaStreamDestination();this.master.connect(this.filter);this.filter.connect(this.limiter);this.limiter.connect(this.ceiling);this.ceiling.connect(c.destination);this.ceiling.connect(this.dest);this.apply();}
 await this.ctx.resume();if(this.ctx.state!=='running')throw Error('Audio wurde vom Browser nicht freigegeben');}
 apply(){if(this.ctx)this.master.gain.setTargetAtTime(this.settings.enabled?this.settings.volume*.45:0,this.ctx.currentTime,.015);}
 reset(){this.pending=[];this.last={};this.serial=0;if(this.ctx)for(const v of this.voices){v.g.gain.setTargetAtTime(0,this.ctx.currentTime,.004);v.o.stop(this.ctx.currentTime+.025);}this.voices=[];}
 event(kind,strength=100,time=0){if(!this.settings.enabled)return;const key=kind==='ball'?'balls':kind==='split'?'splits':kind;
 if(key!=='wall'&&!this.settings[key])return;
 if(kind==='wall'&&!this.settings.balls)return;
 const gap=kind==='ball'||kind==='wall'?.065:.028;
 if(time-(this.last[kind]??-Infinity)<gap)return;this.last[kind]=time;
 const e={kind,strength,time,index:this.serial++};if(this.pending.length<32)this.pending.push(e);else if(kind!=='ball'&&kind!=='wall')this.pending[this.pending.length-1]=e;}
 flush(){if(!this.ctx||this.ctx.state!=='running'){this.pending=[];return;}
 const priority=e=>e.kind==='ball'||e.kind==='wall'?0:1;
 this.pending.sort((a,b)=>priority(b)-priority(a));for(const e of this.pending.splice(0,8))this.play(e);this.pending=[];}
 play(e){const c=this.ctx,t=c.currentTime;this.voices=this.voices.filter(v=>v.end>t);
 const important=e.kind!=='ball'&&e.kind!=='wall';if(this.voices.length>=(important?12:6))return;
 const variation=((Math.imul(e.index+1,2654435761)>>>0)%1000)/1000;
 const preset=this.settings.preset===3?e.index%3:this.settings.preset;
 const laser=e.kind==='laser',hammer=e.kind==='hammer',split=important;
 const base=(hammer?180:laser?750:preset===1?1300:preset===2?650:440)*(.9+.1*Math.min(1,Math.abs(e.strength)/220));
 const duration=split?.14:.065,level=(split?.17:.075)*(.4+.6*Math.min(1,Math.abs(e.strength)/220))*(.92+.08*variation);
 const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(base*(.9+variation*.2),t);o.frequency.exponentialRampToValueAtTime(base*(laser?.23:preset===1?.8:.38),t+duration*.65);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);g.gain.linearRampToValueAtTime(0,t+duration+.01);
 o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.012);const voice={o,g,end:t+duration+.012};this.voices.push(voice);o.onended=()=>{o.disconnect();g.disconnect();};
 // A quiet confirmation partial belongs to the same split event, not a second trigger.
 if(split&&this.settings.splits&&this.voices.length<12){const ping=c.createOscillator(),pg=c.createGain();ping.frequency.value=hammer?460:base*1.8;pg.gain.setValueAtTime(0,t);pg.gain.linearRampToValueAtTime(level*.25,t+.008);pg.gain.exponentialRampToValueAtTime(.0001,t+.09);ping.connect(pg);pg.connect(this.master);ping.start(t);ping.stop(t+.1);this.voices.push({o:ping,g:pg,end:t+.1});ping.onended=()=>{ping.disconnect();pg.disconnect();};}
 }
}
