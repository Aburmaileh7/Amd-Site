// 212 Café: a lift floor indicator at the page edge counts from the ground floor to the
// 30th as the visitor scrolls down to the café; it lights up on arrival.
(function(){
  var el=document.createElement('div');
  el.className='lift';el.setAttribute('aria-hidden','true');
  el.innerHTML='<div class="lift__track"><span class="lift__fill"></span></div><div class="lift__box"><span class="lift__num">30</span><span class="lift__label">الطابق</span></div>';
  document.body.appendChild(el);
  var num=el.querySelector('.lift__num');
  function set(p){var f=Math.round(p*30);num.textContent=f===0?'G':String(f);el.style.setProperty('--lift',String(Math.max(.02,p)));el.classList.toggle('is-top',f>=30);}
  if(reduce||!ScrollTrigger){set(1);return;}
  set(0);
  ScrollTrigger.create({start:0,end:'max',onUpdate:function(t){set(t.progress);}});
})();
