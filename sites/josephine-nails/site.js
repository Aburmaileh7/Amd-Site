// JOSÉPHINE NAILS: blossoms hang on threads from the top of the hero like the salon's
// ceiling, sway softly, and drift down a little as the visitor scrolls past.
(function(){
  var hero=document.querySelector('.hero');
  if(!hero)return;
  var wrap=document.createElement('div');wrap.className='blossoms';wrap.setAttribute('aria-hidden','true');
  var spots=[6,13,21,28,36,44,52,60,67,75,83,91],lens=[38,70,52,96,44,80,58,34,88,50,66,42],h='';
  for(var i=0;i<spots.length;i++)h+='<span class="blossom" style="inset-inline-start:'+spots[i]+'%"><i style="height:'+lens[i]+'px"></i><b></b></span>';
  wrap.innerHTML=h;hero.prepend(wrap);
  if(reduce)return;
  var bs=wrap.querySelectorAll('.blossom');
  bs.forEach(function(b,i){gsap.fromTo(b,{rotation:-4},{rotation:4,duration:2.4+(i%4)*.5,ease:'sine.inOut',yoyo:true,repeat:-1,delay:i*.15});});
  gsap.from(bs,{yPercent:-100,opacity:0,duration:1.2,ease:'power3.out',stagger:.06});
  gsap.to(wrap,{y:60,opacity:.35,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:.5}});
})();
