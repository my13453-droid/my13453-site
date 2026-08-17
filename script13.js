
(function(){
  function cleanServices(){
    const grid=document.querySelector('#workerServices .service-grid');
    if(!grid)return;
    const cards=[...grid.querySelectorAll('.service-card')];
    let docsSeen=false;
    cards.forEach(card=>{
      const t=(card.querySelector('h3')?.textContent||'').trim();
      if(t.includes('الرئيسية الذكية')) card.remove();
      if(t==='مستنداتي'){
        if(docsSeen){card.remove();} else {docsSeen=true; card.classList.add('v11-doc-single');}
      }
    });
  }
  function hideStandalone(){
    const el=document.getElementById('workerPersonalDocumentsCard');
    if(el)el.remove();
  }
  async function loadUploadedWorkers(){
    const box=document.getElementById('v11AdminDocWorkers');
    if(!box||!window.db||!Array.isArray(window.workers))return;
    const r=await db.from('worker_documents').select('worker_id').limit(10000);
    if(r.error){box.innerHTML='<p class="error">تعذر تحميل قائمة العاملين الذين رفعوا مستندات: '+(r.error.message||'')+'</p>';return;}
    const ids=[...new Set((r.data||[]).map(x=>String(x.worker_id)))];
    const list=window.workers.filter(w=>ids.includes(String(w.id)));
    box.innerHTML='<h3>📂 العاملون الذين رفعوا مستندات</h3>'+
      (list.length?list.map(w=>`<div class="v11-doc-worker-row"><div><b>${esc(w.full_name||'—')}</b><div class="muted">الكود: ${esc(w.worker_code||'—')}</div></div><button type="button" onclick="document.getElementById('adminDocWorker').value='${w.id}';loadAdminDocuments()">📁 عرض المستندات</button></div>`).join(''):'<p class="muted">لا يوجد عامل رفع مستندات حتى الآن.</p>');
  }
  function addAdminBox(){
    const tab=document.getElementById('documentsAdmin');
    if(!tab||document.getElementById('v11AdminDocWorkers'))return;
    const box=document.createElement('div');box.id='v11AdminDocWorkers';box.className='v11-admin-doc-workers';
    tab.querySelector('.card')?.appendChild(box);
    loadUploadedWorkers();
  }
  function boot(){
    hideStandalone();cleanServices();addAdminBox();
    setTimeout(()=>{hideStandalone();cleanServices();addAdminBox();loadUploadedWorkers()},500);
    setTimeout(()=>{hideStandalone();cleanServices();addAdminBox();loadUploadedWorkers()},1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',boot);
  const mo=new MutationObserver(()=>{cleanServices();hideStandalone()});
  mo.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>mo.disconnect(),10000);
})();
