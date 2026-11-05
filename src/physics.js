export const MODES = [
  { name: 'Orbit', subtitle: 'Ein Hammer. Endlose Möglichkeiten.', icon: '↻' },
  { name: 'Freiflug', subtitle: 'Ein Hammer auf eigener Mission.', icon: '↗' },
  { name: 'Doppel-Orbit', subtitle: 'Zwei Hämmer, doppelte Dynamik.', icon: '✣' },
  { name: 'Laser', subtitle: 'Licht trifft auf Kettenreaktion.', icon: 'ϟ' },
  { name: 'Overdrive', subtitle: 'Mehr Hämmer. Immer schneller.', icon: '»' },
  { name: 'Chaos', subtitle: 'Erwarte das Unerwartete.', icon: '✧' },
  { name: 'Laserflug', subtitle: 'Zwei frei fliegende Laser ziehen ihre Bahnen.', icon: 'ϟ' },
];
export function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx-ax, dy = by-ay;
  const t = Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(px-ax-t*dx, py-ay-t*dy);
}
export function wallCollision(ball, radius) {
  const d = Math.hypot(ball.x, ball.y), limit = radius-ball.r;
  if (d <= limit) return false;
  const nx = d ? ball.x/d : 1, ny = d ? ball.y/d : 0;
  ball.x = nx*limit; ball.y = ny*limit;
  const vn = ball.vx*nx+ball.vy*ny;
  if (vn > 0) { ball.vx -= 2*vn*nx; ball.vy -= 2*vn*ny; }
  return true;
}
export function ballCollision(a, b) {
  const dx = b.x-a.x, dy = b.y-a.y, d = Math.hypot(dx,dy), sum = a.r+b.r;
  if (d >= sum) return false;
  const nx = d ? dx/d : 1, ny = d ? dy/d : 0;
  const shift = (sum-d)/2;
  a.x -= nx*shift; a.y -= ny*shift; b.x += nx*shift; b.y += ny*shift;
  const closing = (b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
  if (closing < 0) {
    a.vx += closing*nx; a.vy += closing*ny;
    b.vx -= closing*nx; b.vy -= closing*ny;
  }
  return true;
}
// Renderer and hit detection use the same capsule dimensions.
export function toolSegment(tool) {
  const c = Math.cos(tool.angle), s = Math.sin(tool.angle);
  if (tool.kind === 'laser') {
    const start = tool.centered ? -tool.length/2 : 0;
    const end = tool.centered ? tool.length/2 : tool.length;
    return [tool.x+c*start, tool.y+s*start, tool.x+c*end, tool.y+s*end];
  }
  const x = tool.x+c*tool.length, y = tool.y+s*tool.length;
  return [x-s*tool.headHalfLength, y+c*tool.headHalfLength,
    x+s*tool.headHalfLength, y-c*tool.headHalfLength];
}
export function toolHitsBall(tool, ball) {
  return distanceToSegment(ball.x, ball.y, ...toolSegment(tool)) < ball.r+tool.width/2;
}
export class Simulation {
  constructor(options = {}) {
    this.mode = options.mode ?? 0;
    this.random = options.random ?? Math.random;
    this.grow = options.grow ?? true;
    this.limit = Math.max(2, Math.min(options.limit ?? 512, 1200));
    this.balls = []; this.time = 0; this.radius = 210; this.nextId = 0;
    this.splits = 0; this.onSplit = null; this.event = ''; this.eventUntil = 0;
    this.nextEvent = 5; this.chaosSpeed = 1; this.angle = 0;
    this.fly = {x:0,y:0,vx:88,vy:61,r:Math.hypot(40,34)+13};
    this.lasers = [
      {x:-65,y:-35,vx:74,vy:57,r:61,angle:.4,spin:.85,color:'#ff739e'},
      {x:65,y:35,vx:-63,vy:79,r:61,angle:2.1,spin:-1.05,color:'#70ebc7'},
    ];
    for (let i=0; i<(options.initial ?? 4); i++) {
      const a = i*Math.PI*2/(options.initial ?? 4)+.4;
      this.balls.push(this.makeBall(Math.cos(a)*100, Math.sin(a)*100));
    }
  }
  makeBall(x,y) {
    const a = this.random()*Math.PI*2, speed = 95+this.random()*45;
    return {id:this.nextId++, x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:7,born:this.time,hue:this.random()*90+150};
  }
  split(id) {
    if (this.balls.length >= this.limit) return false;
    const i = this.balls.findIndex(b => b.id === id);
    if (i < 0) return false;
    const parent = this.balls[i], speed = Math.max(95, Math.hypot(parent.vx,parent.vy));
    const a = Math.atan2(parent.vy,parent.vx), nx = -Math.sin(a), ny = Math.cos(a);
    const children = [-1,1].map(sign => {
      const child = this.makeBall(parent.x+sign*nx*7.1, parent.y+sign*ny*7.1);
      child.vx = Math.cos(a+sign*.55)*speed;
      child.vy = Math.sin(a+sign*.55)*speed;
      child.hue = (parent.hue+sign*13+360)%360;
      wallCollision(child,this.radius);
      return child;
    });
    this.balls.splice(i,1,...children); this.splits++;
    this.onSplit?.(parent);
    return true;
  }
  tools() {
    if (this.mode === 6) return this.lasers.map(laser => ({...laser,length:116,width:6,centered:true,kind:'laser'}));
    if (this.mode === 1) return [{x:this.fly.x,y:this.fly.y,angle:this.angle,length:40,width:26,headHalfLength:34,kind:'hammer'}];
    const count = this.mode === 2 ? 2 : this.mode === 4 ? Math.min(5,2+Math.floor(this.time/8)) : this.mode === 5 ? 3 : 1;
    return Array.from({length:count},(_,i) => ({x:0,y:0,angle:this.angle+i*Math.PI*2/count,
      length:this.radius*.77, width:this.mode===3?6:26,headHalfLength:34,kind:this.mode===3?'laser':'hammer'}));
  }
  step(dt) {
    // Fixed substeps bound both ball travel and the tip's swept arc on mobile devices.
    dt = Math.min(Math.max(dt,0),1/15);
    const n = Math.max(1,Math.ceil(dt/(1/240))), h = dt/n;
    for (let sub=0;sub<n;sub++) this.tick(h);
  }
  tick(dt) {
    this.time += dt;
    const target = this.grow ? Math.min(365,210+Math.sqrt(Math.max(0,this.balls.length-4))*5) : 210;
    this.radius += (target-this.radius)*Math.min(1,dt*2);
    if (this.mode===5 && this.time>=this.nextEvent) {
      const event = Math.floor(this.random()*3);
      this.event = ['TEMPO BOOST','RICHTUNGSWECHSEL','ENERGIE-IMPULS'][event];
      this.eventUntil=this.time+2; this.nextEvent=this.time+5;
      this.chaosSpeed = event===0?1.8:1;
      for (const b of this.balls) {
        if (event===1) {b.vx*=-1;b.vy*=-1;}
        if (event===2) {const a=this.random()*Math.PI*2;b.vx=Math.cos(a)*160;b.vy=Math.sin(a)*160;}
      }
    }
    const speed = this.mode===4 ? Math.min(2.6,.8+this.time*.035) : this.mode===5?this.chaosSpeed:1;
    this.angle += dt*speed;
    this.fly.x+=this.fly.vx*dt;this.fly.y+=this.fly.vy*dt;wallCollision(this.fly,this.radius);
    if (this.mode === 6) for (const laser of this.lasers) {
      laser.x += laser.vx*dt; laser.y += laser.vy*dt;
      laser.angle += laser.spin*dt;
      wallCollision(laser,this.radius);
    }
    for (const b of this.balls) { b.x+=b.vx*dt;b.y+=b.vy*dt;wallCollision(b,this.radius); }
    // Uniform grid keeps collision work local instead of comparing every pair.
    const grid = new Map(), cell = 14;
    for (const b of this.balls) {
      const gx=Math.floor(b.x/cell), gy=Math.floor(b.y/cell);
      for (let x=gx-1;x<=gx+1;x++) for(let y=gy-1;y<=gy+1;y++) {
        for (const a of grid.get(`${x},${y}`) ?? []) ballCollision(a,b);
      }
      const key=`${gx},${gy}`;
      if (!grid.has(key)) grid.set(key,[]);
      grid.get(key).push(b);
    }
    const tools=this.tools(), hits=[];
    for (const b of this.balls) {
      wallCollision(b,this.radius);
      // Fresh children have a short grace period to prevent same-frame cascades.
      if (this.time-b.born<.48) continue;
      for (const tool of tools) {
        const hit=toolHitsBall(tool,b);
        if(hit){hits.push(b.id);break;}
      }
    }
    for(const id of hits) {if(this.balls.length>=this.limit)break;this.split(id);}
  }
}
