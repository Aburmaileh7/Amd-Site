// Sugar: pink petals, from the cherry-blossom prints on the salon walls, drift only inside the framed hero photo,
// and a gold line draws under the story title like the gilt on the taps.
(function(){
  if(reduce){document.documentElement.style.setProperty('--gold','180px');return;}
  var frame=document.querySelector('.hero__side');
  if(frame){
    var box=document.createElement('div'); box.className='petals'; box.setAttribute('aria-hidden','true'); frame.appendChild(box);
    for(var i=0;i<8;i++){
      var p=document.createElement('span'); p.className='petal'; box.appendChild(p);
      gsap.set(p,{left:(6+i*12)+'%',rotation:gsap.utils.random(0,180),scale:gsap.utils.random(.6,1.2)});
      gsap.to(p,{y:function(){return frame.offsetHeight+40;},x:'+='+gsap.utils.random(-40,40),rotation:'+='+gsap.utils.random(120,360),duration:gsap.utils.random(8,13),delay:i*1.1,repeat:-1,ease:'none'});
    }
  }
  var t=document.querySelector('.story__title');
  if(t){var o={w:0};gsap.to(o,{w:180,duration:1.2,ease:'power2.out',scrollTrigger:{trigger:t,start:'top 80%'},onUpdate:function(){document.documentElement.style.setProperty('--gold',o.w+'px');}});}
})();
