// Old Time Barber: the salon's logo is a clock with a pair of scissors for hands. That clock is
// drawn beside the reviews; its scissor hands turn with the scroll (hour hand slow, minute hand
// a full sweep), and the scissors open and close as the minute hand passes each quarter.
(function(){
  var sec=document.querySelector('main>section.rev');
  if(!sec)return;
  var ticks='';for(var i=0;i<12;i++){var a=i*30*Math.PI/180,r1=i%3?86:80,r2=92;
    ticks+='<line x1="'+(100+r1*Math.sin(a)).toFixed(1)+'" y1="'+(100-r1*Math.cos(a)).toFixed(1)+'" x2="'+(100+r2*Math.sin(a)).toFixed(1)+'" y2="'+(100-r2*Math.cos(a)).toFixed(1)+'" stroke="currentColor" stroke-width="'+(i%3?2:4)+'"/>';}
  var blade=function(len,w){return '<path d="M100 100 L'+(100-w)+' '+(100-len*.35)+' L100 '+(100-len)+' L'+(100+w*.4)+' '+(100-len*.4)+' Z" fill="currentColor"/>';};
  var ring=function(cy){return '<circle cx="100" cy="'+cy+'" r="9" fill="none" stroke="currentColor" stroke-width="3.5"/>';};
  sec.insertAdjacentHTML('afterbegin','<svg class="ot-clock" viewBox="0 0 200 200" aria-hidden="true">'+
    '<circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" stroke-width="3"/>'+ticks+
    '<g class="hand h-hour gold">'+blade(52,7)+ring(116)+'</g>'+
    '<g class="hand h-min gold"><g class="b1">'+blade(78,6)+'</g><g class="b2">'+blade(78,6)+'</g>'+ring(118)+'</g>'+
    '<circle cx="100" cy="100" r="4" fill="currentColor"/></svg>');
  var svg=sec.querySelector('.ot-clock'),hr=svg.querySelector('.h-hour'),mn=svg.querySelector('.h-min'),b1=svg.querySelector('.b1'),b2=svg.querySelector('.b2');
  [b1,b2].forEach(function(b){b.style.transformBox='view-box';b.style.transformOrigin='100px 100px';});
  function set(p){var m=300+p*360,h=300/12+p*30;
    hr.style.transform='rotate('+h+'deg)';mn.style.transform='rotate('+m+'deg)';
    var open=Math.abs(Math.sin(p*Math.PI*4))*9;b1.style.transform='rotate('+(-open)+'deg)';b2.style.transform='rotate('+open+'deg)';}
  set(.2);
  if(reduce)return;
  ScrollTrigger.create({trigger:'main',start:'top top',end:'bottom bottom',scrub:.8,onUpdate:function(t){set(t.progress);}});
})();
