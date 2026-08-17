
(function(){
  const bad=/^(?:n\\?|n\/|\\n|n|\\)$/i;
  function clean(root){const walker=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT);const nodes=[];let node;while(node=walker.nextNode()){const t=(node.nodeValue||'').trim();if(bad.test(t))nodes.push(node);}nodes.forEach(n=>n.remove());}
  const run=()=>{try{clean(document.body)}catch(e){}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',()=>setTimeout(run,200));
  new MutationObserver(()=>{if(window.__cleaningStrayN)return;window.__cleaningStrayN=true;requestAnimationFrame(()=>{run();window.__cleaningStrayN=false;});}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
