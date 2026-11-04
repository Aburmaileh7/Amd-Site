// Qodwah runs two shifts a day (10–2 and 4–9, Sunday to Thursday). A timetable bar under the intro
// draws both shifts in and marks where Riyadh time is right now.
(function(){
  var intro=document.querySelector('.hero__intro');
  if(!intro) return;
  var day=[6,22]; // the bar covers 6 am to 10 pm
  var shifts=[[10,14],[16,21]];
  var pos=function(h){return ((h-day[0])/(day[1]-day[0])*100).toFixed(2)+'%';};
  var wrap=document.createElement('div'); wrap.className='shifts'; wrap.setAttribute('aria-hidden','true');
  var bar=document.createElement('div'); bar.className='shifts__bar'; wrap.appendChild(bar);
  var segs=shifts.map(function(s){var e=document.createElement('span'); e.className='shifts__seg'; e.style.right=pos(s[0]); e.style.width=((s[1]-s[0])/(day[1]-day[0])*100)+'%'; bar.appendChild(e); return e;});
  var now=new Date(Date.now()+3*3600e3); var h=now.getUTCHours()+now.getUTCMinutes()/60; var wd=now.getUTCDay();
  var open=wd<=4 && shifts.some(function(s){return h>=s[0]&&h<s[1];});
  if(h>=day[0]&&h<=day[1]){var m=document.createElement('span'); m.className='shifts__now'; m.style.right=pos(h); bar.appendChild(m);}
  var ticks=document.createElement('div'); ticks.className='shifts__ticks';
  [[10,'10 ص'],[14,'2 م'],[16,'4 م'],[21,'9 م']].forEach(function(t){var s=document.createElement('span'); s.textContent=t[1]; s.style.right=pos(t[0]); ticks.appendChild(s);});
  wrap.appendChild(ticks);
  var st=document.createElement('div'); st.className='shifts__state';
  st.textContent=open?'الفترة مفتوحة الآن':(wd<=4?'فترتان اليوم: صباحية ومسائية':'الدوام من الأحد إلى الخميس');
  wrap.appendChild(st);
  intro.insertAdjacentElement('afterend',wrap);
  if(reduce) return;
  gsap.from(segs,{scaleX:0,duration:1.1,delay:.9,stagger:.35,ease:'power3.out'});
  gsap.from(st,{autoAlpha:0,y:6,duration:.6,delay:1.8});
})();
