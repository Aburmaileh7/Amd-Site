document.documentElement.classList.add('amd-ready');
(function(){if(reduce)return;gsap.to('.hero__side .photo, .hero__media .photo',{y:-14,rotate:-1.2,duration:3.2,ease:'sine.inOut',yoyo:true,repeat:-1});})();
(function(){if(reduce)return;var li=document.querySelectorAll('.marquee__row:first-child li');if(!li.length)return;var i=0;setInterval(function(){li.forEach(function(x){x.style.color=''});li[i%li.length].style.color='var(--glow)';i++;},900);})();
(function(){var P=[[0, "0700", "2300"], [1, "0700", "2300"], [2, "0700", "2300"], [3, "0700", "2300"], [4, "0700", "2330"], [5, "0730", "2330"], [6, "0730", "2330"]],off=180;var now=new Date(Date.now()+off*60000);var d=now.getUTCDay(),m=now.getUTCHours()*60+now.getUTCMinutes();
function mm(t){return +t.slice(0,2)*60+ +t.slice(2)}function lab(t){var h=+t.slice(0,2),x=t.slice(2);var s=h<12?'ص':'م';h=h%12||12;return h+(x!=='00'?':'+x:'')+' '+s}
var open=null,next=null;P.forEach(function(p){var o=mm(p[1]),c=mm(p[2]);if(c<=o)c+=1440;var diff=((d-p[0]+7)%7)*1440+m;[diff,diff+10080,diff-10080].forEach(function(x){if(x>=o&&x<c)open=p;});});
for(var i=0;i<8&&!next;i++){var dd=(d+i)%7;P.filter(function(p){return p[0]===dd&&(i>0||mm(p[1])>m)}).sort(function(a,b){return mm(a[1])-mm(b[1])}).slice(0,1).forEach(function(p){next=p});}
var el=document.createElement('p');el.className='amd-open'+(open?'':' is-closed');el.innerHTML='<b aria-hidden="true"></b>'+(open?'مفتوح الآن · يغلق '+lab(open[2]):'مغلق الآن'+(next?' · يفتح '+lab(next[1]):''));
var t=document.querySelector('.hero__headline');if(t)t.parentNode.insertBefore(el,t);if(!reduce&&window.gsap)gsap.from(el,{opacity:0,y:12,duration:.8,delay:1.1});})();
