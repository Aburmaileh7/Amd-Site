// Oya: WhatsApp is the main way to book, so the first hero button opens it (the number already on the page).
// Signature: one hair strand, the colour of the waves in the photos, draws down the page edge with the scroll.
(function(){
  var wa=document.querySelector('.visit .wa');
  var cta=document.querySelector('.hero__actions .btn--glow');
  if(wa&&cta){cta.href=wa.href;cta.lastChild.textContent='احجزي على واتساب';}

  var main=document.querySelector('main');
  if(!main)return;
  main.insertAdjacentHTML('beforeend','<svg class="oy-strand" aria-hidden="true"><path/></svg>');
  var svg=main.lastElementChild,path=svg.firstElementChild;
  var len=0,prog=1;
  function paint(){path.style.strokeDashoffset=String(len*(1-prog));}
  function draw(){
    var h=main.offsetHeight,w=svg.getBoundingClientRect().width||44,a=w/2-2,m=w/2,step=170,d='M'+m+' 0',y=0,s=1;
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
