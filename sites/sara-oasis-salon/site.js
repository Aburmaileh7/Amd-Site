// Sara Oasis: a glint of chandelier light sweeps across the headline, a few crystal prisms sparkle over the hero.
(function(){
  var hero=document.querySelector('.hero'), h=document.querySelector('.hero__headline');
  if(reduce||!hero) return;
  if(h) gsap.to(h,{backgroundPosition:'0% 0',duration:2.2,delay:.8,ease:'power2.inOut',repeat:-1,repeatDelay:4});
  for(var i=0;i<7;i++){
    var p=document.createElement('span'); p.className='prism'; p.setAttribute('aria-hidden','true'); hero.appendChild(p);
    gsap.set(p,{left:gsap.utils.random(8,92)+'%',top:gsap.utils.random(8,60)+'%'});
    gsap.to(p,{opacity:1,scale:1.6,duration:.6,yoyo:true,repeat:-1,repeatDelay:gsap.utils.random(1.5,4),delay:gsap.utils.random(0,3),ease:'sine.inOut'});
  }
})();
