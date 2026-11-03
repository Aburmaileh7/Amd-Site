(function(){if(reduce)return;var hero=document.querySelector('.hero');if(!hero)return;var b=document.createElement('i');b.className='amd-blade';b.setAttribute('aria-hidden','true');hero.appendChild(b);
gsap.fromTo(b,{xPercent:0,left:'0%',opacity:1},{left:'100%',duration:1.4,delay:.5,ease:'power2.inOut',onComplete:function(){b.remove();}});
var t=document.querySelector('.hero__headline');if(t)gsap.fromTo(t,{clipPath:'inset(0 0 0 100%)'},{clipPath:'inset(0 0 0 0%)',duration:1.4,delay:.5,ease:'power2.inOut'});})();
