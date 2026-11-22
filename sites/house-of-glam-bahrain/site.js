// House of Glam: each arched niche "lights up" from the floor upward, the hero on load and each story panel as it enters.
(function(){
  if(reduce||!gsap)return;
  var root=document.querySelector('[data-site="house-of-glam-bahrain"]');
  if(!root)return;
  var CLOSED='inset(100% 0% 0% 0%)',OPEN='inset(0% 0% 0% 0%)';
  function light(photo,delay){
    if(!photo||photo._lit)return;
    photo._lit=1;
    var img=photo.querySelector('img');
    gsap.fromTo(photo,{clipPath:CLOSED},{clipPath:OPEN,duration:1.5,delay:delay||0,ease:'power3.inOut',clearProps:'clipPath'});
    if(img)gsap.fromTo(img,{scale:1.18,y:30},{scale:1,y:0,duration:1.9,delay:delay||0,ease:'power2.out'});
  }
  function dim(photo){gsap.set(photo,{clipPath:CLOSED});}

  var heroSide=root.querySelector('.hero__side');
  var heroPhoto=heroSide&&heroSide.querySelector('.photo');
  if(heroSide&&heroPhoto){
    gsap.fromTo(heroSide,{scale:.9,opacity:0},{scale:1,opacity:1,duration:.9,delay:.15,ease:'power2.out'});
    dim(heroPhoto);
    light(heroPhoto,.55);
  }

  var photos=Array.prototype.slice.call(root.querySelectorAll('.panel__media .photo'));
  if(!photos.length||!ScrollTrigger)return;
  photos.forEach(function(p){
    var im=p.querySelector('img');
    if(im)gsap.from(im,{scale:1.12,y:20,duration:1.2,ease:'power2.out',scrollTrigger:{trigger:p,start:'top 90%',once:true}});
  });
})();
