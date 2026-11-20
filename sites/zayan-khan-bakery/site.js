// Zayan Khan Bakery: every loaf here is pricked with a fork before it meets the tandoor wall.
// A strip of that pricked dough runs between the sections, and it bakes as the visitor scrolls:
// pale dough at the top of the page, golden brown by the time they reach the door.
(function(){
  var secs=document.querySelectorAll('main>section:not(.hero)');
  var strips=[];
  [secs[0],secs[secs.length-1]].forEach(function(s){
    if(!s)return;var d=document.createElement('div');d.className='zk-dough';d.setAttribute('aria-hidden','true');
    s.parentNode.insertBefore(d,s);strips.push(d);
  });
  var root=document.documentElement;
  if(reduce){root.style.setProperty('--dough','#E2B970');return;}
  var a=[238,217,174],b=[201,138,62];
  ScrollTrigger.create({trigger:'main',start:'top top',end:'bottom bottom',scrub:.6,onUpdate:function(t){
    var p=t.progress,c=a.map(function(v,i){return Math.round(v+(b[i]-v)*p);});
    root.style.setProperty('--dough','rgb('+c.join(',')+')');
  }});
  strips.forEach(function(d){gsap.from(d,{scaleY:.2,transformOrigin:'50% 0',duration:.9,ease:'back.out(2)',scrollTrigger:{trigger:d,start:'top 90%',once:true}});});
})();
