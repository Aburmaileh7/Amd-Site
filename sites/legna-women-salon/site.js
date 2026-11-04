// The gold Greek key from the door slides under each heading, and the little almond nails beside every service fill with colour one by one as if polished.
(function(){
  document.querySelectorAll('.menu__head,.rev__head,.visit__inner').forEach(function(h){
    var k=document.createElement('span');k.className='lg-key';k.setAttribute('aria-hidden','true');h.prepend(k);
    if(reduce)return;
    k.style.setProperty('--key','100%');
    var o={v:100};
    gsap.to(o,{v:0,duration:1.2,ease:'power2.out',onUpdate:function(){k.style.setProperty('--key',o.v+'%');},scrollTrigger:{trigger:h,start:'top 85%',once:true}});
  });
  if(reduce)return;
  ScrollTrigger.batch('.menu .item',{start:'top 80%',once:true,onEnter:function(els){els.forEach(function(el,i){setTimeout(function(){el.classList.add('is-done');},i*110);});}});
})();
