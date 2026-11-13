
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const B=[["Foundations of Learning","A. Reyes","Study Skills","Free","#2c4c82","#16284a"],["The Curious Mind","M. Santos","Science","Premium","#7a5a1c","#3a2a0c"],["Code & Craft","J. Cruz","Technology","Premium","#1f6a6a","#0e3438"],["Numbers at Work","L. Garcia","Mathematics","Premium Plus","#6a3a7a","#2f1a3a"],["Voices of History","R. Lim","Humanities","Premium Plus","#8a3a3a","#401a1a"],["Business Basics","K. Tan","Business","All Access","#3a6a3e","#183a1c"],["Writing Well","P. Diaz","Languages","Free","#4a5a7a","#1e2a44"],["Inside the Atom","S. Reyes","Science","All Access","#2a5a8a","#10284a"]];
const cv=(b,i)=>`<small>LUMIBOOK</small><div><b>${b[0]}</b><u></u><span>${b[1]}</span></div>`;
/* hero 3D books */
const pos=[[-150,40,-40,-18,0],[20,-60,60,-6,1.2],[170,60,-80,14,2.4]];
$('#world').innerHTML=B.slice(0,3).map((b,i)=>`<div class="bk" style="--c1:${b[4]};--c2:${b[5]};--ad:${pos[i][4]}s;margin:-120px 0 0 -85px;transform:translate3d(${pos[i][0]}px,${pos[i][1]}px,${pos[i][2]}px) rotateY(${pos[i][3]+25}deg) rotateX(-8deg)"><div class="f cv">${cv(b)}</div><div class="k"></div><div class="sp"></div><div class="pg"></div></div>`).join('');
$('#dust').innerHTML=Array.from({length:26},()=>`<i style="left:${Math.random()*100}%;bottom:-10px;animation-duration:${8+Math.random()*12}s;animation-delay:-${Math.random()*14}s"></i>`).join('');
const hero=$('.hero'),world=$('#world');let mx=0,my=0;
hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5;if(!rm)world.style.transform=`rotateY(${mx*22}deg) rotateX(${-my*16}deg)`});
/* catalogue */
let cat='All',term='';const cats=['All',...new Set(B.map(b=>b[2]))];
$('#cats').innerHTML=cats.map(c=>`<button class="chip${c==='All'?' on':''}" data-c="${c}">${c}</button>`).join('');
function render(){const l=B.filter(b=>(cat==='All'||b[2]===cat)&&(b.slice(0,3).join(' ').toLowerCase().includes(term)));
$('#grid').innerHTML=l.length?l.map((b,i)=>`<article class="card rv" style="--d:${i*.06}s"><div class="cover" style="--c1:${b[4]};--c2:${b[5]}"><span class="badge">${b[3]}</span><div class="cv" style="transform:translateZ(40px)">${cv(b)}</div></div><h3>${b[0]}</h3><p>${b[1]} · ${b[2]}</p></article>`).join(''):'<p class="empty">No titles match yet. Try another search.</p>';
obs();tilt('.card')}
$('#cats').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;cat=c.dataset.c;$$('.chip').forEach(x=>x.classList.toggle('on',x===c));render()};
$('#sf').onsubmit=e=>{e.preventDefault();term=$('#q').value.trim().toLowerCase();cat='All';$$('.chip').forEach(x=>x.classList.toggle('on',x.dataset.c==='All'));render();$('#library').scrollIntoView()};
/* plans */
const P=[["FREE","Explore knowledge.",["Free catalogue (proposed 5 titles)","3 downloads per month (proposed)","Search and browse the library"],"Start free"],["PREMIUM","Expand your library.",["Up to 20 e-books","10 lifetime downloads","One-time payment"],"Choose Premium"],["PREMIUM PLUS","Learn without limits.",["Up to 58 e-books","30 lifetime downloads","One-time payment"],"Choose Premium Plus",1],["ALL ACCESS","Unlock everything.",["All eligible titles","Unlimited downloads*","One-time payment"],"Go All Access"]];
$('#pl').innerHTML=P.map((p,i)=>`<div class="plan rv${p[4]?' ft':''}" style="--d:${i*.08}s">${p[4]?'<span class="tag">MOST POPULAR</span>':''}<h3>LUMIBOOK ${p[0]}</h3><div class="tg">${p[1]}</div><ul>${p[2].map(x=>`<li>${x}</li>`).join('')}</ul><a class="btn ${p[4]?'g':''}" href="/register">${p[3]}</a></div>`).join('');
/* reveal + tilt */
function obs(){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});$$('.rv:not(.in)').forEach(n=>io.observe(n))}
function tilt(s){if(rm)return;$$(s).forEach(c=>{if(c._t)return;c._t=1;c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`rotateY(${x*18}deg) rotateX(${-y*18}deg) translateZ(14px)`;c.style.setProperty('--mx',(x+.5)*100+'%');c.style.setProperty('--my',(y+.5)*100+'%')});c.addEventListener('pointerleave',()=>c.style.transform='')})}
render();obs();tilt('.plan');
/* scroll-driven 3D */
const lid=$('#lid'),ob=$('#ob'),pin=$('#how'),steps=$$('#steps li'),bar=$('#bar'),nav=$('#nav');let tk=0;
function frame(){tk=0;const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${h>0?y/h:0})`;nav.classList.toggle('s',y>40);
if(!rm){world.parentElement.style.transform=`translateY(${Math.min(y,800)*.12}px)`}
const r=pin.getBoundingClientRect(),p=Math.max(0,Math.min(1,-r.top/(r.height-innerHeight)));
const o=Math.min(1,p/.6);lid.style.transform=`rotateY(${-170*o}deg)`;
ob.style.transform=`rotateX(${14-8*p}deg) rotateY(${-28+36*p+ (o<1?0:0)}deg) translateZ(${40*p}px) scale(${1+.18*p})`;
ob.style.setProperty('--ray',Math.min(1,p*1.6));ob.style.setProperty('--rs',1+p*.6);ob.style.setProperty('--glow',.1+p*.5);
const i=p<.34?0:p<.67?1:2;steps.forEach((s,k)=>s.classList.toggle('on',k===i))}
addEventListener('scroll',()=>{if(!tk)tk=requestAnimationFrame(frame)},{passive:true});addEventListener('resize',frame);frame();

/* Live prices: the owner sets them in the console; if the API is unreachable the cards simply show no price. */
fetch('/api/plans',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():[]).then(list=>{
  const by={};list.forEach(p=>by[p.code]=p);
  $$('#pl .plan').forEach((card,i)=>{const p=by[['free','premium','plus','all'][i]];if(!p)return;
    const t=p.code==='free'?'Free':(p.price?'\u20B1'+Number(p.price).toLocaleString(undefined,{maximumFractionDigits:2})+' one-time':'Price coming soon');
    card.querySelector('.tg').insertAdjacentHTML('afterend','<div class="pr">'+t+'</div>');});
}).catch(()=>{});
