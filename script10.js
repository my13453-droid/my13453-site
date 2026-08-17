
(function(){
  function stripBadText(){
    const bad=/^\s*n(?:[\\\/]|\\s*)?\s*$/i;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[]; let n;
    while(n=walker.nextNode()){
      if(n.parentElement && /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(n.parentElement.tagName)) continue;
      if(bad.test((n.nodeValue||'').trim())) nodes.push(n);
    }
    nodes.forEach(x=>x.remove());
    document.querySelectorAll('[data-raw-text="n/"],[data-raw-text="n\\"],#n,.raw-n-slash').forEach(x=>x.remove());
  }
  function run(){try{stripBadText();}catch(e){}}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  setTimeout(run,100);setTimeout(run,500);setTimeout(run,1500);
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();