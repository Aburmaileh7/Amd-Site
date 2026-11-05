// Each photo sits inside the outline of the salon's pebble mirrors, and its warm ring drifts and brightens as it scrolls past.
(function(){
  document.querySelectorAll('.panel__media').forEach(function(m){
    var r=document.createElement('span');r.className='by-pebble';r.setAttribute('aria-hidden','true');m.appendChild(r);
    if(reduce)return;
    gsap.fromTo(r,{rotation:-3},{rotation:3,boxShadow:'0 0 46px rgba(242,196,109,.7)',ease:'none',scrollTrigger:{trigger:m,start:'top 90%',end:'bottom 10%',scrub:1}});
  });
})();
