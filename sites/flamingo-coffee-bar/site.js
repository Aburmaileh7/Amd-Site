(function(){var h=document.querySelector('.hero');if(!h)return;var d=document.createElement('div');d.className='amd-stamp';d.setAttribute('aria-hidden','true');
d.innerHTML='<svg viewBox="0 0 120 120"><defs><path id="amdc" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs><text><textPath href="#amdc">FLAMINGO • كيك وقهوة • FLAMINGO • كيك وقهوة • </textPath></text></svg>';h.appendChild(d);})();
(function(){if(reduce)return;gsap.to('.hero__side .photo, .hero__media .photo',{y:-14,rotate:-1.2,duration:3.2,ease:'sine.inOut',yoyo:true,repeat:-1});})();
(function(){if(reduce)return;var b=document.body,base=getComputedStyle(b).backgroundColor;gsap.utils.toArray('.story, .menu').slice(0,1).forEach(function(sec){
ScrollTrigger.create({trigger:sec,start:'top 60%',end:'bottom 40%',onToggle:function(s){gsap.to(b,{backgroundColor:s.isActive?'#FBE9EC':base,duration:.8});}});});})();
