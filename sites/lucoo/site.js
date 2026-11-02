(function(){var h=document.querySelector('.hero');if(!h)return;var d=document.createElement('div');d.className='amd-stamp';d.setAttribute('aria-hidden','true');
d.innerHTML='<svg viewBox="0 0 120 120"><defs><path id="amdc" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs><text><textPath href="#amdc">LUCOO • بوشر • آيس كريم • LUCOO • بوشر • آيس كريم • </textPath></text></svg>';h.appendChild(d);})();
(function(){if(reduce)return;var t=document.querySelector('.hero__title [data-line] > span');if(!t)return;var s=t.textContent;t.textContent='';t.setAttribute('dir','ltr');t.style.unicodeBidi='isolate';
var L=[];s.split(' ').forEach(function(w,k){if(k)t.appendChild(document.createTextNode(' '));var W=document.createElement('span');W.style.display='inline-block';W.style.whiteSpace='nowrap';
w.split('').forEach(function(ch){var i=document.createElement('span');i.textContent=ch;i.style.display='inline-block';W.appendChild(i);L.push(i);});t.appendChild(W);});
gsap.from(L,{yPercent:-120,rotate:-12,opacity:0,duration:.9,ease:'back.out(1.6)',stagger:0.07,delay:.35});})();
