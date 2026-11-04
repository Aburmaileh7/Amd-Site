// Three arches, one per brother, rise from the floor line above the services and the reviews, echoing the mirrors on the salon wall.
(function(){
  document.querySelectorAll('.menu__head,.rev__head').forEach(function(h){
    var a=document.createElement('div');a.className='tb-arches';a.setAttribute('aria-hidden','true');
    a.innerHTML='<i></i><i></i><i></i>';h.parentNode.insertBefore(a,h);
    if(reduce)return;
    gsap.from(a.children,{scaleY:0,duration:.9,stagger:.15,ease:'back.out(1.6)',scrollTrigger:{trigger:h,start:'top 85%',once:true}});
  });
  if(reduce)return;
  gsap.utils.toArray('.panel__media img').forEach(function(im){
    gsap.fromTo(im,{scale:1.15},{scale:1,ease:'none',scrollTrigger:{trigger:im,start:'top bottom',end:'bottom top',scrub:true}});
  });
})();
