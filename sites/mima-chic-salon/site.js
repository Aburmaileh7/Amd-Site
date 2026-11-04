// Mima Chic: a gold palm frond, drawn after the logo on the salon wall, unfurls stroke by stroke beside the headline.
(function(){
  var host=document.querySelector('.hero__content'); if(!host) return;
  var d=['M60 112 C60 80 62 48 70 14','M62 70 C46 62 34 52 26 38','M63 58 C80 52 92 42 98 28','M64 46 C50 38 42 28 38 16','M66 36 C78 30 86 22 90 10','M61 84 C44 80 30 74 20 64','M62 82 C78 80 92 72 102 60'];
  var box=document.createElement('div');
  box.innerHTML='<svg class="frond" viewBox="0 0 120 120" aria-hidden="true">'+d.map(function(s){return '<path d="'+s+'"/>';}).join('')+'</svg>';
  var svg=box.firstChild; host.appendChild(svg);
  var paths=svg.querySelectorAll('path');
  if(reduce) return;
  paths.forEach(function(p){var L=p.getTotalLength(); p.style.strokeDasharray=L; p.style.strokeDashoffset=L;});
  gsap.to(paths,{strokeDashoffset:0,duration:1.2,delay:.6,stagger:.14,ease:'power2.out'});
  gsap.to(svg,{rotation:4,transformOrigin:'50% 100%',duration:3.5,repeat:-1,yoyo:true,ease:'sine.inOut',delay:2});
})();
