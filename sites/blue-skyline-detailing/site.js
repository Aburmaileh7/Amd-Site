// Blue Skyline Detailing: the work is a clear film pulled tight over paint. Each photo below the
// hero comes in under a frosted sheet; a blue squeegee edge sweeps across and the sheet is gone.
// The hero photo gets one glossy pass of light, like fresh film catching the workshop lamps.
(function(){
  var side=document.querySelector('.hero__side');
  if(reduce)return;
  if(side)gsap.fromTo(side,{'--sheen':'140%'},{'--sheen':'-40%',duration:1.8,delay:.9,ease:'power2.inOut'});
  document.querySelectorAll('main>section:not(.hero):not(.menu) .photo').forEach(function(ph){
    if(getComputedStyle(ph).position==='static')ph.style.position='relative';ph.style.overflow='hidden';
    var f=document.createElement('div');f.className='bs-film';f.setAttribute('aria-hidden','true');ph.appendChild(f);
    
    ScrollTrigger.create({trigger:ph,start:'top 85%',once:true,onEnter:function(){
      gsap.to(f,{xPercent:-104,duration:1.1,ease:'power3.inOut',onComplete:function(){f.remove();}});
    }});
  });
  ScrollTrigger.refresh();
})();
