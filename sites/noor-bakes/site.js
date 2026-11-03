(function(){var H=[[480, 60], [480, 60], [480, 60], [480, 60], [480, 60], [480, 60], [480, 60]],off=180;var c=document.querySelector('.hero__intro');if(!c)return;var n=new Date(Date.now()+off*6e4),d=n.getUTCDay(),m=n.getUTCHours()*60+n.getUTCMinutes();
function on(day,t){var h=H[day];if(!h)return false;return h[1]>h[0]?(t>=h[0]&&t<h[1]):(t>=h[0]||t<h[1]);}
var prev=H[(d+6)%7],o=on(d,m)||(prev&&prev[1]<prev[0]&&m<prev[1]);var p=document.createElement('p');p.className='amd-open'+(o?' is-open':'');
p.innerHTML='<i aria-hidden="true"></i>'+(o?'مفتوح الآن حسب أوقات الدوام المنشورة':'مغلق الآن، نرحّب بكم في أوقات الدوام');c.after(p);})();
(function(){var m=document.querySelector('.hero__media,.hero__side');if(!m)return;for(var i=0;i<6;i++){var p=document.createElement('i');p.className='amd-petal';p.setAttribute('aria-hidden','true');p.style.left=(8+i*15)+'%';p.style.top=(6+(i%3)*9)+'%';m.appendChild(p);}
if(reduce)return;gsap.utils.toArray('.amd-petal').forEach(function(p,i){gsap.to(p,{y:60+i*14,x:(i%2?18:-18),rotate:i%2?160:-160,duration:5+i,ease:'sine.inOut',repeat:-1,yoyo:true,delay:i*.4});});})();
