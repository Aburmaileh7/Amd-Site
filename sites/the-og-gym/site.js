// The OG: hero photo opens from a narrow window strip; a red "pipe" draws in above each section title.
(function(){
  var heads=document.querySelectorAll('.story__head h2, .menu__title');
  heads.forEach(function(h){var s=document.createElement('span');s.className='og-pipe';s.setAttribute('aria-hidden','true');h.parentNode.insertBefore(s,h);});
  if(reduce)return;
  var m=document.querySelector('.hero__media');
  if(m)gsap.fromTo(m,{'--win':'38%'},{'--win':'0%',duration:1.4,ease:'power3.inOut',delay:.15});
  document.querySelectorAll('.og-pipe').forEach(function(p){
    gsap.fromTo(p,{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:p,start:'top 92%',end:'top 55%',scrub:.5}});
  });
})();
