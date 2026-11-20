// there°: the degree ring behind the hero photo turns as you scroll, and the visit section
// counts up to the café's coordinates (26°23′N 50°57′E, from its Instagram bio).
(function(){
  var side=document.querySelector('.hero__side');
  var ring=null;
  var grid=side&&side.parentElement;
  function place(){if(!ring)return;var g=grid.getBoundingClientRect(),r=side.getBoundingClientRect(),w=Math.round(r.width*.42);
    ring.style.width=w+'px';ring.style.left=Math.round(r.right-g.left-w*.62)+'px';ring.style.top=Math.round(r.top-g.top-w*.32)+'px';}
  if(side&&grid){ring=document.createElement('span');ring.className='deg-ring';ring.setAttribute('aria-hidden','true');
    grid.style.position='relative';grid.prepend(ring);place();addEventListener('resize',place);if(ScrollTrigger)ScrollTrigger.addEventListener('refresh',place);}
  var title=document.querySelector('.visit__title');
  var box=null;
  if(title){box=document.createElement('p');box.className='coords';box.setAttribute('aria-label','الإحداثيات 26 درجة و23 دقيقة شمالًا، 50 درجة و57 دقيقة شرقًا');
    box.innerHTML='<span><b data-v="26">26</b>°<b data-v="23">23</b>′N</span><span><b data-v="50">50</b>°<b data-v="57">57</b>′E</span><small>harbour row</small>';
    title.insertAdjacentElement('afterend',box);}
  if(reduce)return;
  if(ring)gsap.to(ring,{rotation:200,ease:'none',scrollTrigger:{trigger:document.body,start:0,end:'max',scrub:.6}});
  if(box){var bs=box.querySelectorAll('b[data-v]');
    bs.forEach(function(b){b.textContent='00';});
    ScrollTrigger.create({trigger:box,start:'top 90%',once:true,onEnter:function(){
      bs.forEach(function(b){var o={v:0},to=+b.getAttribute('data-v');gsap.to(o,{v:to,duration:1.6,ease:'power2.out',onUpdate:function(){b.textContent=String(Math.round(o.v)).padStart(2,'0');}});});
    }});}
})();
