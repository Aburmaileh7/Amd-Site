(function(){
  var root=document.querySelector('[data-site="nab-dental-clinics"]')||document.documentElement;
  var sky=document.createElement('div');sky.className='nab-sky';sky.setAttribute('aria-hidden','true');
  var moon=document.createElement('div');moon.className='nab-moon';moon.setAttribute('aria-hidden','true');
  document.body.appendChild(sky);document.body.appendChild(moon);
  if(reduce){root.style.setProperty('--nab-night','1');return;}
  gsap.to(root,{'--nab-night':1,ease:'none',scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:true}});
})();
