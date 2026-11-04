// A warm pebble of light, the same shape as the salon's mirrors, glows behind the name and slowly changes its outline like light breathing on glass.
(function(){
  var c=document.querySelector('.hero__content');
  if(!c)return;
  var p=document.createElement('span');p.className='by-pebble';p.setAttribute('aria-hidden','true');c.prepend(p);
  if(reduce)return;
  gsap.from(p,{opacity:0,scale:.85,duration:1.4,delay:.4,ease:'power2.out'});
  gsap.to(p,{borderRadius:'45% 55% 42% 58%/58% 44% 56% 42%',duration:6,repeat:-1,yoyo:true,ease:'sine.inOut'});
  gsap.to(p,{boxShadow:'0 0 46px rgba(242,196,109,.75), inset 0 0 36px rgba(242,196,109,.4)',duration:2.4,repeat:-1,yoyo:true,ease:'sine.inOut'});
})();
