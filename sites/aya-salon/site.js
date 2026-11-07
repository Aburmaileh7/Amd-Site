// Aya Salon: the four stages of one polish — blush, berry, plum, deep lacquer.
// Signature: a lacquer line draws down the page edge with the scroll, and its colour
// deepens through the salon's shades as the visitor goes (site.css draws the shape).
(function(){
  var main=document.querySelector('main');
  if(!main)return;
  main.insertAdjacentHTML('beforeend','<svg class="aya-lacquer" aria-hidden="true"><path/></svg>');
  var svg=main.lastElementChild,path=svg.firstElementChild;
  var len=0,prog=1;
  var shades=['#E7A9B8','#D97E9E','#C0557A','#8E2F4E','#5C1630'];
  function paint(){
    path.style.strokeDashoffset=String(len*(1-prog));
    var i=Math.min(shades.length-1,Math.floor(prog*shades.length));
    path.style.stroke=shades[i];
  }
  function draw(){
    var h=main.offsetHeight,w=svg.getBoundingClientRect().width||38,a=w/2-2,m=w/2,step=160,d='M'+m+' 0',y=0,s=1;
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
