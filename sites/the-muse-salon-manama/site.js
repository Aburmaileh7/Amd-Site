// Each photo gets a gold mirror frame that draws itself from the top edge down as it scrolls in, like the frames above the styling bar.
(function(){
  // Fresha lists these three at a fixed price; every other item starts from the number shown.
  var fixed=['تلوين الجذور','خدمة منزلية','تعبئة الجل والتركيب'];
  document.querySelectorAll('.item').forEach(function(it){
    var n=it.querySelector('.item__name'),pr=it.querySelector('.item__price');
    if(!n||!pr||fixed.indexOf(n.textContent.trim())>-1)return;
    var c=document.createElement('span');c.className='cur';c.textContent='من ';pr.prepend(c);
  });
  document.querySelectorAll('.panel__media').forEach(function(m){
    var f=document.createElement('span');f.className='mu-frame';f.setAttribute('aria-hidden','true');m.appendChild(f);
    if(reduce)return;
    gsap.to(f,{clipPath:'inset(0 0 0% 0)',duration:1.2,ease:'power2.out',scrollTrigger:{trigger:m,start:'top 80%',once:true}});
  });
  if(reduce)return;
  var line=document.querySelector('.hero__title span span');
  if(line){gsap.fromTo(line,{borderBottomColor:'rgba(200,164,90,0)'},{borderBottomColor:'rgba(200,164,90,1)',duration:1,delay:1.1});}
})();
