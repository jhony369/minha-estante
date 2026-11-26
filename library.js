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

export async function openLibrary(api){
  if(L){L.api=api;L.el.classList.add('open');L.refresh();L.start();return}
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const fl=['400 20px "DM Serif Display"','400 20px "Bebas Neue"','600 20px Oswald','italic 700 20px "Playfair Display"','700 20px "Cormorant SC"','700 20px "Josefin Sans"','600 9px Inter','600 26px Inter'];
  await Promise.race([Promise.all(fl.map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,2500))]);
  build(api);
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

function build(api){
  const el=document.createElement('div');el.id='lib';
  el.innerHTML=`<canvas></canvas>
  <div class="lbtop"><button class="lbb" id="lbBack">← Estante</button><b>Biblioteca</b><button class="lbb" id="lbMenu">Gêneros</button></div>
  <div class="lbjoy"><i></i></div>
  <div class="lbhint" id="lbHint">Arraste no lado <b>esquerdo</b> para andar e no <b>direito</b> para olhar.<br>Toque num livro colorido para ver a sinopse.</div>
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
  const N=GENRES.length,PAIRS=Math.ceil(N/2),GAP=3.5,Z0=-1.5,LEN=PAIRS*GAP+6;const zEnd=Z0-(PAIRS-1)*GAP-3.2;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(6,LEN+6),new THREE.MeshLambertMaterial({map:floorTex}));floor.rotation.x=-Math.PI/2;floor.position.set(0,0,(3+zEnd)/2);scene.add(floor);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(1.5,LEN-1),new THREE.MeshLambertMaterial({map:rugTex}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.005,(3+zEnd)/2+.5);scene.add(rug);
  const wallM=new THREE.MeshLambertMaterial({map:wallTex});
  for(const s of[-1,1]){const w=new THREE.Mesh(new THREE.PlaneGeometry(LEN+6,4.2),wallM);w.position.set(s*2.75,2.1,(3+zEnd)/2);w.rotation.y=-s*Math.PI/2;scene.add(w)}
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(6,LEN+6),new THREE.MeshLambertMaterial({color:'#24150b'}));ceil.rotation.x=Math.PI/2;ceil.position.set(0,4.2,(3+zEnd)/2);scene.add(ceil);
  for(let z=3;z>zEnd-1;z-=GAP/2)box(5.6,.22,.26,mWood,0,4.08,z);
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
  for(let i=0;i<PAIRS;i++){const z=Z0-i*GAP;const pl=new THREE.PointLight('#ffc884',14,10,1.6);pl.position.set(0,3.2,z);scene.add(pl);
    box(.02,.7,.02,mDark,0,3.75,z);const b=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),lampMat);b.position.set(0,3.35,z);scene.add(b);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sp.scale.set(1.6,1.6,1);sp.position.copy(b.position);scene.add(sp);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.38,.025,8,32),new THREE.MeshLambertMaterial({color:'#b8892e'}));ring.rotation.x=Math.PI/2;ring.position.set(0,3.4,z);scene.add(ring)}

  // --- estantes ---
  const rows=[];const cases=[];
  const W=2.8,H=2.7,D=.42,RH=(H-.17)/5,IW=W-.16;
  const fonts=['400 FS "DM Serif Display",serif','400 FS "Bebas Neue",sans-serif','600 FS Oswald,sans-serif','italic 700 FS "Playfair Display",serif','700 FS "Cormorant SC",serif','700 FS "Josefin Sans",sans-serif'];
  GENRES.forEach((g,gi)=>{
    const side=gi%2===0?-1:1,zc=Z0-Math.floor(gi/2)*GAP;const grp=new THREE.Group();
    box(.07,H,D,mWood,-W/2+.035,H/2,0,grp);box(.07,H,D,mWood,W/2-.035,H/2,0,grp);
    box(W+.18,.12,D+.1,mWood,0,H+.06,.02,grp);box(W+.06,.06,D+.06,mWood,0,H+.15,.03,grp);box(W,.12,D,mWood,0,.06,0,grp);
    box(W-.1,H-.1,.02,mBack,0,H/2,-D/2+.01,grp);
    for(let r=1;r<5;r++)box(W-.12,.035,D-.02,mWood,0,.12+r*RH,0,grp);
    // placa
    const signT=tex(1024,180,(x,w,h)=>{const gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#3a2414');gr.addColorStop(1,'#24150b');x.fillStyle=gr;x.fillRect(0,0,w,h);x.strokeStyle='#d8b46a';x.lineWidth=6;x.strokeRect(10,10,w-20,h-20);x.fillStyle='#e9c77e';x.textAlign='center';x.textBaseline='middle';x.font='400 84px "DM Serif Display",serif';x.fillText(g.n,w/2,h/2+4)});
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.334),new THREE.MeshBasicMaterial({map:signT,color:'#e8dccb'}));sign.position.set(0,H+.42,.08);grp.add(sign);
    const R=rnd(hash(g.k));
    // livros por prateleira
    const real=g.books.map((b,i)=>({real:true,b,g,i}));const slots=[1,2,3];const perRow=Math.ceil(real.length/3);
    for(let r=0;r<5;r++){
      const y0=.12+r*RH+.0175;const list=[];let x=0;
      const reals=(r>=1&&r<=3)?real.slice((r-1)*perRow,r*perRow):[];
      const positions=new Set();if(reals.length){const nApprox=Math.floor(IW/.05);const step=nApprox/(reals.length+1);reals.forEach((_,k)=>positions.add(Math.round(step*(k+1)+(R()*4-2))))}
      let n=0,ri=0;
      while(true){const left=IW-x;const need=(reals.length-ri)*.08;let it;
        if(ri<reals.length&&(positions.has(n)||left<need+.06)){const rb=reals[ri++];const w=.055+R()*.022,h=.31+R()*.08;it=Object.assign(rb,{w,h,c:mix(SPINE_PAL[hash(rb.b[0])%SPINE_PAL.length],g.c,.25),st:hash(rb.b[1])%fonts.length})}
        else if(left<.036){break}
        else{const w=.032+R()*.028,h=.27+R()*.13;it={real:false,w,h,c:LEATHER[(R()*LEATHER.length)|0],band:R()}}
        if(x+it.w>IW-.004){if(it.real){it.w=IW-.004-x;if(it.w<.03)break}else break}
        it.x=x;x+=it.w+.002;list.push(it);n++;
        if(R()<.04&&x<IW-.15&&!reals.length){x+=.04+R()*.06}}
      // caixas instanciadas
      const geo=new THREE.BoxGeometry(1,1,1);const im=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:'#ffffff'}),list.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3(),col=new THREE.Color();
      list.forEach((it,k)=>{ps.set(-IW/2+it.x+it.w/2,y0+it.h/2,D/2-.035-.12);sc.set(it.w*.985,it.h,.24);m.compose(ps,q,sc);im.setMatrixAt(k,m);col.set(shade(it.c,-.25));im.setColorAt(k,col)});
      grp.add(im);
      let plane=null;
      if(r>=1&&r<=3){const cw=1024,ch=Math.round(1024*(.44/IW));const c=document.createElement('canvas');c.width=cw;c.height=ch;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,maxAniso);
        plane=new THREE.Mesh(new THREE.PlaneGeometry(IW,.44),new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:.5}));plane.position.set(0,y0+.22,D/2-.034);grp.add(plane)}
      const row={g,list,plane,im,y0,canvas:plane&&plane.material.map.image,tex:plane&&plane.material.map};rows.push(row);if(plane)plane.userData.row=row;
    }
    grp.position.set(side*2.27,0,zc);grp.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(grp);
    cases.push({g,side,zc,grp});
  });

  const PXM=1024/IW;
  function taken(it){return it.real&&L&&L.api.hasBook(it.b[0])}
  function drawRow(row){if(!row.canvas)return;const c=row.canvas,x=c.getContext('2d'),H2=c.height;x.clearRect(0,0,c.width,H2);
    for(const it of row.list){if(taken(it))continue;const px=it.x*PXM,pw=it.w*PXM,ph=it.h*PXM,py=H2-ph;
      const gr=x.createLinearGradient(px,0,px+pw,0);gr.addColorStop(0,shade(it.c,-.45));gr.addColorStop(.18,shade(it.c,.12));gr.addColorStop(.45,it.c);gr.addColorStop(1,shade(it.c,-.5));x.fillStyle=gr;x.fillRect(px,py,pw,ph);
      if(it.real){const k='#d8b46a';const fg=lum(it.c)>.58?'#1d1610':'#f7efe2';x.fillStyle=k;x.fillRect(px+2,py+6,pw-4,2);x.fillRect(px+2,py+10,pw-4,1);x.fillRect(px+2,H2-12,pw-4,2);
        const au=(it.b[2].split(/\s+/).pop()||'').toUpperCase();x.save();x.translate(px+pw/2,py+16);x.rotate(Math.PI/2);x.fillStyle=fg;x.globalAlpha=.85;x.font='600 9px Inter,sans-serif';x.textBaseline='middle';x.fillText(au.slice(0,12),0,0);x.restore();
        x.save();x.translate(px+pw/2,H2-18);x.rotate(-Math.PI/2);x.fillStyle=fg;let fs=Math.min(pw*.55,17);const f=fonts[it.st];x.font=f.replace('FS',fs+'px');x.textBaseline='middle';let t=it.b[0];const maxL=ph-62;while(x.measureText(t).width>maxL&&t.length>3)t=t.slice(0,-2);if(t!==it.b[0])t=t.trimEnd()+'…';x.fillText(t,0,0);x.restore();
      }else{x.fillStyle='rgba(216,180,106,.55)';const b1=py+ph*(.12+it.band*.06);x.fillRect(px+1,b1,pw-2,2);x.fillRect(px+1,b1+5,pw-2,1);x.fillRect(px+1,py+ph*.78,pw-2,2);if(it.band>.5){x.fillStyle='rgba(0,0,0,.25)';x.fillRect(px+3,py+ph*.3,pw-6,ph*.12)}}
      x.fillStyle='rgba(0,0,0,.35)';x.fillRect(px+pw-1,py,1,ph)}
    row.tex.needsUpdate=true;
    // esconder caixas dos livros que saíram
    const m=new THREE.Matrix4();row.list.forEach((it,k)=>{if(it.real){row.im.getMatrixAt(k,m);const ps=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3();m.decompose(ps,q,sc);sc.set(taken(it)?0.0001:it.w*.985,taken(it)?0.0001:it.h,.24);m.compose(ps,q,sc);row.im.setMatrixAt(k,m)}});row.im.instanceMatrix.needsUpdate=true}
  const refresh=()=>rows.forEach(drawRow);

  // --- controles ---
  const ctl={yaw:0,pitch:-.04,pos:new THREE.Vector3(0,1.62,2.4),joy:null,look:null,keys:{},fly:null,t:0};
  const joyEl=el.querySelector('.lbjoy'),knob=joyEl.querySelector('i');
  const ray=new THREE.Raycaster(),v2=new THREE.Vector2();
  function pick(cx,cy){const r=canvas.getBoundingClientRect();v2.set((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1);ray.setFromCamera(v2,cam);
    const hits=ray.intersectObjects(rows.filter(x=>x.plane).map(x=>x.plane));for(const h of hits){if(h.distance>5.5){L.api.toast('Chegue mais perto para escolher um livro');return}const row=h.object.userData.row;const lx=h.uv.x*IW,ly=h.uv.y*.44;const it=row.list.find(b=>lx>=b.x&&lx<=b.x+b.w);if(!it)return;if(!it.real){L.api.toast('Volume decorativo — procure os livros com título');return}if(taken(it)){return}if(ly>it.h+.01)return;
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

  function flyTo(gi){const cs=cases[gi];if(!cs)return;const tx=-cs.side*.15,tz=cs.zc;const tyaw=cs.side<0?Math.PI/2:-Math.PI/2;
    ctl.fly={from:ctl.pos.clone(),to:new THREE.Vector3(tx,1.62,tz),yaw0:ctl.yaw,yaw1:ctl.yaw+((((tyaw-ctl.yaw)%(2*Math.PI))+3*Math.PI)%(2*Math.PI)-Math.PI),p0:ctl.pitch,t:0}}

  // --- menu de gêneros e busca ---
  const menu=el.querySelector('#lbMenuP'),gl=el.querySelector('#lbGl'),q=el.querySelector('#lbQ');
  const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderMenu(){const s=norm(q.value.trim());
    if(!s){gl.innerHTML=GENRES.map((g,i)=>`<button data-g="${i}" style="--g:${g.c}">${esc(g.n)}<small>${g.books.filter(b=>!L.api.hasBook(b[0])).length} livros</small></button>`).join('')+`<button class="bk" data-close="1">Continuar andando</button>`;return}
    const hits=[];GENRES.forEach((g,gi)=>g.books.forEach(b=>{if(norm(b[0]+' '+b[1]+' '+b[2]).includes(s))hits.push({g,gi,b})}));
    gl.innerHTML=hits.length?hits.slice(0,40).map(h=>`<button data-g="${h.gi}" data-b="${esc(h.b[0])}" style="--g:${h.g.c}">${esc(h.b[0])}<small>${esc(h.b[2])} · ${esc(h.g.n)}${L.api.hasBook(h.b[0])?' · já na sua estante':''}</small></button>`).join(''):`<p style="grid-column:1/-1;color:#b8a68c">Nenhum livro com esse nome na biblioteca.</p>`}
  el.querySelector('#lbMenu').onclick=()=>{q.value='';renderMenu();menu.classList.add('open')};
  menu.addEventListener('click',e=>{const b=e.target.closest('button');if(!b){if(e.target===menu)menu.classList.remove('open');return}menu.classList.remove('open');if(b.dataset.close)return;const gi=+b.dataset.g;flyTo(gi);
    if(b.dataset.b){const g=GENRES[gi];const bk=g.books.find(x=>x[0]===b.dataset.b);if(bk&&!L.api.hasBook(bk[0])){const row=rows.find(r=>r.list.some(it=>it.real&&it.b===bk));const it=row&&row.list.find(x=>x.b===bk);setTimeout(()=>L.api.openCatalog(bk,g,it?it.c:g.c,()=>row&&drawRow(row)),1300)}}});
  q.addEventListener('input',renderMenu);
  el.querySelector('#lbBack').onclick=()=>{L.stop();el.classList.remove('open');L.api.onClose&&L.api.onClose()};

  // --- laço ---
  let last=performance.now(),raf=0,running=false;
  function resize(){const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.fov=w<h?72:62;cam.updateProjectionMatrix()}
  addEventListener('resize',resize);
  function frame(now){if(!running)return;const dt=Math.min(.05,(now-last)/1000);last=now;ctl.t+=dt;
    let mf=0,ms=0;if(ctl.joy){mf=-ctl.joy.dy/55;ms=ctl.joy.dx/55}if(ctl.keys.w||ctl.keys.arrowup)mf=1;if(ctl.keys.s||ctl.keys.arrowdown)mf=-1;if(ctl.keys.a)ms=-1;if(ctl.keys.d)ms=1;if(ctl.keys.arrowleft)ctl.yaw+=dt*1.6;if(ctl.keys.arrowright)ctl.yaw-=dt*1.6;
    if(mf||ms){ctl.fly=null;const sp=2.3*dt;const sy=Math.sin(ctl.yaw),cy=Math.cos(ctl.yaw);ctl.pos.x+=(-sy*mf+cy*ms)*sp;ctl.pos.z+=(-cy*mf-sy*ms)*sp}
    if(ctl.fly){const f=ctl.fly;f.t=Math.min(1,f.t+dt/1.3);const e=f.t<.5?2*f.t*f.t:1-Math.pow(-2*f.t+2,2)/2;ctl.pos.lerpVectors(f.from,f.to,e);ctl.yaw=f.yaw0+(f.yaw1-f.yaw0)*e;ctl.pitch=f.p0+(.1-f.p0)*e;if(f.t>=1)ctl.fly=null}
    ctl.pos.x=Math.max(-1.55,Math.min(1.55,ctl.pos.x));ctl.pos.z=Math.max(zEnd+.4,Math.min(3,ctl.pos.z));
    const bob=(mf||ms)?Math.sin(ctl.t*9)*.018:0;cam.position.set(ctl.pos.x,1.62+bob,ctl.pos.z);cam.rotation.set(ctl.pitch,ctl.yaw,0);
    renderer.render(scene,cam);raf=requestAnimationFrame(frame)}
  L={el,api,refresh,flyTo,start(){if(running)return;running=true;resize();last=performance.now();raf=requestAnimationFrame(frame)},stop(){running=false;cancelAnimationFrame(raf)}};
  refresh();L.start();setTimeout(()=>{const ld=el.querySelector('#lbLoad');if(ld){ld.style.opacity=0;setTimeout(()=>ld.remove(),700)}},300);
}
