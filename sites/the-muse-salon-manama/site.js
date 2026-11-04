// Each photo gets a gold mirror frame that draws itself from the top edge down as it scrolls in, like the frames above the styling bar.
(function(){
  document.querySelectorAll('.panel__media,.panel-m__visual').forEach(function(m){
    var f=document.createElement('span');f.className='mu-frame';f.setAttribute('aria-hidden','true');m.appendChild(f);
    if(reduce)return;
    gsap.to(f,{clipPath:'inset(0 0 0% 0)',duration:1.2,ease:'power2.out',scrollTrigger:{trigger:m,start:'top 80%',once:true}});
  });
  if(reduce)return;
  var line=document.querySelector('.hero__title span span');
  if(line){gsap.fromTo(line,{borderBottomColor:'rgba(200,164,90,0)'},{borderBottomColor:'rgba(200,164,90,1)',duration:1,delay:1.1});}
})();
