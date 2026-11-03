(function(){var H=[[540, 1200], [540, 1200], [540, 1200], [540, 1200], [540, 1200], [540, 1200], [540, 1200]],off=240;var c=document.querySelector('.hero__intro');if(!c)return;var n=new Date(Date.now()+off*6e4),d=n.getUTCDay(),m=n.getUTCHours()*60+n.getUTCMinutes();
function on(day,t){var h=H[day];if(!h)return false;return h[1]>h[0]?(t>=h[0]&&t<h[1]):(t>=h[0]||t<h[1]);}
var prev=H[(d+6)%7],o=on(d,m)||(prev&&prev[1]<prev[0]&&m<prev[1]);var p=document.createElement('p');p.className='amd-open'+(o?' is-open':'');
p.innerHTML='<i aria-hidden="true"></i>'+(o?'مفتوح الآن حسب أوقات الدوام المنشورة':'مغلق الآن، نرحّب بكم في أوقات الدوام');c.after(p);})();
(function(){if(reduce)return;var h=document.querySelector('.hero__headline');if(!h)return;gsap.fromTo(h,{'--ch':'100%'},{'--ch':'0%',duration:1.8,delay:.6,ease:'power2.inOut',repeat:-1,repeatDelay:5});})();
