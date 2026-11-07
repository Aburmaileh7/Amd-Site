// Bruna: one pour of espresso, start to finish. Signature: a crema line draws down the
// page edge with the scroll, and its colour moves from crema gold to dark thatch brow
// as the pour deepens.
(function(){
  var main=document.querySelector('main');
  if(!main)return;
  main.insertAdjacentHTML('beforeend','<svg class="br-crema" aria-hidden="true"><path/></svg>');
  var svg=main.lastElementChild,path=svg.firstElementChild;
  var len=0,prog=1;
  var pour=['#E8C99B','#DDB887','#C89B6A','#9A6B3A','#5A3418'];
  function paint(){
    path.style.strokeDashoffset=String(len*(1-prog));
    var i=Math.min(pour.length-1,Math.floor(prog*pour.length));
    path.style.stroke=pour[i];
  }
  function draw(){
    var h=main.offsetHeight,w=svg.getBoundingClientRect().width||36,a=w/2-2,m=w/2,step=165,d='M'+m+' 0',y=0,s=1;
    while(y<h-step){var e=Math.min(y+step,h);d+=' C'+(m+a*s)+' '+(y+step*.3)+' '+(m+a*s)+' '+(y+step*.7)+' '+m+' '+e;y=e;s=-s;}
    svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.style.height=h+'px';path.setAttribute('d',d);
    len=path.getTotalLength();path.style.strokeDasharray=String(len);paint();
  }
  draw();
  if(reduce){addEventListener('resize',draw);return;}
  prog=0;paint();
  ScrollTrigger.addEventListener('refresh',draw);
  ScrollTrigger.create({trigger:main,start:'top top',end:'bottom bottom',scrub:.5,onUpdate:function(t){prog=t.progress;paint();}});
  ScrollTrigger.refresh();
})();
