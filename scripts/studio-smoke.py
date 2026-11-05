from playwright.sync_api import sync_playwright
import json,base64,subprocess,struct,math
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':393,'height':852})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:5173/',wait_until='networkidle')
 page.evaluate('''async()=>{const url=document.querySelector('script[type=module]').src;const s=await(await fetch(url)).text();const {StudioSimulation}=await import(new URL(s.match(/from '([^']*studio[^']*)'/)[1],url));const tick=StudioSimulation.prototype.tick;window.snaps=[];const seen=new WeakSet();StudioSimulation.prototype.tick=function(dt){tick.call(this,dt);if(this.time>=2&&!seen.has(this)){seen.add(this);window.snaps.push(JSON.stringify({balls:this.balls,events:this.events,escaped:this.escaped}));}};}''')
 for mode in [9,10,11]:
  page.locator('.mode').nth(mode).click();page.locator('#newVariant').click()
  page.locator('#sound').check();page.locator('#audioPreview').click()
  page.evaluate('window.snaps=[]');page.locator('#replay').click();page.wait_for_function('window.snaps.length>=1')
  page.locator('#record').click();page.wait_for_function('window.snaps.length>=2')
  assert page.evaluate('window.snaps[0]===window.snaps[1]')
  page.wait_for_timeout(2000);page.locator('#stopRecord').click();page.wait_for_selector('#download:visible')
  result=page.evaluate('''async()=>{const blob=await(await fetch(document.getElementById('download').href)).blob();const v=document.createElement('video');v.src=URL.createObjectURL(blob);await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});const data=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split('base64,')[1]);f.readAsDataURL(blob)});return {duration:v.duration,width:v.videoWidth,data};}''')
  path=f'/tmp/studio-{mode}.webm';open(path,'wb').write(base64.b64decode(result.pop('data')))
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','json',path]))
  assert any(s['codec_type']=='audio' for s in probe['streams'])
  if mode==11:
   raw=subprocess.check_output(['ffmpeg','-v','error','-i',path,'-vn','-f','f32le','-ac','1','-ar','16000','pipe:1'])
   samples=struct.unpack('<'+'f'*(len(raw)//4),raw);assert max(map(abs,samples))>.0001
   print('Garden decoded peak',max(map(abs,samples)))
  assert result['duration']>2 and result['width']==720
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'/tmp/studio-{mode}.png',full_page=True)
  print(mode,result)
 saved=page.evaluate("JSON.parse(localStorage.getItem('chaosloop-run'))")
 page.reload(wait_until='networkidle')
 assert 'Sound Garden' in page.locator('.mode.active').inner_text()
 assert int(page.locator('#seed').input_value())==saved['seed']
 assert int(page.locator('#cfg-bumpers').input_value())==saved['bumpers']
 page.locator('#cfg-layout').select_option('1')
 assert page.evaluate("JSON.parse(localStorage.getItem('chaosloop-run')).layout") == 1
 assert not errors,errors
 browser.close()
