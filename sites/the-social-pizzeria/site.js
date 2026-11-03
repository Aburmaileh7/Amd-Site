(function(){var h=document.querySelector('.menu__head');if(!h)return;var p=document.createElement('i');p.className='amd-plate';p.setAttribute('aria-hidden','true');h.appendChild(p);if(reduce)return;
gsap.to(p,{rotate:360,ease:'none',scrollTrigger:{trigger:'.menu',start:'top bottom',end:'bottom top',scrub:true}});})();
