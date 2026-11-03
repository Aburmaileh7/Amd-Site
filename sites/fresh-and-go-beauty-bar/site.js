(function(){if(reduce)return;var m=document.querySelector('.hero__media');if(!m)return;var d=document.createElement('i');d.className='amd-mist';d.setAttribute('aria-hidden','true');m.appendChild(d);
gsap.to(d,{xPercent:-240,duration:2.2,delay:.6,ease:'sine.inOut',onComplete:function(){d.remove();}});
gsap.utils.toArray('.item').forEach(function(el,i){gsap.from(el,{borderInlineStartColor:'rgba(184,148,90,0)',duration:.6,scrollTrigger:{trigger:el,start:'top 90%'}});});})();
