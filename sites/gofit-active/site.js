// GoFit: compute the price per 30 days from the published package price and its days, then stamp it in.
(function(){
  var per=[];
  document.querySelectorAll('#panel-membership [data-item]').forEach(function(li){
    var pr=li.querySelector('.item__price .ltr'),ds=li.querySelector('.item__desc');if(!pr||!ds)return;
    var price=parseFloat(pr.textContent),days=parseInt((ds.textContent.match(/(\d+)\s*يوم/)||[])[1],10);
    if(!price||!days||days<=30)return;
    var v=(price*30/days).toFixed(3);
    var s=document.createElement('p');s.className='gf-per';
    s.innerHTML='يعادل <span class="ltr">'+v+'</span> د.ك لكل 30 يومًا';
    ds.after(s);per.push(s);
  });
  if(reduce||!per.length)return;
  gsap.from(per,{scale:1.35,rotation:-4,autoAlpha:0,duration:.45,ease:'back.out(2.2)',stagger:.12,
    scrollTrigger:{trigger:'#panel-membership',start:'top 75%',once:true}});
})();
