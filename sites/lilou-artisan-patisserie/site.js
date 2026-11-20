// Lilou Artisan Patisserie: every order leaves in a crimson box with a striped cream lining.
// A strip of that lid sits before the menu and before the visit section; as the visitor
// reaches it, the lid swings open on its hinge and the wax seal settles on it.
(function(){
  var targets=[document.getElementById('menu'),document.getElementById('visit')];
  var lids=[];
  targets.forEach(function(s){
    if(!s||!s.parentNode)return;
    var d=document.createElement('div');d.className='ll-lid';d.setAttribute('aria-hidden','true');
    d.innerHTML='<div class="ll-lid__top"></div><div class="ll-lid__seal">L</div>';
    s.parentNode.insertBefore(d,s);lids.push(d);
  });
  if(reduce)return;
  lids.forEach(function(d){
    var top=d.querySelector('.ll-lid__top'),seal=d.querySelector('.ll-lid__seal');
    var tl=gsap.timeline({scrollTrigger:{trigger:d,start:'top 88%',once:true}});
    tl.from(top,{rotationX:-95,duration:1.1,ease:'back.out(1.6)'})
      .from(seal,{scale:0,rotation:-40,duration:.6,ease:'back.out(2.4)'},'-=.45');
  });
})();
