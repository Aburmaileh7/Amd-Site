// Bursa: a black Istanbul skyline (bridge cables, domes, minarets) is drawn along the bottom of the hero like the mural
// inside the shop. Scrolling past it turns the glow behind it from sunset orange to night blue and lifts the crescent.
(function(){
  var hero=document.querySelector('.hero'); if(!hero) return;
  var w=document.createElement('div'); w.className='skyline'; w.setAttribute('aria-hidden','true');
  w.innerHTML='<svg viewBox="0 0 1000 90" preserveAspectRatio="none"><circle class="moon" cx="860" cy="30" r="13"/>'+
   '<path d="M0 90V70h40l10-30 4 30h30V58h18v12h20l8-50 8 50h40c10-26 50-26 60 0h16l6-40 6 40h30V62h12V50l8-6 8 6v12h12v8h40L470 20l4-6 4 6 120 50h30c14-32 70-32 84 0h12l6-44 6 44h20l6-44 6 44h40V60h16v10h40l8-34 8 34h80v20z"/>'+
   '<path d="M300 70V48M470 20 300 48M478 20 640 48M640 48V70" style="fill:none;stroke:#0f0b14;stroke-width:2"/></svg>';
  hero.appendChild(w);
  if(reduce) return;
  var moon=w.querySelector('.moon');
  var c={r:244,g:123,b:58};
  gsap.to(c,{r:59,g:63,b:180,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:1},
    onUpdate:function(){w.style.setProperty('--sky',Math.round(c.r)+','+Math.round(c.g)+','+Math.round(c.b));}});
  gsap.fromTo(moon,{attr:{cy:62}},{attr:{cy:24},ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:1}});
  gsap.from(w.querySelectorAll('path'),{yPercent:100,duration:1.2,delay:.5,ease:'power3.out'});
})();
