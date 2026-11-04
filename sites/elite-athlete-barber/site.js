// The LED arch draws itself up around the headline like the mirror switching on, then each service lights in turn as you scroll, like laps on a stopwatch.
(function(){
  var root=document.documentElement;
  if(reduce){root.style.setProperty('--arch','0%');return;}
  root.style.setProperty('--arch','100%');
  var o={v:100};
  gsap.to(o,{v:0,duration:1.6,delay:.5,ease:'power2.inOut',onUpdate:function(){root.style.setProperty('--arch',o.v+'%');}});
  var items=document.querySelectorAll('.menu .item');
  items.forEach(function(el){
    ScrollTrigger.create({trigger:el,start:'top 70%',end:'bottom 40%',toggleClass:{targets:el,className:'is-lap'}});
  });
})();
