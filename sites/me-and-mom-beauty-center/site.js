(function(){
  if(reduce)return;
  var m=document.querySelector(".hero__media,.hero__side");if(!m)return;
  var s=document.createElement('div');s.className='mm-steam';s.setAttribute('aria-hidden','true');
  s.innerHTML='<i></i><i></i><i></i>';m.appendChild(s);
  gsap.utils.toArray('.mm-steam i').forEach(function(el,k){
    gsap.fromTo(el,{y:0,scale:.6,opacity:0},{y:-320,scale:1.5,keyframes:{opacity:[0,.9,0]},duration:6,delay:k*2,repeat:-1,ease:'sine.out'});
  });
})();
