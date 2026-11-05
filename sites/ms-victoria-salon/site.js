// Ms Victoria: a striped awning, in the stripes of the salon's ice-cream cart and coffee cup, unrolls over the hero photo,
// then its stripes slide a little as you scroll, like canvas in a sea breeze.
(function(){
  var host=document.querySelector('.hero__side'); if(!host) return;
  var a=document.createElement('div'); a.className='awning'; a.setAttribute('aria-hidden','true'); host.appendChild(a);
  if(reduce) return;
  gsap.from(a,{scaleY:0,duration:1,delay:.7,ease:'back.out(1.6)'});
  gsap.to(a,{backgroundPosition:'68px 0',ease:'none',scrollTrigger:{trigger:host,start:'top top',end:'bottom top',scrub:1}});
})();
