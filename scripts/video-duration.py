from playwright.sync_api import sync_playwright
import base64,subprocess,json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for webm in [False,True]:
  page=b.new_page()
  if webm:page.add_init_script("const supported=MediaRecorder.isTypeSupported.bind(MediaRecorder);MediaRecorder.isTypeSupported=t=>!t.startsWith('video/mp4')&&supported(t)")
  page.goto('http://localhost:5173/')
  page.locator('#sound').check();page.locator('#audioPreview').click();page.locator('#record').click();page.wait_for_timeout(6000);page.locator('#stopRecord').click();page.wait_for_selector('#download:visible')
  result=page.evaluate('''async()=>{const blob=await(await fetch(document.getElementById('download').href)).blob();const v=document.createElement('video');v.src=URL.createObjectURL(blob);await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});const data=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split('base64,')[1]);f.readAsDataURL(blob)});return {duration:v.duration,type:blob.type,data}}''')
  path='/tmp/bc-duration.'+('webm' if webm else 'mp4');open(path,'wb').write(base64.b64decode(result.pop('data')))
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,duration','-of','json',path]))
  assert 5.8<float(probe['format']['duration'])<7,probe
  assert 5.8<result['duration']<7,result
  assert any(s['codec_type']=='audio' for s in probe['streams'])
  print(json.dumps({'browser':result,'probe':probe}))
  page.close()
 b.close()
