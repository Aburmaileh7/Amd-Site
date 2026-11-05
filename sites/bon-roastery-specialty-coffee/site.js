// BON: the name is long for the phone bar, so the bar shows the short name on the roastery's own sign.
// Signature: a chessboard band (the board on BON's tables) fills square by square with the scroll, and a knight jumps its L.
(function(){
  var brand=document.querySelector('.brand');
  if(brand){brand.setAttribute('aria-label',brand.textContent);brand.textContent='BON Roastery';}

  function board(before,knight){
    if(!before)return;
    var phone=matchMedia('(max-width:700px)').matches,cols=phone?8:16,rows=2,el=document.createElement('div');
    el.className='bn-board';el.setAttribute('aria-hidden','true');
    for(var i=0;i<16*rows;i++){var c=document.createElement('i');if((i%cols+Math.floor(i/cols))%2)c.className='l';el.appendChild(c);}
    before.parentNode.insertBefore(el,before);
    var k=null;
    if(knight){k=document.createElement('span');k.className='bn-knight';k.textContent='♞︎';el.appendChild(k);}
    function pos(col,row){var s=el.clientWidth/cols;return{x:el.clientWidth-s*(col+1),y:s*row};}
    if(k){var a=pos(2,1);gsap.set(k,{x:a.x,y:a.y});}
    if(reduce)return;
    var cells=[].slice.call(el.querySelectorAll('i')).slice(0,cols*rows);
    var tl=gsap.timeline({scrollTrigger:{trigger:el,start:'top 96%',end:'top 42%',scrub:.5}});
    tl.fromTo(cells,{scale:0},{scale:1,duration:.5,ease:'none',stagger:{amount:1,from:'random'}},0);
    if(k){var b=pos(4,0);tl.fromTo(k,{scale:0},{scale:1,duration:.25},.4).to(k,{x:b.x,y:b.y,duration:.5,ease:'power1.inOut'},.85);}
  }
  board(document.querySelector('.hero + *'),true);
  board(document.querySelector('.rev'),false);
  ScrollTrigger.refresh();
})();
