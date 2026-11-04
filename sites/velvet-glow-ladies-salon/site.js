// A gold shine passes across the name like light on the mirror frames, and a thin gold vein draws across the top of each section as it arrives.
(function(){
  var t=document.querySelector('.hero__title span span');
  if(reduce){return;}
  if(t){gsap.fromTo(t,{backgroundPosition:'100% 0'},{backgroundPosition:'0% 0',duration:2.4,delay:.9,ease:'sine.inOut'});}
  document.querySelectorAll('.menu,.rev,.visit,.story').forEach(function(sec){
    var v=document.createElement('span');v.className='vg-vein';v.setAttribute('aria-hidden','true');
    if(getComputedStyle(sec).position==='static')sec.style.position='relative';
    sec.prepend(v);
    gsap.to(v,{scaleX:1,duration:1.4,ease:'power2.out',scrollTrigger:{trigger:sec,start:'top 80%',once:true}});
  });
})();
