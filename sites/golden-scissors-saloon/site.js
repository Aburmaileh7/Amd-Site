// Golden Scissors: the price board chalks in row by row; each row's rule draws right-to-left and its price chip pops in.
(function(){
  if(reduce||!ScrollTrigger)return;
  var root=document.querySelector('[data-site="golden-scissors-saloon"]')||document;
  var menu=root.querySelector('.menu');
  if(!menu)return;
  function play(){
    var panel=menu.querySelector('.panel-m[data-active="true"]')||menu;
    var rows=panel.querySelectorAll('.item');
    if(!rows.length)return;
    var tl=gsap.timeline({defaults:{ease:'power2.out'}});
    rows.forEach(function(row,i){
      var t=i*0.09;
      var lead=row.querySelector('.item__lead'),price=row.querySelector('.item__price');
      tl.fromTo(row,{opacity:0,y:10},{opacity:1,y:0,duration:.45,clearProps:'transform,opacity'},t);
      if(lead)tl.fromTo(lead,{scaleX:0,transformOrigin:'100% 50%'},{scaleX:1,duration:.7,clearProps:'transform'},t+.05);
      if(price)tl.fromTo(price,{scale:.7,opacity:0},{scale:1,opacity:1,duration:.35,ease:'back.out(2)',clearProps:'transform,opacity'},t+.3);
    });
  }
  ScrollTrigger.create({trigger:menu.querySelector('.items')||menu,start:'top 80%',once:true,onEnter:play});
  menu.querySelectorAll('[role="tab"]').forEach(function(tab){
    tab.addEventListener('click',function(){requestAnimationFrame(play);});
  });
})();
