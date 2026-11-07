// CG Barbershop: the barber pole. Signature: a tri-colour striped line draws down the
// page edge and keeps twisting with the scroll, like the pole inside the salon.
(function(){
  var main=document.querySelector('main');
  if(!main)return;
  main.insertAdjacentHTML('beforeend','<svg class="cg-pole" aria-hidden="true"><path class="cg-pole-main"/><path class="cg-pole-stripe"/></svg>');
  var svg=main.lastElementChild,core=svg.children[0],stripe=svg.children[1];
  var len=0,prog=1;
  function paint(){
    core.style.strokeDashoffset=String(len*(1-prog));
    stripe.style.strokeDashoffset=String(len*(1-prog)+len*.08);
  }
  function draw(){
    var h=main.offsetHeight,w=svg.getBoundingClientRect().width||34,a=w/2-2,m=w/2,step=150,d='M'+m+' 0',y=0,s=1;
    while(y<h-step){var e=Math.min(y+step,h);d+=' C'+(m+a*s)+' '+(y+step*.3)+' '+(m+a*s)+' '+(y+step*.7)+' '+m+' '+e;y=e;s=-s;}
    svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.style.height=h+'px';
    core.setAttribute('d',d);stripe.setAttribute('d',d);
    len=core.getTotalLength();
    [core,stripe].forEach(function(p){p.style.strokeDasharray=String(len);});
    paint();
  }
  draw();
  if(reduce){addEventListener('resize',draw);return;}
  prog=0;paint();
  ScrollTrigger.addEventListener('refresh',draw);
  ScrollTrigger.create({trigger:main,start:'top top',end:'bottom bottom',scrub:.5,onUpdate:function(t){prog=t.progress;paint();}});
  ScrollTrigger.refresh();
})();
