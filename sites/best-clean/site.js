// Best Clean: the ceiling of the workshop is a grid of square yellow lamps. Over every section a
// row of them hangs dark and switches on, one after another, as the section comes into view.
(function(){
  var secs=document.querySelectorAll('main>section:not(.hero)');
  secs.forEach(function(s){
    var row=document.createElement('div');row.className='bc-lamps';row.setAttribute('aria-hidden','true');
    var n=window.innerWidth<600?7:11;for(var i=0;i<n;i++)row.appendChild(document.createElement('i'));
    var host=s.querySelector('.wrap')||s;host.insertBefore(row,host.firstChild);
    var lamps=row.querySelectorAll('i');
    if(reduce){lamps.forEach(function(l){l.classList.add('on');});return;}
    ScrollTrigger.create({trigger:s,start:'top 82%',once:true,onEnter:function(){
      lamps.forEach(function(l,k){var mid=(n-1)/2;setTimeout(function(){l.classList.add('on');},Math.abs(k-mid)*90+(k%3?0:40));});
    }});
  });
  ScrollTrigger.refresh();
})();
