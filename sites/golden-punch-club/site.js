(function(){if(reduce)return;gsap.utils.toArray('.stat__num').forEach(function(n){gsap.fromTo(n,{scale:1.35,rotate:-4},{scale:1,rotate:0,duration:.9,ease:'elastic.out(1,.35)',scrollTrigger:{trigger:n,start:'top 85%'}});});
var h=document.querySelector('.hero__media');if(h)gsap.fromTo(h,{x:-14},{x:0,duration:.5,delay:.9,ease:'back.out(4)'});})();
