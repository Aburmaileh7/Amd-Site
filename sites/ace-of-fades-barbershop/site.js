(function(){if(reduce)return;var t=document.querySelector('.hero__title');if(!t)return;var g='0 0 18px rgba(127,176,105,.9),0 0 42px rgba(127,176,105,.5)';
var tl=gsap.timeline({delay:1.2});[.08,.05,.12,.04,.3].forEach(function(d,i){tl.to(t,{textShadow:i%2?'0 0 0 rgba(127,176,105,0)':g,duration:d});});tl.to(t,{textShadow:'0 0 12px rgba(127,176,105,.55)',duration:.6});})();
