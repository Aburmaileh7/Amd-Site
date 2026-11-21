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
  if(!photos.length)return;
  photos.forEach(dim);
  var horizontal=root.querySelector('.story--h');
  function check(){
    var w=window.innerWidth;
    photos.forEach(function(p){
      if(p._lit)return;
      var r=p.getBoundingClientRect();
      if(r.width&&r.left<w*.82&&r.right>w*.1&&r.top<window.innerHeight*.85&&r.bottom>0)light(p,0);
    });
  }
  if(horizontal&&ScrollTrigger){
    ScrollTrigger.create({trigger:horizontal,start:'top bottom',end:'bottom top',onUpdate:check,onRefresh:check});
  }else if(ScrollTrigger){
    photos.forEach(function(p){
      ScrollTrigger.create({trigger:p,start:'top 85%',once:true,onEnter:function(){light(p,0);}});
    });
  }else{photos.forEach(function(p){gsap.set(p,{clearProps:'clipPath'});});}
})();
