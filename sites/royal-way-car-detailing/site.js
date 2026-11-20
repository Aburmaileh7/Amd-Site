// Royal Way: open-now line (Doha, UTC+3; Sat–Thu 7:00–22:00, Friday closed) and a scroll-linked gloss sheen.
(function(){
  var c=document.querySelector('.hero__intro');if(!c)return;
  var n=new Date(Date.now()+180*6e4),d=n.getUTCDay(),m=n.getUTCHours()*60+n.getUTCMinutes();
  var open=d!==5&&m>=420&&m<1320;
  var p=document.createElement('p');p.className='amd-open'+(open?' is-open':'');
  p.innerHTML='<i aria-hidden="true"></i>'+(open?'مفتوح الآن، حتى 10 بالليل':(d===5?'الجمعة إجازة · نفتح السبت 7 الصبح':'مغلق الآن · من 7 الصبح إلى 10 بالليل'));
  c.after(p);
})();
(function(){
  if(reduce)return;
  var hero=document.querySelector('.hero__side');
  if(hero)gsap.fromTo(hero,{'--sheen':'110%'},{'--sheen':'-110%',duration:2.2,delay:.7,ease:'power2.inOut'});
  var track=document.querySelector('.story__track');
  document.querySelectorAll('.panel__media').forEach(function(el){
    var horiz=track&&track.contains(el)&&window.matchMedia('(min-width: 900px)').matches;
    gsap.fromTo(el,{'--sheen':'110%'},{'--sheen':'-110%',ease:'none',scrollTrigger:{trigger:horiz?el.closest('.story__pin')||el:el,start:'top 85%',end:horiz?'+=900':'bottom 15%',scrub:.6}});
  });
})();
