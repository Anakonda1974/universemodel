// graphEditorRefactor.js  –  Complete build 🟢  (2025-06-29)
// ================================================================
// Requires global LeaderLine, interact.js, Tailwind, SeedManager,
// PropertyGraph, ProceduralEntity, createPlanetDefinitions.
// Auto-boots on DOMContentLoaded.
// ================================================================

/* ───────────────────────────── 0. Utils ──────────────────────────────── */
const $  = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const snap = (v, step) => Math.round(v / step) * step;
const rafThrottle = fn => {
  let ticking = false;
  return (...args) => {
    if (!ticking) {
      requestAnimationFrame(() => { fn(...args); ticking = false; });
      ticking = true;
    }
  };
};

/* ───────────────────────────── 1. History ────────────────────────────── */
class HistoryManager {
  _s = []; _i = -1;
  push(cmd){ this._s.splice(this._i+1); this._s.push(cmd); this._i++; }
  undo()   { if(this._i>=0)             this._s[this._i--].undo(); }
  redo()   { if(this._i+1<this._s.length) this._s[++this._i].redo(); }
}

/* ───────────────────────────── 2. Global state ──────────────────────── */
class EditorState {
  x=0; y=0; scale=1; snap=20;
  cards=new Map(); connections=new Set(); history=new HistoryManager();
  reset(){ this.x=0; this.y=0; this.scale=1; }
}
window.editor={state:new EditorState()};   // for console debugging

/* ───────────────────────────── 3. Card class ─────────────────────────── */
class Card {
  constructor(id, props, state, {x=0,y=0,width=200}={}){
    this.id=id; this.props=props; this.state=state;
    this._px=x; this._py=y;              // raw unsnapped pos
    this.el=this._buildDOM(id,props,width);
    this.translate(x,y);
    this._bindDrag();
    this._bindSelection();
    state.cards.set(id,this);
  }

  _buildDOM(title, props, width){
    const card=document.createElement('div');
    card.className='card window absolute shadow bg-white border border-slate-300 rounded';
    card.style.width=`${width}px`;

    /* titlebar */
    const bar=document.createElement('div');
    bar.className='titlebar bg-slate-800 text-white px-2 py-1 flex justify-between items-center cursor-move select-none';
    bar.innerHTML=`<span>${title}</span><button class="text-red-400 hover:text-red-700">×</button>`;
    bar.querySelector('button').onclick=()=>this.remove();
    card.appendChild(bar);

    /* body */
    const body=document.createElement('div');
    body.className='window-body space-y-1 p-1 text-sm';

    Object.entries(props).forEach(([key,val],idx)=>{
      const row=document.createElement('div');
      row.className=`row flex items-center space-x-1 px-1 ${idx%2?'bg-indigo-100':'bg-indigo-50'}`;
      row.dataset.id=key;
      row.innerHTML=`
        <div class="port in-port w-4 h-4 bg-red-300 rounded-full border border-red-400"
             id="in-${key}" data-prop="${key}"></div>
        <span class="flex-1 truncate">${key}:</span>
        <input class="value-input bg-gray-100 border border-gray-300 rounded px-1 w-20" value="${val}">
        <div class="port out-port w-4 h-4 bg-blue-300 rounded-full border border-blue-400"
             id="out-${key}" data-prop="${key}"></div>`;
      body.appendChild(row);
    });
    card.appendChild(body);

    $('#canvas').appendChild(card);
    return card;
  }

  /* ---- drag ---- */
  _bindDrag(){
    interact(this.el).draggable({
      allowFrom:'.titlebar',
      listeners:{
        start:()=>this.el.classList.add('dragging'),
        move:rafThrottle(ev=>{
          this._px+=ev.dx; this._py+=ev.dy;                      // accumulate raw
          const sx=snap(this._px,this.state.snap);
          const sy=snap(this._py,this.state.snap);
          this.translate(sx,sy);
          this.state.connections.forEach(c=>c.update());
        }),
        end:()=>this.el.classList.remove('dragging')
      }
    });
  }
  translate(x,y){
    this.el.style.transform=`translate(${x}px, ${y}px)`;
    this.el.dataset.x=this._px; this.el.dataset.y=this._py;     // expose raw for logic
  }

  /* ---- selection / context menu ---- */
  _bindSelection(){
    const bar=this.el.querySelector('.titlebar');
    bar.addEventListener('mousedown',e=>{ e.shiftKey?Card._toggle(this):Card._single(this);});
    this.el.addEventListener('contextmenu',e=>{
      e.preventDefault(); Card._single(this);
      showContextMenu(e.clientX,e.clientY,[
        {label:'Delete card', fn:()=>this.remove()},
        {label:'Clear connections', fn:()=>$$('.port',this.el).forEach(deletePortConnections)}
      ]);
    });
  }
  remove(){
    $$(' .port',this.el).forEach(deletePortConnections);
    this.el.remove(); this.state.cards.delete(this.id);
  }
  static _sel=new Set();
  static clear(){ this._sel.forEach(c=>c.el.classList.remove('selected')); this._sel.clear();}
  static _toggle(c){ c.el.classList.toggle('selected'); this._sel.has(c)?this._sel.delete(c):this._sel.add(c);}
  static _single(c){ if(this._sel.size===1&&this._sel.has(c))return; this.clear(); c.el.classList.add('selected'); this._sel.add(c);}
}

/* ───────────────────────────── 4. Connection class ───────────────────── */
class Connection{
  constructor(from,to,state,anchors=[]){
    this.from=from; this.to=to; this.state=state;
    this.line=new LeaderLine(from,to,{
      color:'cyan',path:'fluid',startSocket:'right',endSocket:'left',
      startPlug:'square',endPlug:'arrow',zIndex:0
    });
    this.anchors=[];
    anchors.forEach(p=>this._addAnchor(p.x,p.y));
    this._addEndpointPins(); this._bindLineDblClick();
    state.connections.add(this); this.update();
  }

  /* endpoint pins */
  _addEndpointPins(){
    this.startPin=this._createPin(this.from,'from');
    this.endPin  =this._createPin(this.to,'to');
  }
  _createPin(port,role){
    const pin=document.createElement('div');
    pin.className='endpoint-pin w-3 h-3 bg-orange-400 rounded-full absolute cursor-pointer';
    $('#workspace').appendChild(pin);

    const isFrom=role==='from';
    let ox,oy;                                     // original snapped
    const restore=()=>{ pin.style.left=ox; pin.style.top=oy; this.line.setOptions({[isFrom?'start':'end']:port});};

    interact(pin).draggable({
      listeners:{
        start:()=>{ ox=pin.style.left; oy=pin.style.top; this.line.setOptions({[isFrom?'startSocket':'endSocket']:'auto'});},
        move:rafThrottle(ev=>{
          const nx=parseFloat(pin.style.left||0)+ev.dx;
          const ny=parseFloat(pin.style.top||0)+ev.dy;
          pin.style.left=`${nx}px`; pin.style.top=`${ny}px`;
          this.line.setOptions({[isFrom?'start':'end']:LeaderLine.pointAnchor({x:nx-this.state.x,y:ny-this.state.y})});
        }),
        end:ev=>{
          const elem=document.elementFromPoint(ev.clientX,ev.clientY);
          const ok=elem?.classList.contains(isFrom?'out-port':'in-port')?elem:null;
          ok?attemptConnect(isFrom?ok:this.from,isFrom?this.to:ok,this.state)&&this.destroy():restore();
        }
      }
    });
    return pin;
  }

  /* mid-route anchors */
  _addAnchor(x,y){
    const h=document.createElement('div');
    h.className='line-handle w-3 h-3 bg-green-500 rounded-full absolute opacity-80 cursor-pointer';
    $('#workspace').appendChild(h);
    const anchorObj=this.line.addPointAnchor(LeaderLine.pointAnchor({element:h}));
    const data={anchorObj,handle:h,pos:{x:snap(x,this.state.snap),y:snap(y,this.state.snap)},_px:x,_py:y};
    this.anchors.push(data);
    interact(h).draggable({
      listeners:{move:rafThrottle(ev=>{
        data._px+=ev.dx/this.state.scale;
        data._py+=ev.dy/this.state.scale;
        data.pos.x=snap(data._px,this.state.snap);
        data.pos.y=snap(data._py,this.state.snap);
        this.update();
      })}
    });
    h.addEventListener('dblclick',()=>{
      this.line.removePointAnchor(anchorObj); h.remove();
      this.anchors.splice(this.anchors.indexOf(data),1); this.update();
    });
  }
  _bindLineDblClick(){
    const path=this.line.path||this.line.svg||this.line.element;
    if(path&&path.style){ path.style.pointerEvents='stroke';
      path.addEventListener('dblclick',e=>{
        const ws=$('#workspace').getBoundingClientRect();
        const pos={x:(e.clientX-ws.left-this.state.x)/this.state.scale,
                   y:(e.clientY-ws.top -this.state.y)/this.state.scale};
        this._addAnchor(pos.x,pos.y);
      });
    }
  }

  update=rafThrottle(()=>{
    this.line.position();
    const fix=(pin,port)=>{
      const r=port.getBoundingClientRect(),ws=$('#workspace').getBoundingClientRect();
      pin.style.left=`${r.left-ws.left}px`;
      pin.style.top =`${(r.top+r.bottom)/2-ws.top}px`;
    };
    fix(this.startPin,this.from); fix(this.endPin,this.to);
    this.anchors.forEach(a=>{
      const ax=this.state.x+a.pos.x*this.state.scale;
      const ay=this.state.y+a.pos.y*this.state.scale;
      a.handle.style.left=`${ax-a.handle.offsetWidth/2}px`;
      a.handle.style.top =`${ay-a.handle.offsetHeight/2}px`;
    });
  });
  destroy(){ this.line.remove();[this.startPin,this.endPin,...this.anchors.map(a=>a.handle)].forEach(el=>el.remove());
             this.state.connections.delete(this);}
  serialize(){return{from:this.from.id,to:this.to.id,anchors:this.anchors.map(a=>a.pos)};}
}

/* ───────────────────────────── 5. Port helpers ───────────────────────── */
function deletePortConnections(port){ [...window.editor.state.connections].forEach(c=>{if(c.from===port||c.to===port)c.destroy();});}

/* ───────────────────────────── 6. Context menu ───────────────────────── */
const ctxMenu=$('#contextMenu');
function showContextMenu(x,y,items){
  ctxMenu.innerHTML=''; items.forEach(it=>{const d=document.createElement('div'); d.textContent=it.label;
    d.className='px-2 py-1 hover:bg-gray-100 cursor-pointer'; d.onclick=()=>{it.fn();ctxMenu.classList.add('hidden');};
    ctxMenu.appendChild(d);});
  ctxMenu.style.left=`${x}px`; ctxMenu.style.top=`${y}px`; ctxMenu.classList.remove('hidden');
}
window.addEventListener('click',()=>ctxMenu.classList.add('hidden'));
window.addEventListener('contextmenu',e=>{if(!ctxMenu.contains(e.target))ctxMenu.classList.add('hidden');});

/* ───────────────────────────── 7. Connection logic ───────────────────── */
function attemptConnect(from,to,state){
  if(!from||!to||from===to){alert('Cannot connect a port to itself');return false;}
  if(from.classList.contains('in-port')||to.classList.contains('out-port')){alert('Wire must go from an out-port to an in-port');return false;}
  const a=from.dataset.prop,b=to.dataset.prop;
  if([...state.connections].some(c=>c.from===from&&c.to===to))return false;

  /* cycle check */
  const graph={};
  state.connections.forEach(c=>(graph[c.from.dataset.prop]??=new Set()).add(c.to.dataset.prop));
  (graph[a]??=new Set()).add(b);
  const reachesStart=(n,vis=new Set())=>{
    if(n===a) return true;
    if(vis.has(n)) return false;
    vis.add(n); return [...(graph[n]||[])].some(k=>reachesStart(k,vis));
  };
  if(reachesStart(b)){alert('Circular dependency detected');return false;}

  const conn=new Connection(from,to,state);
  state.history.push({undo:()=>conn.destroy(),redo:()=>attemptConnect(from,to,state)});
  return true;
}

/* ───────────────────────────── 8. interact.js wiring ─────────────────── */
function bindPortDrags(state){
  let temp=null;
  interact('.out-port').draggable({
    listeners:{
      start(ev){
        ev.target.classList.add('port-hover'); $$('.in-port').forEach(p=>p.classList.add('port-target'));
        temp=new LeaderLine(ev.target,LeaderLine.pointAnchor({x:ev.clientX,y:ev.clientY}),
          {color:'cyan',path:'fluid',startSocket:'right',endSocket:'left',startPlug:'square',endPlug:'arrow'});
      },
      move(ev){ temp?.setOptions({end:LeaderLine.pointAnchor({x:ev.clientX,y:ev.clientY})});},
      end(ev){ ev.target.classList.remove('port-hover'); $$('.in-port').forEach(p=>p.classList.remove('port-target'));
        temp?.remove(); temp=null;}
    }
  });
  interact('.in-port').dropzone({
    ondragenter:ev=>ev.target.classList.add('port-hover'),
    ondragleave:ev=>ev.target.classList.remove('port-hover'),
    ondrop:ev=>{ev.target.classList.remove('port-hover'); temp?.remove(); temp=null;
      attemptConnect(ev.relatedTarget,ev.target,state);}
  });
}

/* ───────────────────────────── 9. Pan / zoom ─────────────────────────── */
function bindPanZoom(state){
  const canvas=$('#canvas');
  const render=()=>{canvas.style.transform=`translate(${state.x}px,${state.y}px) scale(${state.scale})`;
                    state.connections.forEach(c=>c.update());};

  let panning=false,sx=0,sy=0;
  $('#workspace').addEventListener('mousedown',e=>{if(e.target===$('#workspace')){panning=true;sx=e.clientX;sy=e.clientY;}});
  window.addEventListener('mousemove',e=>{if(!panning)return; state.x+=e.clientX-sx; state.y+=e.clientY-sy; sx=e.clientX; sy=e.clientY; render();});
  window.addEventListener('mouseup',()=>panning=false);
  $('#workspace').addEventListener('wheel',e=>{e.preventDefault();
    state.scale=Math.min(2,Math.max(0.5,state.scale+(e.deltaY<0?0.1:-0.1))); render();},{passive:false});
  $('#resetBtn').onclick=()=>{state.reset();render();};
  $('#snapInput').addEventListener('change',e=>{state.snap=parseInt(e.target.value)||1;});
  $('#clearBtn').onclick=()=>[...state.connections].forEach(c=>c.destroy());
}

/* ───────────────────────────── 10. Graph/model sync  ─────────────────── */
function buildGraph(state,defs){
  const arr=defs.filter(d=>$('#out-'+d.id)).map(d=>({...d,inputs:[]}));
  const map=Object.fromEntries(arr.map(d=>[d.id,d]));
  state.connections.forEach(c=>{map[c.to.dataset.prop]?.inputs.push(c.from.dataset.prop);});
  return new PropertyGraph(Object.values(map));
}
function refreshValues(planet,groups,trace){
  requestAnimationFrame(()=>{
    $$('.card').forEach(card=>{
      const group=card.querySelector('.titlebar span').textContent;
      const props=groups[group]||{};
      Object.entries(props).forEach(([k,v])=>{
        const row=card.querySelector(`.row[data-id="${k}"]`);
        if(!row)return;
        row.querySelector('.value-input').value=v;
        const inputs=trace[k]?.inputs||{};
        const inputStr=Object.entries(inputs).map(([kk,vv])=>`${kk}: ${vv}`).join(', ');
        const def=planet.graph.getDefinition(k);
        const formula=def&&def.compute?def.compute.toString().replace(/\n/g,' '):'';
        row.title=formula+(inputStr?` | ${inputStr}`:'');
      });
    });
  });
}

/* ───────────────────────────── 11. Bootstrap  ─────────────────────────── */
function bootstrap(){
  const state=window.editor.state;
  const seedManager=new SeedManager('DemoSeed42');
  const baseDefs=createPlanetDefinitions();
  const graph=new PropertyGraph(baseDefs.map(d=>({...d})));
  const planet=new ProceduralEntity('Planet-X',['MilkyWay','System-4','Planet-X'],seedManager,graph);

  const groups=planet.generateGrouped();
  let cx=20,cy=20;
  Object.entries(groups).forEach(([g,props])=>{new Card(g,props,state,{x:cx,y:cy}); cy+=30; cx+=220;});

  bindPortDrags(state); bindPanZoom(state);

  baseDefs.forEach(d=>{(d.inputs||[]).forEach(dep=>{
    const from=$('#out-'+dep),to=$('#in-'+d.id); if(from&&to)attemptConnect(from,to,state);
  });});

  const updateModel=()=>{
    planet.graph=buildGraph(state,baseDefs);
    refreshValues(planet,planet.generateGrouped(),planet.generateTrace());
  };
  updateModel();
  state.connections.forEach(c=>{const old=c.update; c.update=()=>{old.call(c); updateModel();};});
  $('#canvas').addEventListener('change',e=>{
    if(e.target.classList.contains('value-input')){
      const row=e.target.closest('.row'); const prop=row.dataset.id;
      const def=baseDefs.find(d=>d.id===prop); if(def)def.value=parseFloat(e.target.value)||e.target.value;
      updateModel();
    }
  });
  window.addEventListener('keydown',e=>{
    if(!e.ctrlKey)return;
    if(e.key==='z'&&!e.shiftKey){e.preventDefault();state.history.undo();}
    if(e.key==='y'||(e.key==='z'&&e.shiftKey)){e.preventDefault();state.history.redo();}
  });
}

/* ───── auto-bootstrap (delete if you prefer manual) ──── */
document.readyState==='loading'
  ? document.addEventListener('DOMContentLoaded',bootstrap)
  : bootstrap();

/* ================================================================ */
