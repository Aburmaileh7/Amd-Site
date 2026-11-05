// Mima Chic: a band of warm light, like the lamps on the logo wall, crosses the hero photo once on load and follows the scroll.
(function(){
  var host=document.querySelector('.hero__side'); if(!host) return;
  var l=document.createElement('div'); l.className='wall-light'; l.setAttribute('aria-hidden','true'); host.appendChild(l);
  if(reduce) return;
  gsap.fromTo(l,{backgroundPosition:'120% 0'},{backgroundPosition:'-20% 0',duration:2.2,delay:1,ease:'power2.inOut'});
  gsap.fromTo(l,{backgroundPosition:'-20% 0'},{backgroundPosition:'120% 0',ease:'none',immediateRender:false,scrollTrigger:{trigger:host,start:'top top',end:'bottom top',scrub:1}});
})();
