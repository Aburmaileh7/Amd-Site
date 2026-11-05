// A navy thread draws down the three booking steps as you scroll, from the WhatsApp message to the team at the door.
(function(){
  var eb=document.querySelector('.visit .eyebrow');if(eb)eb.textContent='المواعيد وطرق الحجز';
  var book=document.querySelector('.hero__actions .btn--glow'),cta=document.querySelector('.visit__cta');
  if(book&&cta)cta.appendChild(book.cloneNode(true));
  var track=document.querySelector('.story__track');if(!track)return;
  var t=document.createElement('span');t.className='ks-thread';t.setAttribute('aria-hidden','true');track.prepend(t);
  if(reduce)return;
  gsap.fromTo(t,{scaleY:0},{scaleY:1,ease:'none',scrollTrigger:{trigger:track,start:'top 70%',end:'bottom 70%',scrub:.6}});
})();
