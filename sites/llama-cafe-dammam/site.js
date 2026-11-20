// LLAMA, Ash Shulah: the bar opens at 6 in the morning and the hall fills with sun.
// The hero photo is cut like the arch of the hall, and an orange sun rises across it
// as the visitor scrolls the first screen away, the way light climbs the terrazzo steps.
(function(){
  var side=document.querySelector('.hero__side');
  if(!side)return;
  var sun=document.createElement('div');sun.className='ll-sun';sun.setAttribute('aria-hidden','true');
  side.appendChild(sun);
  if(reduce)return;
  gsap.from(sun,{yPercent:120,autoAlpha:0,duration:1.4,delay:.6,ease:'expo.out'});
  gsap.to(sun,{y:function(){return -side.offsetHeight*.55;},scale:1.25,ease:'none',
    scrollTrigger:{trigger:side,start:'top 15%',end:'bottom top',scrub:.8,invalidateOnRefresh:true}});
})();
