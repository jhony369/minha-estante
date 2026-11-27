// Biblioteca 3D caminhável da Minha Estante
import * as THREE from './lib/three.module.min.js';
import {GENRES} from './catalog.js';

let L=null;
const CSS=`
#lib{position:fixed;inset:0;z-index:35;display:none;background:#0d0906;color:#f3eadb;font-family:Inter,system-ui,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none}
#lib.open{display:block;animation:libin .5s ease}
@keyframes libin{from{opacity:0}}
#lib canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.lbtop{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top)) 12px 10px;background:linear-gradient(180deg,rgba(10,6,3,.85),transparent);pointer-events:none}
.lbtop>*{pointer-events:auto}
.lbtop b{flex:1;text-align:center;font:400 22px "DM Serif Display",serif;letter-spacing:.02em;text-shadow:0 2px 10px #000}
.lbb{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,220,160,.35);background:rgba(30,18,10,.7);color:#f3eadb;font:600 14px Inter,sans-serif;backdrop-filter:blur(6px)}
.lbhint{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);background:rgba(20,12,6,.78);border:1px solid rgba(255,220,160,.25);padding:10px 16px;border-radius:14px;font-size:13.5px;text-align:center;line-height:1.4;max-width:calc(100% - 32px);transition:opacity .8s;pointer-events:none}
.lbjoy{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:2px solid rgba(255,220,160,.35);background:radial-gradient(circle,rgba(255,220,160,.12),rgba(255,220,160,.03));display:none;pointer-events:none}
.lbjoy i{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,226,170,.55);box-shadow:0 0 18px rgba(255,200,120,.5)}
.lbload{position:absolute;inset:0;display:grid;place-items:center;background:#0d0906;font:400 26px "DM Serif Display",serif;transition:opacity .6s}
.lbload small{display:block;font:13px Inter,sans-serif;color:#b8a68c;margin-top:8px;text-align:center}
.lbmenu{position:absolute;inset:0;background:rgba(8,5,3,.88);display:none;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) 16px 20px;backdrop-filter:blur(8px)}
.lbmenu.open{display:flex}
.lbmenu h2{font:400 26px "DM Serif Display",serif;margin:6px 0 12px}
.lbmenu input{min-height:46px;border-radius:999px;border:1px solid rgba(255,220,160,.35);background:rgba(255,255,255,.06);color:#f3eadb;padding:0 18px;font-size:16px;margin-bottom:12px}
.lbmenu .gl{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-content:start}
.lbmenu .gl button{min-height:64px;border-radius:14px;border:1px solid rgba(255,220,160,.2);background:linear-gradient(135deg,var(--g),rgba(0,0,0,.4));color:#fff;text-align:left;padding:10px 12px;font:600 15px Inter,sans-serif}
.lbmenu .gl button small{display:block;font-weight:400;font-size:12px;opacity:.75;margin-top:2px}
.lbmenu .gl button.bk{grid-column:1/-1;min-height:52px;background:rgba(255,255,255,.05)}
`;

const nrm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
async function getJSON(u,ms){const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),ms||4000);try{const r=await fetch(u,{cache:'no-cache',signal:ctl.signal});return r.ok?await r.json():null}catch(e){return null}finally{clearTimeout(t)}}
const WS=u=>'https://wsrv.nl/?url='+encodeURIComponent(u)+'&w=400&h=600&fit=cover&output=jpg&q=82';
const BOOKRE=/\.(pdf|epub|txt|cbz|zip)$/i;
function cleanName(n){return n.replace(BOOKRE,'').replace(/[_]+/g,' ').replace(/\s*[\(\[](z-?lib[^\)\]]*|pdf|epub)[\)\]]\s*/ig,' ').replace(/\s+/g,' ').trim()||n}
async function driveList(cfg){const out=[];const K=encodeURIComponent(cfg.chave);
  async function ls(folder,genre,depth){let tok='';do{const q=encodeURIComponent("'"+folder+"' in parents and trashed=false");
    const u='https://www.googleapis.com/drive/v3/files?q='+q+'&key='+K+'&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,size,description,shortcutDetails(targetId,targetMimeType))'+(tok?'&pageToken='+tok:'');
    const j=await getJSON(u,15000);if(!j||!j.files)throw new Error('drive');
    for(const f0 of j.files){let f=f0;const sc=f.shortcutDetails;if(f.mimeType==='application/vnd.google-apps.shortcut'){if(!sc)continue;f=Object.assign({},f,{id:sc.targetId,mimeType:sc.targetMimeType})}
      if(f.mimeType==='application/vnd.google-apps.folder'){if(depth<3)await ls(f.id,depth===0?f.name:genre,depth+1);continue}
      if(!BOOKRE.test(f.name))continue;
      out.push({titulo:cleanName(f.name),arquivo:'https://www.googleapis.com/drive/v3/files/'+f.id+'?alt=media&key='+K,formato:f.name.match(BOOKRE)[1].toLowerCase(),capa:f.thumbnailLink?WS(f.thumbnailLink.replace(/^https?:\/\//,'').replace(/=s\d+$/,'=s400')):null,genero:genre||cfg.generoRaiz||'Acervo',descricao:f.description||'',autor:''})}
    tok=j.nextPageToken||''}while(tok)}
  await ls(cfg.pasta,'',0);return out}
async function loadDrive(){const cfg=await getJSON('acervo/drive.json');if(!cfg||!cfg.pasta||!cfg.chave)return [];
  try{const l=await driveList(cfg);try{localStorage.setItem('estante.drive',JSON.stringify(l))}catch(e){}return l}
  catch(e){try{return JSON.parse(localStorage.getItem('estante.drive')||'[]')}catch(_){return []}}}
const strip=h=>String(h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();
const one=v=>Array.isArray(v)?v[0]:v;
async function iaItem(id,genre){const j=await getJSON('https://archive.org/metadata/'+encodeURIComponent(id),15000);if(!j||!j.files)throw new Error('ia');const md=j.metadata||{};
  const fs=j.files.filter(f=>f.source==='original'&&BOOKRE.test(f.name)&&!/(_text\.pdf|_bw\.pdf)$/i.test(f.name));
  const g=genre||one(md.subject)||(fs.length>1?one(md.title):'')||'Acervo';const base='https://archive.org/download/'+encodeURIComponent(id)+'/';
  return fs.map(f=>({titulo:fs.length===1&&md.title?String(one(md.title)):cleanName(f.name.split('/').pop()),autor:fs.length===1?String(one(md.creator)||''):'',ano:parseInt(one(md.date))||0,descricao:fs.length===1?strip(one(md.description)).slice(0,1500):'',
    arquivo:base+f.name.split('/').map(encodeURIComponent).join('/'),formato:f.name.match(BOOKRE)[1].toLowerCase(),capa:fs.length===1?WS('archive.org/services/img/'+encodeURIComponent(id)):null,genero:String(g).slice(0,40)}))}
async function loadArchive(){const cfg=await getJSON('acervo/archive.json');if(!cfg)return [];const nid=v=>String(v).trim().replace(/^.*\/(details|download)\//,'').replace(/[\/?#].*$/,'');const its=(cfg.itens||[]).map(x=>typeof x==='string'?{id:nid(x)}:Object.assign({},x,{id:nid(x.id)}));
  try{if(cfg.busca){const u='https://archive.org/advancedsearch.php?q='+encodeURIComponent(cfg.busca)+'&fl[]=identifier&rows=2000&output=json';const j=await getJSON(u,15000);
      for(const d of ((j&&j.response&&j.response.docs)||[]))if(!its.some(x=>x.id===d.identifier))its.push({id:d.identifier})}
    if(!its.length)return [];const out=[];for(let i=0;i<its.length;i+=8){const r=await Promise.all(its.slice(i,i+8).map(x=>iaItem(x.id,x.genero).catch(()=>[])));r.forEach(a=>out.push(...a))}
    try{localStorage.setItem('estante.ia',JSON.stringify(out))}catch(e){}return out}
  catch(e){try{return JSON.parse(localStorage.getItem('estante.ia')||'[]')}catch(_){return []}}}
async function loadAcervo(){try{const [j,dv,ia]=await Promise.all([getJSON('acervo/catalogo.json'),loadDrive(),loadArchive()]);
  const ls=((j&&j.livros)||[]).concat(dv,ia).filter(l=>l&&l.titulo&&l.arquivo&&l.genero);if(!ls.length)return null;
  const imgs={};await Promise.all(ls.filter(l=>l.capa).slice(0,120).map(l=>new Promise(res=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{imgs[l.capa]=im;res()};im.onerror=res;im.src=l.capa;setTimeout(res,5000)})));
  const row=l=>[String(l.titulo).slice(0,120),String(l.titulo).slice(0,120),String(l.autor||'').slice(0,80)||'—',+l.ano||new Date(l.data||Date.now()).getFullYear(),String(l.descricao||'').slice(0,1500)||(l.formato==='zip'?'Livro do acervo público. Toque em “Ler agora” para baixar e começar a ler.':'Sem descrição.'),{u:l.arquivo,fmt:l.formato||'pdf',cover:l.capa||null,own:1}];
  const groups=new Map();for(const l of ls){const k=nrm(l.genero);if(!groups.has(k))groups.set(k,{n:String(l.genero).slice(0,40),list:[]});groups.get(k).list.push(l)}
  return {key:JSON.stringify(ls.map(l=>[l.titulo,l.arquivo,l.capa,l.genero])),groups,row,imgs}}catch(e){return null}}
function mergeSections(base,ac){const secs=base.map(g=>Object.assign({},g,{books:g.books.slice()}));if(!ac)return secs;const PAL2=['#1d3557','#3d405b','#264653','#5b3f8c','#7a4419','#0f4c5c','#6d597a','#2a7f62'];
  for(const [k,gr] of ac.groups){const books=gr.list.map(ac.row);let ex=secs.find(g=>nrm(g.n)===k||nrm(g.n.split('·')[0])===k);
    if(ex){ex.books=books.concat(ex.books);ex.imgs=ac.imgs;continue}
    for(let i=0;i<books.length;i+=18){secs.unshift({k:'ac-'+k+i,n:books.length>18?gr.n+' · '+(i/18+1):gr.n,c:PAL2[[...k].reduce((a,c)=>a+c.charCodeAt(0),0)%PAL2.length],kind:'proprio',imgs:ac.imgs,books:books.slice(i,i+18)})}}
  return secs}
let STYLED=false;
export async function openLibrary(api){
  const ac=await loadAcervo();const ekey=ac?ac.key:'';
  if(L&&L.ekey!==ekey){L.stop();L.el.remove();L=null}
  if(L){L.api=api;L.el.classList.add('open');L.refresh();L.start();L.loadCovers&&L.loadCovers();return}
  if(!STYLED){const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);STYLED=true}
  const SECS=mergeSections(GENRES,ac);
  const fl=['400 20px "DM Serif Display"','400 20px "Bebas Neue"','600 20px Oswald','italic 700 20px "Playfair Display"','700 20px "Cormorant SC"','700 20px "Josefin Sans"','600 9px Inter','600 26px Inter'];
  await Promise.race([Promise.all(fl.map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,2500))]);
  build(api,SECS,ekey);
}

function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function rnd(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000}}
const hx=v=>'#'+v.map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
const rgb=h=>{const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]};
const mix=(a,b,t)=>hx(rgb(a).map((v,i)=>v+(rgb(b)[i]-v)*t));
const shade=(h,a)=>hx(rgb(h).map(v=>a>0?v+(255-v)*a:v*(1+a)));
const lum=h=>{const c=rgb(h);return(c[0]*.299+c[1]*.587+c[2]*.114)/255};
const SPINE_PAL=['#8c2f39','#1d4e89','#2a7f62','#c98b2b','#5b3f8c','#d1495b','#00798c','#3d405b','#e07a5f','#264653','#6d597a','#b56576','#355070','#9a031e','#0f4c5c','#bc4749','#118ab2','#7a4419','#e9c46a','#f2e8cf'];
const LEATHER=['#4a2418','#3a2a1c','#2c3a28','#4b1f26','#23304a','#5e4126','#352033','#2b2b2b'];

function build(api,GENRES,ekey){
  const el=document.createElement('div');el.id='lib';
  el.innerHTML=`<canvas></canvas>
  <div class="lbtop"><button class="lbb" id="lbBack">← Estante</button><b>Biblioteca</b><button class="lbb" id="lbMenu">Gêneros</button></div>
  <div class="lbjoy"><i></i></div>
  <div class="lbhint" id="lbHint">Arraste no lado <b>esquerdo</b> para andar e no <b>direito</b> para olhar.<br>Toque em qualquer livro para ver a sinopse. Os de fita verde dá para ler grátis.</div>
  <div class="lbmenu" id="lbMenuP"><h2>Para onde vamos?</h2><input id="lbQ" type="search" placeholder="Buscar livro ou autor…" aria-label="Buscar livro na biblioteca"><div class="gl" id="lbGl"></div></div>
  <div class="lbload" id="lbLoad"><div>Abrindo a biblioteca…<small>Preparando as prateleiras</small></div></div>`;
  document.body.appendChild(el);el.classList.add('open');
  const canvas=el.querySelector('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#140d08');scene.fog=new THREE.Fog('#1a1009',10,34);
  const cam=new THREE.PerspectiveCamera(68,1,.05,80);cam.rotation.order='YXZ';
  const maxAniso=renderer.capabilities.getMaxAnisotropy();
  const tex=(w,h,draw,rep)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,maxAniso);if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}return t};

  // --- materiais ---
  const R0=rnd(7);
  const floorTex=tex(1024,1024,(x,w,h)=>{const ph=64;for(let y=0;y<h;y+=ph){let xx=-(R0()*300|0);while(xx<w){const pw=220+R0()*260;const b=95+R0()*40;x.fillStyle=`rgb(${b+30},${b-10},${b-50})`;x.fillRect(xx,y,pw,ph);x.globalAlpha=.18;for(let k=0;k<6;k++){x.strokeStyle=R0()>.5?'#2a160a':'#c89a6a';x.beginPath();const yy=y+4+R0()*(ph-8);x.moveTo(xx,yy);x.bezierCurveTo(xx+pw*.3,yy+R0()*6-3,xx+pw*.6,yy+R0()*6-3,xx+pw,yy);x.stroke()}x.globalAlpha=1;x.fillStyle='rgba(20,10,4,.75)';x.fillRect(xx,y,2,ph);xx+=pw}x.fillStyle='rgba(20,10,4,.8)';x.fillRect(0,y,w,2)}},[2,14]);
  const woodTex=tex(256,256,(x,w,h)=>{x.fillStyle='#6b4428';x.fillRect(0,0,w,h);x.globalAlpha=.22;for(let i=0;i<60;i++){x.strokeStyle=R0()>.5?'#3d2414':'#9a6a42';x.lineWidth=1+R0()*2;x.beginPath();const y=R0()*h;x.moveTo(0,y);x.bezierCurveTo(w*.3,y+R0()*10-5,w*.7,y+R0()*10-5,w,y+R0()*6-3);x.stroke()}x.globalAlpha=1},[1,1]);
  const wallTex=tex(512,512,(x,w,h)=>{x.fillStyle='#1d3a31';x.fillRect(0,0,w,h);x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=6;for(let i=0;i<w;i+=128){x.strokeRect(i+14,20,100,h*.55)}x.fillStyle='#3a2414';x.fillRect(0,h*.66,w,h*.34);x.fillStyle='#5b3a22';x.fillRect(0,h*.64,w,14);x.strokeStyle='rgba(0,0,0,.4)';for(let i=0;i<w;i+=128)x.strokeRect(i+10,h*.7,108,h*.26)},[6,1]);
  const rugTex=tex(512,1024,(x,w,h)=>{x.fillStyle='#6e1c22';x.fillRect(0,0,w,h);x.strokeStyle='#d8b46a';x.lineWidth=10;x.strokeRect(22,22,w-44,h-44);x.lineWidth=3;x.strokeRect(46,46,w-92,h-92);x.fillStyle='rgba(216,180,106,.55)';for(let y=120;y<h-100;y+=150){x.save();x.translate(w/2,y);x.rotate(Math.PI/4);x.fillRect(-34,-34,68,68);x.restore();x.fillStyle='#6e1c22';x.save();x.translate(w/2,y);x.rotate(Math.PI/4);x.fillRect(-20,-20,40,40);x.restore();x.fillStyle='rgba(216,180,106,.55)'}},[1,3]);
  const glowTex=tex(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,230,180,1)');g.addColorStop(.25,'rgba(255,190,110,.55)');g.addColorStop(1,'rgba(255,160,80,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
  const mWood=new THREE.MeshLambertMaterial({map:woodTex,color:'#9a7050'}),mDark=new THREE.MeshLambertMaterial({color:'#2a190e'}),mBack=new THREE.MeshLambertMaterial({color:'#1e1209'});
  const box=(w,h,d,m,x,y,z,parent)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);(parent||scene).add(o);return o};

  // --- salão ---
  const N=GENRES.length,PAIRS=Math.ceil(N/2),GAP=1.55,Z0=-1.2,LEN=PAIRS*GAP+6;const zEnd=Z0-(PAIRS-1)*GAP-2.6;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(6,LEN+6),new THREE.MeshLambertMaterial({map:floorTex}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,(3+zEnd)/2);scene.add(floor);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(1.5,LEN-1),new THREE.MeshLambertMaterial({map:rugTex}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.005,(3+zEnd)/2+.5);scene.add(rug);
  const wallM=new THREE.MeshLambertMaterial({map:wallTex});
  for(const s of[-1,1]){const w=new THREE.Mesh(new THREE.PlaneGeometry(LEN+6,4.2),wallM);w.position.set(s*2.75,2.1,(3+zEnd)/2);w.rotation.y=-s*Math.PI/2;scene.add(w)}
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(6,LEN+6),new THREE.MeshLambertMaterial({color:'#24150b'}));ceil.rotation.x=Math.PI/2;ceil.position.set(0,4.2,(3+zEnd)/2);scene.add(ceil);
  for(let z=3;z>zEnd-1;z-=GAP)box(5.6,.22,.26,mWood,0,4.08,z);
  // parede do fundo com janela em arco
  const endTex=tex(1024,1024,(x,w,h)=>{x.fillStyle='#1d3a31';x.fillRect(0,0,w,h);x.save();x.beginPath();x.moveTo(300,900);x.lineTo(300,420);x.arc(512,420,212,Math.PI,0);x.lineTo(724,900);x.closePath();const g=x.createLinearGradient(0,200,0,900);g.addColorStop(0,'#0b1a3a');g.addColorStop(.7,'#24406e');g.addColorStop(1,'#d79a5a');x.fillStyle=g;x.fill();x.clip();for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.8})`;x.fillRect(300+Math.random()*424,200+Math.random()*500,2,2)}x.fillStyle='#fff6dc';x.shadowColor='#fff3c8';x.shadowBlur=40;x.beginPath();x.arc(600,360,46,0,7);x.fill();x.restore();x.strokeStyle='#5b3a22';x.lineWidth=22;x.beginPath();x.moveTo(300,900);x.lineTo(300,420);x.arc(512,420,212,Math.PI,0);x.lineTo(724,900);x.stroke();x.lineWidth=10;x.beginPath();x.moveTo(512,208);x.lineTo(512,900);x.moveTo(300,560);x.lineTo(724,560);x.stroke();x.fillStyle='#d8b46a';x.font='400 64px "DM Serif Display",serif';x.textAlign='center';x.fillText('Biblioteca',512,140);x.font='600 26px Inter,sans-serif';x.fillText('MINHA ESTANTE',512,180)});
  const endW=new THREE.Mesh(new THREE.PlaneGeometry(5.5,4.2),new THREE.MeshBasicMaterial({map:endTex,color:'#c8c0b8'}));endW.position.set(0,2.1,zEnd-1.2);scene.add(endW);
  const backW=new THREE.Mesh(new THREE.PlaneGeometry(5.5,4.2),wallM);backW.position.set(0,2.1,3.6);backW.rotation.y=Math.PI;scene.add(backW);
  // poltrona e mesinha no fundo
  const mLeather=new THREE.MeshLambertMaterial({color:'#6e1c22'});
  box(1,.45,.8,mLeather,-1.2,.32,zEnd-.6);box(1,.8,.2,mLeather,-1.2,.75,zEnd-.95);box(.18,.6,.8,mLeather,-1.62,.45,zEnd-.6);box(.18,.6,.8,mLeather,-.78,.45,zEnd-.6);
  box(.6,.05,.6,mWood,.2,.62,zEnd-.6);box(.06,.6,.06,mWood,.2,.3,zEnd-.6);
  // luzes
  scene.add(new THREE.HemisphereLight('#ffe2b8','#3a2414',1.1));scene.add(new THREE.AmbientLight('#ffdcae',.35));
  const lampMat=new THREE.MeshBasicMaterial({color:'#ffe6b0'});
  for(let i=0;i<PAIRS;i+=2){const z=Z0-(i+.5)*GAP;const pl=new THREE.PointLight('#ffc884',16,9,1.6);pl.position.set(0,3.2,z);scene.add(pl);
    box(.02,.7,.02,mDark,0,3.75,z);const b=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),lampMat);b.position.set(0,3.35,z);scene.add(b);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sp.scale.set(1.6,1.6,1);sp.position.copy(b.position);scene.add(sp);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.38,.025,8,32),new THREE.MeshLambertMaterial({color:'#b8892e'}));ring.rotation.x=Math.PI/2;ring.position.set(0,3.4,z);scene.add(ring)}

  // --- estantes (só livros reais: capas de frente + lombadas) ---
  const rows=[];const cases=[];
  const W=1.12,H=2.62,D=.42,IW=W-.12,PXM=640,TOPY=2.44;
  const fonts=['400 FS "DM Serif Display",serif','400 FS "Bebas Neue",sans-serif','600 FS Oswald,sans-serif','italic 700 FS "Playfair Display",serif','700 FS "Cormorant SC",serif','700 FS "Josefin Sans",sans-serif'];
  const DEC=['plant','globe','candle','bookend','cat','vase'];
  GENRES.forEach((g,gi)=>{
    const side=gi%2===0?-1:1,zc=Z0-Math.floor(gi/2)*GAP;const grp=new THREE.Group();
    box(.06,H,D,mWood,-W/2+.03,H/2,0,grp);box(.06,H,D,mWood,W/2-.03,H/2,0,grp);
    box(W+.12,.1,D+.08,mWood,0,H+.05,.02,grp);box(W+.04,.05,D+.05,mWood,0,H+.12,.03,grp);
    box(W-.08,H-.08,.02,mBack,0,H/2,-D/2+.01,grp);
    const n=g.books.length;const NR=n>13?4:3;const RH=(TOPY-.16)/4;
    // gaveteiro fechado embaixo quando há só 3 fileiras
    const base=.16+(4-NR)*RH;
    box(W-.06,base,D,mWood,0,base/2,0,grp);
    if(NR<4){box(W*.42,base-.12,.012,new THREE.MeshLambertMaterial({color:'#7a5032'}),-W*.22,base/2,D/2+.002,grp);box(W*.42,base-.12,.012,new THREE.MeshLambertMaterial({color:'#7a5032'}),W*.22,base/2,D/2+.002,grp)}
    for(let r=0;r<=NR;r++)box(W-.08,.03,D-.02,mWood,0,base+r*RH,0,grp);
    // placa
    const isM=g.kind==='manga',isF=g.kind==='free',isH=g.kind==='hq';
    const signT=tex(1024,200,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,isM?'#2a0a0c':isF?'#103026':'#3a2414');gr.addColorStop(1,isM?'#120406':isF?'#0a1d17':'#24150b');x.fillStyle=gr;x.fillRect(0,0,w,h);x.strokeStyle=isM?'#e04b4b':isF?'#5fd39a':'#d8b46a';x.lineWidth=7;x.strokeRect(10,10,w-20,h-20);x.fillStyle=isM?'#ffd6d0':isF?'#c8f5dc':'#e9c77e';x.textAlign='center';x.textBaseline='middle';let fs=74;x.font=`400 ${fs}px "DM Serif Display",serif`;while(x.measureText(g.n).width>w-70&&fs>34){fs-=4;x.font=`400 ${fs}px "DM Serif Display",serif`}x.fillText(g.n,w/2,h/2+3)});
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.22,.238),new THREE.MeshBasicMaterial({map:signT,color:'#ece2d4'}));sign.position.set(0,H+.36,.08);grp.add(sign);
    const R=rnd(hash(g.k));
    // distribuir livros pelas fileiras
    const books=g.books.map((b,i)=>({b,g,i,c:mix(SPINE_PAL[hash(b[0])%SPINE_PAL.length],g.c,.3),st:hash(b[1])%fonts.length}));
    const per=[];for(let r=0;r<NR;r++)per.push([]);books.forEach((it,i)=>per[i%NR].push(it));
    const items=[];
    for(let r=0;r<NR;r++){const y0=base+r*RH+.015;const row=per[NR-1-r];
      // cada fileira: até 2 capas de frente + lombadas + 1 enfeite
      let nf=Math.min(3,row.length<=2?row.length:Math.max(2,Math.round(row.length*.65)));
      const kinds=row.map((_,k)=>k<nf?'f':'s');for(let k=kinds.length-1;k>0;k--){const j=Math.floor(R()*(k+1));[kinds[k],kinds[j]]=[kinds[j],kinds[k]]}
      let wsum=0;const sized=row.map((it,k)=>{const f=kinds[k]==='f';const w=f?.2+R()*.02:.068+R()*.028;const h=f?Math.min(RH-.07,.29+R()*.04):Math.min(RH-.05,.3+R()*.12);wsum+=w;return Object.assign(it,{face:f,w,h})});
      let free=IW-.02-wsum-.006*row.length;const dec=free>.13?{dec:DEC[(R()*DEC.length)|0],w:Math.min(.2,free*.5),h:.2}:null;
      const seq=sized.slice();if(dec)seq.splice((R()*(seq.length+1))|0,0,dec);
      const used=seq.reduce((a,s)=>a+s.w,0)+.006*seq.length;let gapEach=Math.max(0,(IW-.02-used)/(seq.length+1));gapEach=Math.min(gapEach,.06);
      let x=(IW-(used+gapEach*(seq.length-1)))/2;
      for(const s of seq){s.x=x;s.y0=y0;x+=s.w+.006+gapEach;items.push(s)}
    }
    // caixas (profundidade) para as lombadas e capas
    const bks=items.filter(s=>s.b);const geo=new THREE.BoxGeometry(1,1,1);const im=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:'#ffffff'}),bks.length);
    const m=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3(),col=new THREE.Color();
    bks.forEach((s,k)=>{const dz=s.face?.03:.24;ps.set(-IW/2+s.x+s.w/2,s.y0+s.h/2,D/2-.035-dz/2);sc.set(s.w*.98,s.h,dz);m.compose(ps,q,sc);im.setMatrixAt(k,m);col.set(shade(s.c,-.3));im.setColorAt(k,col);s.k=k});
    grp.add(im);
    // painel com a arte de todas as fileiras
    const AH=TOPY-.16;const cw=Math.round(IW*PXM),ch=Math.round(AH*PXM);const c=document.createElement('canvas');c.width=cw;c.height=ch;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,maxAniso);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(IW,AH),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.5}));plane.position.set(0,.16+AH/2,D/2-.034);grp.add(plane);
    const row={g,list:items,plane,im,canvas:c,tex:t,AH,base0:.16};rows.push(row);plane.userData.row=row;
    grp.position.set(side*2.27,0,zc);grp.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(grp);
    cases.push({g,side,zc,grp});
  });
  function taken(it){return it.b&&L&&L.api.hasBook(it.b.b?it.b.b[0]:it.b[0])}
  const T=it=>it.b;
  function wrapText(x,t,maxW,maxL){const ws=t.split(' ');const ls=[];let c='';for(const w of ws){const tt=(c+' '+w).trim();if(x.measureText(tt).width>maxW&&c){ls.push(c);c=w}else c=tt}if(c)ls.push(c);if(ls.length>maxL){ls.length=maxL;ls[maxL-1]=ls[maxL-1].replace(/\s*\S*$/,'')+'…'}return ls}
  function drawCover(x,s,px,py,pw,ph){const b=s.b,kind=s.g.kind;const fg=lum(s.c)>.58?'#1d1610':'#f7efe2';
    const im=s.img||(b[5]&&typeof b[5]==='object'&&b[5].cover&&s.g.imgs&&s.g.imgs[b[5].cover]);
    if(im){const r=Math.max(pw/im.width,ph/im.height);const sw=pw/r,sh=ph/r;x.drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,px,py,pw,ph);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(px,py,3,ph);return}
    if(kind==='manga'){x.fillStyle='#f4f1ea';x.fillRect(px,py,pw,ph);x.fillStyle=s.c;x.fillRect(px,py+ph*.3,pw,ph*.7);x.fillStyle='rgba(0,0,0,.12)';for(let i=0;i<6;i++)x.fillRect(px+i*pw/6,py+ph*.3,1,ph*.7);x.fillStyle='#111';x.font=`700 ${Math.round(pw*.13)}px "Bebas Neue",sans-serif`;x.textAlign='center';wrapText(x,b[0].toUpperCase(),pw-10,2).forEach((l,i)=>x.fillText(l,px+pw/2,py+ph*.13+i*pw*.13));x.fillStyle='#fff';x.font=`600 ${Math.round(pw*.07)}px Inter,sans-serif`;x.fillText(b[2].split(' e ')[0],px+pw/2,py+ph*.93)}
    else if(kind==='hq'){x.fillStyle=s.c;x.fillRect(px,py,pw,ph);x.fillStyle='rgba(255,255,255,.12)';for(let yy=py+4;yy<py+ph;yy+=6)for(let xx=px+((yy/6)%2?3:0);xx<px+pw;xx+=6){x.beginPath();x.arc(xx,yy,1.3,0,7);x.fill()}x.fillStyle='#ffd23f';x.fillRect(px,py,pw,ph*.22);x.fillStyle='#111';x.font=`700 ${Math.round(pw*.12)}px "Bebas Neue",sans-serif`;x.textAlign='center';wrapText(x,b[0].toUpperCase(),pw-8,2).forEach((l,i)=>x.fillText(l,px+pw/2,py+ph*.11+i*pw*.12));x.fillStyle=fg;x.font=`600 ${Math.round(pw*.065)}px Inter,sans-serif`;x.fillText(b[2].split(' e ')[0],px+pw/2,py+ph*.92)}
    else{const gr=x.createLinearGradient(px,py,px,py+ph);gr.addColorStop(0,shade(s.c,.12));gr.addColorStop(1,shade(s.c,-.35));x.fillStyle=gr;x.fillRect(px,py,pw,ph);x.strokeStyle='rgba(216,180,106,.85)';x.lineWidth=2;x.strokeRect(px+5,py+5,pw-10,ph-10);
      x.fillStyle=fg;x.textAlign='center';const f=fonts[s.st];const fs=Math.round(pw*.115);x.font=f.replace('FS',fs+'px');const ls=wrapText(x,b[0],pw-18,4);ls.forEach((l,i)=>x.fillText(l,px+pw/2,py+ph*.28+i*fs*1.15));
      x.fillStyle='#d8b46a';x.fillRect(px+pw/2-14,py+ph*.28+ls.length*fs*1.15,28,2);x.fillStyle=fg;x.font=`600 ${Math.round(pw*.066)}px Inter,sans-serif`;x.fillText(b[2].length>22?b[2].split(' ').slice(-1)[0]:b[2],px+pw/2,py+ph*.86)}
    x.fillStyle='rgba(0,0,0,.25)';x.fillRect(px,py,3,ph);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(px+3,py,2,ph)}
  function drawSpine(x,s,px,py,pw,ph){const b=s.b;const gr=x.createLinearGradient(px,0,px+pw,0);gr.addColorStop(0,shade(s.c,-.45));gr.addColorStop(.2,shade(s.c,.14));gr.addColorStop(.5,s.c);gr.addColorStop(1,shade(s.c,-.5));x.fillStyle=gr;x.fillRect(px,py,pw,ph);
    const fg=lum(s.c)>.58?'#1d1610':'#f7efe2';const k=s.g.kind==='manga'?'#f4f1ea':'#d8b46a';x.fillStyle=k;x.fillRect(px+2,py+7,pw-4,2);x.fillRect(px+2,py+11,pw-4,1);x.fillRect(px+2,py+ph-13,pw-4,2);
    const au=(b[2].split(' e ')[0].split(/\s+/).pop()||'').toUpperCase();x.save();x.translate(px+pw/2,py+18);x.rotate(Math.PI/2);x.fillStyle=fg;x.globalAlpha=.85;x.font='600 10px Inter,sans-serif';x.textBaseline='middle';x.textAlign='left';x.fillText(au.slice(0,12),0,0);x.restore();
    x.save();x.translate(px+pw/2,py+ph-20);x.rotate(-Math.PI/2);x.fillStyle=fg;const fs=Math.min(pw*.5,20);x.font=fonts[s.st].replace('FS',fs+'px');x.textBaseline='middle';x.textAlign='left';let t=b[0];const maxL=ph-70;while(x.measureText(t).width>maxL&&t.length>3)t=t.slice(0,-2);if(t!==b[0])t=t.trimEnd()+'…';x.fillText(t,0,0);x.restore();
    x.fillStyle='rgba(0,0,0,.35)';x.fillRect(px+pw-1,py,1,ph)}
  function drawDecor(x,s,px,py,pw,ph){const cx=px+pw/2,by=py+ph;x.save();
    if(s.dec==='plant'){x.fillStyle='#c4683f';x.fillRect(cx-pw*.22,by-ph*.35,pw*.44,ph*.35);x.fillStyle='#3f8f4a';for(let i=0;i<5;i++){x.beginPath();x.ellipse(cx+(i-2)*pw*.1,by-ph*.55,pw*.07,ph*.28,(i-2)*.35,0,7);x.fill()}}
    else if(s.dec==='globe'){x.fillStyle='#2f6f9f';x.beginPath();x.arc(cx,by-ph*.6,pw*.28,0,7);x.fill();x.fillStyle='#7cb46b';x.beginPath();x.ellipse(cx-pw*.08,by-ph*.65,pw*.1,pw*.07,.4,0,7);x.fill();x.fillStyle='#8a6428';x.fillRect(cx-2,by-ph*.32,4,ph*.28);x.fillRect(cx-pw*.2,by-6,pw*.4,6)}
    else if(s.dec==='candle'){x.fillStyle='#f4ede1';x.fillRect(cx-pw*.1,by-ph*.55,pw*.2,ph*.5);x.fillStyle='#ffb347';x.beginPath();x.ellipse(cx,by-ph*.62,pw*.06,ph*.07,0,0,7);x.fill();x.fillStyle='#b08d57';x.fillRect(cx-pw*.2,by-8,pw*.4,8)}
    else if(s.dec==='cat'){x.fillStyle='#2a2522';x.beginPath();x.ellipse(cx,by-ph*.25,pw*.22,ph*.25,0,0,7);x.fill();x.beginPath();x.arc(cx,by-ph*.6,pw*.15,0,7);x.fill();x.beginPath();x.moveTo(cx-pw*.15,by-ph*.65);x.lineTo(cx-pw*.12,by-ph*.85);x.lineTo(cx-pw*.03,by-ph*.72);x.moveTo(cx+pw*.15,by-ph*.65);x.lineTo(cx+pw*.12,by-ph*.85);x.lineTo(cx+pw*.03,by-ph*.72);x.fill();x.fillStyle='#e9c23f';x.fillRect(cx-pw*.08,by-ph*.62,3,4);x.fillRect(cx+pw*.05,by-ph*.62,3,4)}
    else if(s.dec==='vase'){x.fillStyle='#2a6f73';x.beginPath();x.moveTo(cx-pw*.12,by-ph*.8);x.quadraticCurveTo(cx-pw*.35,by-ph*.3,cx-pw*.15,by);x.lineTo(cx+pw*.15,by);x.quadraticCurveTo(cx+pw*.35,by-ph*.3,cx+pw*.12,by-ph*.8);x.fill();x.fillStyle='#d8b46a';x.fillRect(cx-pw*.2,by-ph*.45,pw*.4,3)}
    else{x.fillStyle='#4a3a2a';x.fillRect(cx-pw*.25,by-ph*.7,pw*.12,ph*.7);x.fillRect(cx-pw*.25,by-8,pw*.5,8);x.fillStyle='#d8b46a';x.fillRect(cx-pw*.25,by-ph*.7,pw*.12,4)}
    x.restore()}
  function drawRow(row){const c=row.canvas,x=c.getContext('2d'),H2=c.height;x.clearRect(0,0,c.width,H2);
    for(const s of row.list){if(s.b&&taken(s))continue;const px=s.x*PXM,pw=s.w*PXM,ph=s.h*PXM,py=H2-(s.y0-row.base0)*PXM-ph;
      if(s.dec)drawDecor(x,s,px,py,pw,ph);else if(s.face)drawCover(x,s,px,py,pw,ph);else drawSpine(x,s,px,py,pw,ph);
      if(s.b&&typeof s.b[5]==='string'){x.save();x.fillStyle='#1fa463';if(s.face){x.translate(px+pw-2,py+2);x.rotate(Math.PI/4);x.fillRect(-30,8,60,14);x.fillStyle='#fff';x.font='700 9px Inter,sans-serif';x.textAlign='center';x.fillText('GRÁTIS',0,18)}else{x.fillRect(px+2,py+ph*.46,pw-4,12)}x.restore()}}
    row.tex.needsUpdate=true;
    const m=new THREE.Matrix4(),ps=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3();
    row.list.forEach(s=>{if(!s.b)return;row.im.getMatrixAt(s.k,m);m.decompose(ps,q,sc);const tk=taken(s);const dz=s.face?.03:.24;sc.set(tk?1e-4:s.w*.98,tk?1e-4:s.h,dz);m.compose(ps,q,sc);row.im.setMatrixAt(s.k,m)});row.im.instanceMatrix.needsUpdate=true}
  const refresh=()=>rows.forEach(drawRow);
  // capas reais (Open Library via proxy com CORS) para os livros de frente
  function loadCovers(){const q=[];for(const row of rows)for(const s of row.list)if(s.face&&s.b&&(s.b[6]||typeof s.b[5]==='string')&&!s.img&&!s.imgTry)q.push([row,s]);let i=0,act=0;const pend=new Set();let t=null;
    const flush=()=>{t=null;for(const r of pend)drawRow(r);pend.clear()};
    const next=()=>{while(act<6&&i<q.length){const [row,s]=q[i++];s.imgTry=1;act++;const im=new Image();im.crossOrigin='anonymous';im.decoding='async';
      im.onload=()=>{act--;if(im.naturalWidth>40){s.img=im;pend.add(row);if(!t)t=setTimeout(flush,250)}next()};im.onerror=()=>{act--;next()};
      im.src=typeof s.b[5]==='string'?'free/'+s.b[5]+'.jpg':'https://wsrv.nl/?url=covers.openlibrary.org/b/id/'+s.b[6]+'-M.jpg&w=260&h=390&fit=cover&output=jpg&q=82'}};next()}

  // --- controles ---
  const ctl={yaw:0,pitch:-.04,pos:new THREE.Vector3(0,1.62,2.4),joy:null,look:null,keys:{},fly:null,t:0};
  const joyEl=el.querySelector('.lbjoy'),knob=joyEl.querySelector('i');
  const ray=new THREE.Raycaster(),v2=new THREE.Vector2();
  function pick(cx,cy){const r=canvas.getBoundingClientRect();v2.set((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1);ray.setFromCamera(v2,cam);
    const hits=ray.intersectObjects(rows.map(x=>x.plane));for(const h of hits){if(h.distance>5.5){L.api.toast('Chegue mais perto para escolher um livro');return}const row=h.object.userData.row;const lx=h.uv.x*IW,ly=row.base0+h.uv.y*row.AH;
      const it=row.list.find(s=>s.b&&lx>=s.x-.004&&lx<=s.x+s.w+.004&&ly>=s.y0-.01&&ly<=s.y0+s.h+.01);if(!it)return;if(taken(it)){L.api.toast('Esse livro já está na sua estante');return}
      L.api.openCatalog(it.b,it.g,it.c,()=>{drawRow(row)});return}}
  canvas.addEventListener('pointerdown',e=>{hideHint();const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;canvas.setPointerCapture(e.pointerId);
    if(x<r.width*.5&&y>r.height*.4&&!ctl.joy){ctl.joy={id:e.pointerId,x0:e.clientX,y0:e.clientY,dx:0,dy:0,t:performance.now()};joyEl.style.display='block';joyEl.style.left=e.clientX+'px';joyEl.style.top=e.clientY+'px';knob.style.transform='none'}
    else if(!ctl.look){ctl.look={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()}}});
  canvas.addEventListener('pointermove',e=>{if(ctl.joy&&e.pointerId===ctl.joy.id){let dx=e.clientX-ctl.joy.x0,dy=e.clientY-ctl.joy.y0;const d=Math.hypot(dx,dy);if(d>55){dx*=55/d;dy*=55/d}ctl.joy.dx=dx;ctl.joy.dy=dy;knob.style.transform=`translate(${dx}px,${dy}px)`}
    else if(ctl.look&&e.pointerId===ctl.look.id){ctl.yaw-=(e.clientX-ctl.look.x)*.0045;ctl.pitch=Math.max(-1.05,Math.min(1.05,ctl.pitch-(e.clientY-ctl.look.y)*.0045));ctl.look.x=e.clientX;ctl.look.y=e.clientY;ctl.fly=null}});
  const up=e=>{if(ctl.joy&&e.pointerId===ctl.joy.id){const tap=Math.hypot(ctl.joy.dx,ctl.joy.dy)<8&&performance.now()-ctl.joy.t<350;ctl.joy=null;joyEl.style.display='none';if(tap)pick(e.clientX,e.clientY)}
    else if(ctl.look&&e.pointerId===ctl.look.id){const tap=Math.hypot(e.clientX-ctl.look.sx,e.clientY-ctl.look.sy)<9&&performance.now()-ctl.look.t<400;ctl.look=null;if(tap)pick(e.clientX,e.clientY)}};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  addEventListener('keydown',e=>{if(el.classList.contains('open'))ctl.keys[e.key.toLowerCase()]=1});addEventListener('keyup',e=>{ctl.keys[e.key.toLowerCase()]=0});
  let hintT=setTimeout(hideHint,9000);function hideHint(){clearTimeout(hintT);const h=el.querySelector('#lbHint');if(h)h.style.opacity=0}

  function flyTo(gi){const cs=cases[gi];if(!cs)return;const tx=cs.side*.35,tz=cs.zc;const tyaw=cs.side<0?Math.PI/2:-Math.PI/2;
    ctl.fly={from:ctl.pos.clone(),to:new THREE.Vector3(tx,1.62,tz),yaw0:ctl.yaw,yaw1:ctl.yaw+((((tyaw-ctl.yaw)%(2*Math.PI))+3*Math.PI)%(2*Math.PI)-Math.PI),p0:ctl.pitch,t:0}}

  // --- menu de gêneros e busca ---
  const menu=el.querySelector('#lbMenuP'),gl=el.querySelector('#lbGl'),q=el.querySelector('#lbQ');
  const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderMenu(){const s=norm(q.value.trim());
    if(!s){gl.innerHTML=GENRES.map((g,i)=>`<button data-g="${i}" style="--g:${g.c}">${esc(g.n)}<small>${g.books.filter(b=>!L.api.hasBook(b[0])).length} livros${g.kind==='free'?' · grátis':''}</small></button>`).join('')+`<button class="bk" data-close="1">Continuar andando</button>`;return}
    const hits=[];GENRES.forEach((g,gi)=>g.books.forEach(b=>{if(norm(b[0]+' '+b[1]+' '+b[2]).includes(s))hits.push({g,gi,b})}));
    gl.innerHTML=hits.length?hits.slice(0,40).map(h=>`<button data-g="${h.gi}" data-b="${esc(h.b[0])}" style="--g:${h.g.c}">${esc(h.b[0])}<small>${esc(h.b[2])} · ${esc(h.g.n)}${L.api.hasBook(h.b[0])?' · já na sua estante':''}</small></button>`).join(''):`<p style="grid-column:1/-1;color:#b8a68c">Nenhum livro com esse nome na biblioteca.</p>`}
  el.querySelector('#lbMenu').onclick=()=>{q.value='';renderMenu();menu.classList.add('open')};
  menu.addEventListener('click',e=>{const b=e.target.closest('button');if(!b){if(e.target===menu)menu.classList.remove('open');return}menu.classList.remove('open');if(b.dataset.close)return;const gi=+b.dataset.g;flyTo(gi);
    if(b.dataset.b){const g=GENRES[gi];const bk=g.books.find(x=>x[0]===b.dataset.b);if(bk&&!L.api.hasBook(bk[0])){const row=rows.find(r=>r.list.some(it=>it.b===bk));const it=row&&row.list.find(x=>x.b===bk);setTimeout(()=>L.api.openCatalog(bk,g,it?it.c:g.c,()=>row&&drawRow(row)),1300)}}});
  q.addEventListener('input',renderMenu);
  el.querySelector('#lbBack').onclick=()=>{L.stop();el.classList.remove('open');L.api.onClose&&L.api.onClose()};

  // --- laço ---
  let last=performance.now(),raf=0,running=false;
  function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.fov=w<h?72:62;cam.updateProjectionMatrix()}
  addEventListener('resize',resize);
  function frame(now){if(!running)return;const dt=Math.min(.05,(now-last)/1000);last=now;ctl.t+=dt;
    let mf=0,ms=0;if(ctl.joy){mf=-ctl.joy.dy/55;ms=ctl.joy.dx/55}if(ctl.keys.w||ctl.keys.arrowup)mf=1;if(ctl.keys.s||ctl.keys.arrowdown)mf=-1;if(ctl.keys.a)ms=-1;if(ctl.keys.d)ms=1;if(ctl.keys.arrowleft)ctl.yaw+=dt*1.6;if(ctl.keys.arrowright)ctl.yaw-=dt*1.6;
    if(mf||ms){ctl.fly=null;const sp=2.3*dt;const sy=Math.sin(ctl.yaw),cy=Math.cos(ctl.yaw);ctl.pos.x+=(-sy*mf+cy*ms)*sp;ctl.pos.z+=(-cy*mf-sy*ms)*sp}
    if(ctl.fly){const f=ctl.fly;f.t=Math.min(1,f.t+dt/1.3);const e=f.t<.5?2*f.t*f.t:1-Math.pow(-2*f.t+2,2)/2;ctl.pos.lerpVectors(f.from,f.to,e);ctl.yaw=f.yaw0+(f.yaw1-f.yaw0)*e;ctl.pitch=f.p0+(.06-f.p0)*e;if(f.t>=1)ctl.fly=null}
    ctl.pos.x=Math.max(-1.55,Math.min(1.55,ctl.pos.x));ctl.pos.z=Math.max(zEnd+.4,Math.min(3,ctl.pos.z));
    const bob=(mf||ms)?Math.sin(ctl.t*9)*.018:0;cam.position.set(ctl.pos.x,1.62+bob,ctl.pos.z);cam.rotation.set(ctl.pitch,ctl.yaw,0);
    renderer.render(scene,cam);raf=requestAnimationFrame(frame)}
  L={el,api,ekey,refresh,flyTo,loadCovers:()=>loadCovers(),start(){if(running)return;running=true;resize();last=performance.now();raf=requestAnimationFrame(frame)},stop(){running=false;cancelAnimationFrame(raf)}};window.__lib=L;
  refresh();L.start();setTimeout(loadCovers,600);setTimeout(()=>{const ld=el.querySelector('#lbLoad');if(ld){ld.style.opacity=0;setTimeout(()=>ld.remove(),700)}},300);
}
