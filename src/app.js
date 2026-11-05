import { finalizeVideo } from './video.js';
import { ASMR, PRESETS } from './audio.js';
import { Simulation, MODES, seededRandom } from './physics.js';
const $=id=>document.getElementById(id), canvas=$('canvas'), ctx=canvas.getContext('2d',{alpha:false});
let mode=7, fps=30, sim, running=true, finished=false, particles=[], recorder=null, recording=false, chunks=[], videoURL=null;
let frameAccumulator=0, runConfig, captureStart=0, captureSeconds=0;
const audio=new ASMR();
let last=performance.now(), fpsElapsed=0, fpsFrames=0, drawElapsed=0, stream;
const supported=typeof MediaRecorder!=='undefined' && typeof canvas.captureStream==='function';
const mime=supported?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t)):null;
$('codec').textContent=mime?(mime.startsWith('video/mp4')?'MP4':'WebM'):'Bildschirmaufnahme';
if(!mime){$('record').disabled=true;$('status').textContent='Videoexport nicht verfügbar. Nutze Clean View und die Android-Bildschirmaufnahme.';}
const modeButtons=MODES.map((m,i)=>{
 const b=document.createElement('button');b.className='mode'+(i===7?' active':'');b.innerHTML=`<span class="mode-icon">${m.icon}</span><span>${m.name}</span><span class="mode-check">✓</span>`;
 b.title=m.subtitle;b.setAttribute('aria-pressed',String(i===7));b.onclick=()=>{mode=i;modeButtons.forEach((el,j)=>{el.classList.toggle('active',j===i);el.setAttribute('aria-pressed',String(j===i));});reset();};$('modes').append(b);return b;
});
async function initAudio(){try{await audio.unlock();}catch{ $('status').textContent='Audio gesperrt: Sound-Vorschau antippen. Alternativ Bildschirmaufnahme mit Geräteton verwenden.';}}
function tone(){const kind=[3,6,7].includes(sim.mode)?'laser':[0,1,2,4,5].includes(sim.mode)?'hammer':'split';audio.event(audio.settings[kind]===false?'split':kind,180,sim.time);}
function reset(replay=false){
 if(recording) return;
 if(replay!==true || !runConfig)runConfig={mode,seed:Number($('seed').value)>>>0,initial:+$('initial').value,limit:+$('limit').value,grow:$('grow').checked,duration:+$('duration').value};
 $('seed').value=runConfig.seed;
 sim=new Simulation(runConfig);audio.reset();frameAccumulator=0;last=performance.now();
 sim.onAudio=(kind,strength)=>audio.event(kind,strength,sim.time);
 sim.onSplit=b=>{tone();if($('particles').checked){
   particles=particles.filter(p=>sim.time-p.born<.4);
   const random=seededRandom(runConfig.seed+b.id*997);
   if(particles.length<180)for(let i=0;i<5;i++){const a=random()*Math.PI*2;particles.push({x:b.x,y:b.y,vx:Math.cos(a)*70,vy:Math.sin(a)*70,born:sim.time});}
 }};
 particles=[];running=true;finished=false;syncPlay();
}
function syncPlay(){ $('play').textContent=finished?'↺  Neuer Durchlauf':running?'Ⅱ  Pausieren':'▶  Fortsetzen';$('pausedBadge').hidden=running||finished; }
$('play').onclick=()=>{initAudio();if(finished){reset();return;}running=!running;syncPlay();};
$('restart').onclick=()=>reset(true);
$('replay').onclick=()=>reset(true);
$('newVariant').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];reset();};
$('seed').onchange=()=>reset();
for(const id of ['initial','limit','duration']){
 $(id).oninput=()=>{$(id+'Value').value=$(id).value+(id==='duration'?' s':'');};
 $(id).onchange=reset;
}
$('grow').onchange=reset;
function preset(value){
 const fast=value==='fast',chaos=value==='chaos',laser=value==='laser',ricochet=value==='ricochet',pulse=value==='pulse';$('initial').value=ricochet?1:fast?12:laser?6:4;$('limit').value=fast?1024:laser?768:512;$('grow').checked=true;
 for(const id of ['initial','limit'])$(id).oninput();modeButtons[ricochet?7:pulse?8:laser?6:chaos?5:fast?4:0].click();
}
$('preset').onchange=()=>preset($('preset').value);
$('resetSettings').onclick=()=>{$('preset').value='ricochet';$('seed').value=1;$('particles').checked=true;$('sound').checked=audio.settings.enabled;preset('ricochet');};
for(const b of document.querySelectorAll('[data-fps]'))b.onclick=()=>{fps=+b.dataset.fps;for(const el of document.querySelectorAll('[data-fps]')){el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));}};
async function cleanView(){
 document.body.classList.add('clean');
 try{if(!document.fullscreenElement)await $('stage').requestFullscreen();}catch{/* CSS fullscreen works when Fullscreen API is unavailable. */}
}
function leaveClean(){document.body.classList.remove('clean');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}
$('fullscreen').onclick=cleanView;$('stage').ondblclick=leaveClean;
document.addEventListener('keydown',e=>{if(e.key==='Escape')leaveClean();});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('clean');});
let lastTap=0;$('stage').addEventListener('pointerup',()=>{const now=performance.now();if(document.body.classList.contains('clean')&&now-lastTap<330)leaveClean();lastTap=now;});
function lockSettings(lock){for(const el of document.querySelectorAll('.settings button,.settings input,.settings select,.segmented button,#resolution,#duration,#play,#restart,#replay,#newVariant,#seed'))el.disabled=lock;}
function stopRecording(message){
 if(!recording)return;
 captureSeconds=(performance.now()-captureStart)/1000;
 recording=false;running=false;syncPlay();$('stopRecord').disabled=true;
 $('status').textContent=message||'Video wird fertiggestellt …';
 if(recorder&&recorder.state!=='inactive')recorder.stop();
}
$('stopRecord').onclick=()=>stopRecording();
$('record').onclick=async()=>{
 if(recording)return;
 if($('sound').checked){try{await audio.unlock();}catch{$('status').textContent='Export mit Ton nicht verfügbar. Sound-Vorschau antippen oder Bildschirmaufnahme mit Geräteton nutzen.';return;}if(!audio.dest.stream.getAudioTracks().some(t=>t.readyState==='live')){$('status').textContent='Keine Audio-Spur verfügbar. Nutze Bildschirmaufnahme mit Geräteton.';return;}}
 reset(true);const width=+$('resolution').value;canvas.width=width;canvas.height=width*16/9;
 chunks=[];$('download').hidden=true;$('record').disabled=true;$('progress').hidden=false;$('progress').max=+$('duration').value;$('progress').value=0;
 try{
   draw();stream=canvas.captureStream(fps);
   if($('sound').checked&&audio.dest)for(const track of audio.dest.stream.getAudioTracks())stream.addTrack(track.clone());
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:width===1080?10_000_000:5_000_000});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{stopRecording();$('status').textContent='Aufnahmefehler. Versuche 720p / 30 FPS oder die Bildschirmaufnahme.';};
   recorder.onstop=async()=>{
     stream?.getTracks().forEach(t=>t.stop());$('stopRecord').hidden=true;$('progress').hidden=true;
     try{
     if(chunks.length){if(videoURL)URL.revokeObjectURL(videoURL);const blob=await finalizeVideo(new Blob(chunks,{type:recorder.mimeType}),captureSeconds);videoURL=URL.createObjectURL(blob);$('download').href=videoURL;$('download').download=`ball-crusher-${MODES[mode].name.toLowerCase()}-seed-${runConfig.seed}.${blob.type.startsWith('video/mp4')?'mp4':'webm'}`;$('download').hidden=false;$('status').textContent=`Video bereit · ${(blob.size/1024/1024).toFixed(1)} MB · ${captureSeconds.toFixed(1)} s. Zum Speichern herunterladen.`;}
     else $('status').textContent='Keine Videodaten erhalten. Nutze 720p / 30 FPS oder die Bildschirmaufnahme.';
     }catch{$('status').textContent='Videodauer konnte nicht gespeichert werden. Nutze die Bildschirmaufnahme.';}finally{lockSettings(false);$('record').disabled=false;}
   };
   captureStart=performance.now();recorder.start();recording=true;lockSettings(true);$('stopRecord').hidden=false;$('stopRecord').disabled=false;$('status').textContent=`Export von Seed ${runConfig.seed} · Tab im Vordergrund lassen.`;
 }catch(error){stream?.getTracks().forEach(t=>t.stop());$('record').disabled=false;$('progress').hidden=true;lockSettings(false);$('status').textContent='Diese Aufnahme ist auf dem Gerät nicht möglich. Versuche 720p / 30 FPS oder Clean View.';}
};
function draw(){
 const w=canvas.width,h=canvas.height,scale=w/850,cx=w/2,cy=h*.49;
 ctx.fillStyle='#0b101a';ctx.fillRect(0,0,w,h);
 const bg=ctx.createRadialGradient(cx,cy,10,cx,cy,w*.7);bg.addColorStop(0,'#152336');bg.addColorStop(1,'#0b101a');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#223047';for(let x=24*scale;x<w;x+=32*scale)for(let y=24*scale;y<h;y+=32*scale){ctx.beginPath();ctx.arc(x,y,.8*scale,0,Math.PI*2);ctx.fill();}
 ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);
 ctx.beginPath();ctx.arc(0,0,sim.radius+12,0,Math.PI*2);ctx.strokeStyle='#233145';ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,sim.radius,0,Math.PI*2);ctx.fillStyle='#101b29';ctx.fill();ctx.strokeStyle='#65e9cb';ctx.lineWidth=3;ctx.shadowBlur=18;ctx.shadowColor='#36c8aa55';ctx.stroke();ctx.shadowBlur=0;
 for(const p of particles){const age=sim.time-p.born;ctx.globalAlpha=Math.max(0,1-age/.4);ctx.fillStyle='#c4ffee';ctx.fillRect(p.x+p.vx*age-1,p.y+p.vy*age-1,3,3);}ctx.globalAlpha=1;
 // Batch ball fills by palette to reduce Canvas state changes.
 const colors=['#64edc8','#70c8f8','#a197fc','#e5adf5','#f8d987'];
 for(let i=0;i<5;i++){ctx.fillStyle=colors[i];ctx.beginPath();for(const b of sim.balls){if(b.id%5!==i)continue;ctx.moveTo(b.x+b.r,b.y);ctx.arc(b.x,b.y,b.r,0,Math.PI*2);}ctx.fill();}
 // Brief outlines make the two newborn children easy to distinguish.
 ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
 for(const b of sim.balls){if(sim.time-b.born<.2 && b.born>0){ctx.beginPath();ctx.arc(b.x,b.y,b.r+2,0,Math.PI*2);ctx.stroke();}}
 if(sim.mode===7){
   const trail=sim.trail;ctx.lineCap='round';ctx.lineWidth=4;
   for(let i=1;i<trail.length;i++){
     ctx.globalAlpha=Math.max(0,1-(sim.time-trail[i].time)/.24)*.75;ctx.strokeStyle='#91f9ff';
     ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke();
   }
   ctx.globalAlpha=1;ctx.shadowColor='#79f7ff';ctx.shadowBlur=20;ctx.fillStyle='#f4ffff';
   ctx.beginPath();ctx.arc(sim.head.x,sim.head.y,sim.head.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 }
 if(sim.mode===8 && sim.wave.active){
   ctx.strokeStyle='#bca3ff';ctx.lineWidth=4;ctx.shadowColor='#a28bff';ctx.shadowBlur=10;
   ctx.beginPath();ctx.arc(0,0,sim.wave.radius,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
 }
 for(const t of sim.tools()){
   ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle);
   if(t.kind==='laser'){
     ctx.strokeStyle=t.color||'#ff739e';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=16;ctx.lineWidth=t.width;ctx.lineCap='round';
     ctx.beginPath();ctx.moveTo(t.centered?-t.length/2:0,0);ctx.lineTo(t.centered?t.length/2:t.length,0);ctx.stroke();
     ctx.shadowBlur=0;ctx.strokeStyle='#edfff9';ctx.lineWidth=1.5;ctx.stroke();
   } else {
     ctx.fillStyle='#b49aff';ctx.fillRect(0,-4,t.length,8);ctx.fillStyle='#9474f5';ctx.beginPath();
     const extent=t.headHalfLength+t.width/2;
     ctx.roundRect(t.length-t.width/2,-extent,t.width,extent*2,t.width/2);ctx.fill();
     ctx.fillStyle='#d4c6ff';ctx.fillRect(t.length-t.width/2+4,-t.headHalfLength,4,t.headHalfLength*2);
   }
   ctx.fillStyle='#22283d';ctx.beginPath();ctx.arc(0,0,t.kind==='laser'?6:11,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle=t.color||'#c4aaff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 }
 ctx.restore();
 ctx.textAlign='center';
 ctx.fillStyle='#edf5ff';ctx.font=`700 ${72*scale}px system-ui`;ctx.fillText(sim.balls.length.toLocaleString('de-DE'),cx,h*.83);
}
function frame(now){
 const dt=Math.min((now-last)/1000,1/15);last=now;
 if(running){
   frameAccumulator+=dt;
   while(frameAccumulator+1e-12>=1/60 && running){
     sim.step(1/60);frameAccumulator-=1/60;
     particles=particles.filter(p=>sim.time-p.born<.4);
     if(sim.balls.length>=sim.limit || sim.time+1e-8>=runConfig.duration){finished=true;running=false;syncPlay();if(recording)stopRecording();}
   }
 }
 if(recording)$('progress').value=sim.time;
 audio.flush();
 drawElapsed+=dt;if(drawElapsed>=1/(recording?fps:60)){draw();drawElapsed=0;}
 fpsElapsed+=dt;fpsFrames++;if(fpsElapsed>=.5){$('fpsCount').textContent=Math.round(fpsFrames/fpsElapsed);fpsElapsed=0;fpsFrames=0;}
 $('ballCount').textContent=sim.balls.length.toLocaleString('de-DE');$('splitCount').textContent=sim.splits.toLocaleString('de-DE');
 requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.reset();if(recording)stopRecording();running=false;syncPlay();}});
const controls=document.createElement('div');controls.className='audio-controls';
controls.innerHTML=`<label class="field-label" for="audioPreset">ASMR-Preset</label><select id="audioPreset">${PRESETS.map((p,i)=>`<option value="${i}">${p}</option>`).join('')}</select><label class="field-label" for="volume">Master-Lautstärke</label><input id="volume" type="range" min="0" max="100"><div>${[['balls','Kugelkollisionen & Wand'],['splits','Verdopplungen'],['laser','Laser'],['hammer','Hammer']].map(([id,label])=>`<label class="switch-row">${label}<input type="checkbox" id="audio-${id}" role="switch"></label>`).join('')}</div><button id="audioPreview" class="secondary-button">Sound-Vorschau</button>`;
$('sound').closest('label').after(controls);
$('sound').checked=audio.settings.enabled;$('audioPreset').value=audio.settings.preset;$('volume').value=audio.settings.volume*100;
for(const key of ['balls','splits','laser','hammer']){$('audio-'+key).checked=audio.settings[key];$('audio-'+key).onchange=()=>{audio.settings[key]=$('audio-'+key).checked;audio.save();};}
$('volume').oninput=()=>{audio.settings.volume=+$('volume').value/100;audio.save();};
$('audioPreset').onchange=()=>{audio.settings.preset=+$('audioPreset').value;audio.save();};
$('sound').onchange=()=>{audio.settings.enabled=$('sound').checked;audio.save();if(audio.settings.enabled)initAudio();};
$('audioPreview').onclick=async()=>{audio.settings.enabled=true;$('sound').checked=true;audio.save();await initAudio();audio.event('split',180,sim.time+1);audio.flush();};
reset();requestAnimationFrame(frame);
