// Ms Victoria: a striped beach awning (the salon's yellow umbrella) drops over the strip of services as it scrolls in,
// then its stripes slide a little as you scroll, like canvas in a sea breeze.
(function(){
  var hero=document.querySelector('.marquee'); if(!hero) return;
  var a=document.createElement('div'); a.className='awning'; a.setAttribute('aria-hidden','true'); hero.appendChild(a);
  if(reduce) return;
  gsap.from(a,{scaleY:0,duration:1,ease:'back.out(1.6)',scrollTrigger:{trigger:hero,start:'top 85%'}});
  gsap.to(a,{backgroundPosition:'68px 0',ease:'none',scrollTrigger:{trigger:hero,start:'top bottom',end:'bottom top',scrub:1}});
})();
