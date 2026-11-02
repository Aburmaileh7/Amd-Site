(function(){if(reduce)return;var b=document.body,base=getComputedStyle(b).backgroundColor;gsap.utils.toArray('.story, .menu').slice(0,1).forEach(function(sec){
ScrollTrigger.create({trigger:sec,start:'top 60%',end:'bottom 40%',onToggle:function(s){gsap.to(b,{backgroundColor:s.isActive?'#E9F1E6':base,duration:.8});}});});})();
(function(){if(reduce)return;var m=document.querySelector('.marquee__track');if(!m)return;var set=gsap.quickTo(m,'skewX',{duration:.5,ease:'power3'});
ScrollTrigger.create({onUpdate:function(self){var v=Math.max(-12,Math.min(12,self.getVelocity()/-260));set(v);}});})();
(function(){var P=[[0, "0630", "0000"], [1, "0630", "0000"], [2, "0630", "0000"], [3, "0630", "0000"], [4, "0630", "0000"], [5, "0700", "0100"], [6, "0700", "0100"]],off=240;var now=new Date(Date.now()+off*60000);var d=now.getUTCDay(),m=now.getUTCHours()*60+now.getUTCMinutes();
function mm(t){return +t.slice(0,2)*60+ +t.slice(2)}function lab(t){var h=+t.slice(0,2),x=t.slice(2);var s=h<12?'ص':'م';h=h%12||12;return h+(x!=='00'?':'+x:'')+' '+s}
var open=null,next=null;P.forEach(function(p){var o=mm(p[1]),c=mm(p[2]);if(c<=o)c+=1440;var diff=((d-p[0]+7)%7)*1440+m;[diff,diff+10080,diff-10080].forEach(function(x){if(x>=o&&x<c)open=p;});});
for(var i=0;i<8&&!next;i++){var dd=(d+i)%7;P.filter(function(p){return p[0]===dd&&(i>0||mm(p[1])>m)}).sort(function(a,b){return mm(a[1])-mm(b[1])}).slice(0,1).forEach(function(p){next=p});}
var el=document.createElement('p');el.className='amd-open'+(open?'':' is-closed');el.innerHTML='<b aria-hidden="true"></b>'+(open?'مفتوح الآن · يغلق '+lab(open[2]):'مغلق الآن'+(next?' · يفتح '+lab(next[1]):''));
var t=document.querySelector('.hero__headline');if(t)t.parentNode.insertBefore(el,t);if(!reduce&&window.gsap)gsap.from(el,{opacity:0,y:12,duration:.8,delay:1.1});})();
