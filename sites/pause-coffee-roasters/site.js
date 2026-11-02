(function(){if(reduce)return;var m=document.querySelector('.hero__media,.hero__side');if(!m)return;var d=document.createElement('div');d.className='amd-steam';d.setAttribute('aria-hidden','true');d.innerHTML='<i></i><i></i><i></i>';m.appendChild(d);})();
(function(){if(reduce)return;var t=document.querySelector('.hero__title [data-line] > span');if(!t)return;var s=t.textContent;t.textContent='';t.setAttribute('dir','ltr');t.style.unicodeBidi='isolate';
var L=[];s.split(' ').forEach(function(w,k){if(k)t.appendChild(document.createTextNode(' '));var W=document.createElement('span');W.style.display='inline-block';W.style.whiteSpace='nowrap';
w.split('').forEach(function(ch){var i=document.createElement('span');i.textContent=ch;i.style.display='inline-block';W.appendChild(i);L.push(i);});t.appendChild(W);});
gsap.from(L,{yPercent:-120,rotate:0,opacity:0,duration:.9,ease:'back.out(1.6)',stagger:0.04,delay:.35});})();
(function(){if(reduce)return;var m=document.querySelector('.marquee__track');if(!m)return;var set=gsap.quickTo(m,'skewX',{duration:.5,ease:'power3'});
ScrollTrigger.create({onUpdate:function(self){var v=Math.max(-12,Math.min(12,self.getVelocity()/-260));set(v);}});})();
