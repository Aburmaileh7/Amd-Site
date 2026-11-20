// Car Lab: open-now line from the published shifts (Muscat, UTC+4), and a light glint across the hero photo.
(function(){
  var c=document.querySelector('.hero__intro');if(!c)return;
  var n=new Date(Date.now()+240*6e4),d=n.getUTCDay(),m=n.getUTCHours()*60+n.getUTCMinutes();
  if(d===5)return; // Friday hours are not published
  var open=(m>=540&&m<780)||(m>=960&&m<1260);
  var p=document.createElement('p');p.className='amd-open'+(open?' is-open':'');
  p.innerHTML='<i aria-hidden="true"></i>'+(open?'مفتوح الآن حسب الدوام المنشور':'مغلق الآن · الدوام 9–1 و4–9 من السبت للخميس');
  c.after(p);
})();
(function(){
  if(reduce)return;var h=document.querySelector('.hero__media');if(!h)return;
  gsap.fromTo(h,{'--glint':'120%'},{'--glint':'-120%',duration:2.4,delay:.8,ease:'power2.inOut',repeat:-1,repeatDelay:4.5});
})();
