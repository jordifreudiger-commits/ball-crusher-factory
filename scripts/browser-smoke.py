"""Optional: pip install playwright; run against `node scripts/server.js --dist`."""
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width':393,'height':852})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://localhost:5173/', wait_until='networkidle')
    assert page.locator('.mode').count()==9
    assert 'Ricochet' in page.locator('.mode.active').inner_text()
    assert page.locator('#initial').input_value()=='1'
    for i in range(9):
        page.locator('.mode').nth(i).click()
        page.wait_for_timeout(80)
    page.locator('#newVariant').click()
    assert page.locator('#seed').input_value()!='1'
    page.locator('#resetSettings').click()
    assert 'Ricochet' in page.locator('.mode.active').inner_text()
    assert page.locator('#seed').input_value()=='1'
    # Observe actual simulation instances used by the UI, including the export replay.
    page.evaluate('''async()=>{
        const url=document.querySelector('script[type=module]').src;
        const source=await (await fetch(url)).text();
        const path=source.match(/from '([^']+)'/)[1];
        const {Simulation}=await import(new URL(path,url));
        const original=Simulation.prototype.tick, seen=new WeakSet();window.snapshots=[];
        Simulation.prototype.tick=function(dt){original.call(this,dt);if(this.time>=1&&!seen.has(this)){
          seen.add(this);window.snapshots.push(JSON.stringify({balls:this.balls,head:this.head,splits:this.splits}));
        }};
        window.texts=[];const fill=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(t,...args){window.texts.push(t);return fill.call(this,t,...args)};
    }''')
    page.locator('#replay').click()
    page.wait_for_function('window.snapshots.length>=1')
    # Clear the instrumented pre-replay instance if it had already reached 1 s.
    page.evaluate('window.snapshots=[]')
    page.locator('#replay').click()
    page.wait_for_function('window.snapshots.length===1')
    page.locator('#replay').click()
    page.wait_for_function('window.snapshots.length===2')
    page.locator('#record').click()
    assert page.locator('#newVariant').is_disabled()
    page.wait_for_function('window.snapshots.length===3')
    assert page.evaluate('window.snapshots.every(s=>s===window.snapshots[0])')
    page.locator('#stopRecord').click()
    page.wait_for_selector('#download:visible')
    video=page.evaluate('''async()=>{
      const blob=await(await fetch(document.getElementById('download').href)).blob();
      const v=document.createElement('video');v.src=URL.createObjectURL(blob);
      await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});
      return {width:v.videoWidth,height:v.videoHeight,size:blob.size,type:blob.type};
    }''')
    assert video['width']==720 and video['height']==1280 and video['size']>1000
    assert 'seed-1' in page.locator('#download').get_attribute('download')
    assert page.evaluate('window.texts.length>0&&window.texts.every(t=>/^[0-9.]+$/.test(t))')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    page.locator('#preset').select_option('pulse')
    page.wait_for_timeout(600)
    page.screenshot(path='/tmp/bc-pulse.png',full_page=True)
    page.locator('#resetSettings').click()
    page.wait_for_timeout(600)
    page.screenshot(path='/tmp/bc-ricochet.png',full_page=True)
    print(json.dumps({'video':video,'matchingReplaySnapshots':3,'errors':errors}))
    browser.close()
