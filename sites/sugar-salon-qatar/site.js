// Sugar: a few blossom petals (from the pink prints on the salon walls) fall slowly across the hero,
// and a gold line draws under the story title like the gilt on the taps.
(function(){
  if(reduce){document.documentElement.style.setProperty('--gold','180px');return;}
  var hero=document.querySelector('.hero');
  if(hero){
    var box=document.createElement('div'); box.className='petals'; box.setAttribute('aria-hidden','true'); hero.appendChild(box);
    for(var i=0;i<9;i++){
      var p=document.createElement('span'); p.className='petal'; box.appendChild(p);
      gsap.set(p,{left:(8+i*10.5)+'%',rotation:gsap.utils.random(0,180),scale:gsap.utils.random(.6,1.2)});
      gsap.to(p,{y:function(){return hero.offsetHeight+40;},x:'+='+gsap.utils.random(-60,60),rotation:'+='+gsap.utils.random(120,360),duration:gsap.utils.random(9,15),delay:i*1.3,repeat:-1,ease:'none'});
    }
  }
  var t=document.querySelector('.story__title');
  if(t){var o={w:0};gsap.to(o,{w:180,duration:1.2,ease:'power2.out',scrollTrigger:{trigger:t,start:'top 80%'},onUpdate:function(){document.documentElement.style.setProperty('--gold',o.w+'px');}});}
})();
