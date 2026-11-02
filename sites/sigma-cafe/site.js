document.documentElement.classList.add('amd-ready');
(function(){if(reduce)return;var t=document.querySelector('.hero__title [data-line] > span');if(!t)return;var s=t.textContent;t.textContent='';t.setAttribute('dir','ltr');t.style.unicodeBidi='isolate';
var L=[];s.split(' ').forEach(function(w,k){if(k)t.appendChild(document.createTextNode(' '));var W=document.createElement('span');W.style.display='inline-block';W.style.whiteSpace='nowrap';
w.split('').forEach(function(ch){var i=document.createElement('span');i.textContent=ch;i.style.display='inline-block';W.appendChild(i);L.push(i);});t.appendChild(W);});
gsap.from(L,{yPercent:-120,rotate:0,opacity:0,duration:.9,ease:'back.out(1.6)',stagger:0.06,delay:.35});})();
(function(){if(reduce)return;gsap.utils.toArray('.panel__media').forEach(function(el){gsap.fromTo(el,{clipPath:'inset(18% 18% 18% 18% round 28px)'},{clipPath:'inset(0% 0% 0% 0% round 0px)',ease:'none',scrollTrigger:{trigger:el,start:'top 92%',end:'top 40%',scrub:true}});});})();
(function(){var P=[[0, "0800", "0000"], [1, "0800", "0000"], [2, "0800", "0000"], [3, "0800", "0000"], [4, "0800", "0000"], [5, "0800", "0000"], [6, "0800", "0000"]],off=240;var now=new Date(Date.now()+off*60000);var d=now.getUTCDay(),m=now.getUTCHours()*60+now.getUTCMinutes();
function mm(t){return +t.slice(0,2)*60+ +t.slice(2)}function lab(t){var h=+t.slice(0,2),x=t.slice(2);var s=h<12?'ص':'م';h=h%12||12;return h+(x!=='00'?':'+x:'')+' '+s}
var open=null,next=null;P.forEach(function(p){var o=mm(p[1]),c=mm(p[2]);if(c<=o)c+=1440;var diff=((d-p[0]+7)%7)*1440+m;[diff,diff+10080,diff-10080].forEach(function(x){if(x>=o&&x<c)open=p;});});
for(var i=0;i<8&&!next;i++){var dd=(d+i)%7;P.filter(function(p){return p[0]===dd&&(i>0||mm(p[1])>m)}).sort(function(a,b){return mm(a[1])-mm(b[1])}).slice(0,1).forEach(function(p){next=p});}
var el=document.createElement('p');el.className='amd-open'+(open?'':' is-closed');el.innerHTML='<b aria-hidden="true"></b>'+(open?'مفتوح الآن · يغلق '+lab(open[2]):'مغلق الآن'+(next?' · يفتح '+lab(next[1]):''));
var t=document.querySelector('.hero__headline');if(t)t.parentNode.insertBefore(el,t);if(!reduce&&window.gsap)gsap.from(el,{opacity:0,y:12,duration:.8,delay:1.1});})();
