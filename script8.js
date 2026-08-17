
(function(){
  function q(s){return document.querySelector(s)}
  function setMode(){
    const login=q('#login'), dash=q('#dashboard'), worker=q('#workerPage');
    const authenticated =
      (dash && !dash.classList.contains('hidden')) ||
      (worker && !worker.classList.contains('hidden'));
    document.body.classList.toggle('fb-auth-mode', !!authenticated);
    document.body.classList.toggle('fb-worker-mode', !!(worker && !worker.classList.contains('hidden')));
    document.body.classList.toggle('fb-admin-mode', !!(dash && !dash.classList.contains('hidden')));
  }

  function addStatusCards(){
    const wp=q('#workerPage');
    if(wp && !q('#fbWorkerStatusCard')){
      const bar=q('#fbWorkerBar');
      const card=document.createElement('div');
      card.id='fbWorkerStatusCard';
      card.className='fb-status-card';
      card.innerHTML='<div class="fb-status-avatar">👤</div><div class="fb-status-text"><b>أهلًا بك في مركز خدمات العامل</b><span>كل خدماتك وإشعاراتك ورسائلك في مكان واحد.</span></div>';
      if(bar && bar.parentNode) bar.insertAdjacentElement('afterend',card);
    }
    const dash=q('#dashboard');
    if(dash && !q('#fbAdminStatusCard')){
      const bar=q('#fbAdminBar');
      const card=document.createElement('div');
      card.id='fbAdminStatusCard';
      card.className='fb-status-card';
      card.innerHTML='<div class="fb-status-avatar">🛡️</div><div class="fb-status-text"><b>لوحة المتابعة المركزية</b><span>إدارة العاملين والطلبات والمستندات والرسائل من مكان واحد.</span></div>';
      if(bar && bar.parentNode) bar.insertAdjacentElement('afterend',card);
    }
  }

  function polish(){
    setMode();
    addStatusCards();
    const oldText=[...document.querySelectorAll('p,.muted')];
    oldText.forEach(el=>{
      if(/الخدمات الإلكترونية متاحة من هنا|يمكنك استخدام الاختصارات من الصفحة الرئيسية/.test(el.textContent||'')){
        el.remove();
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',polish);
  else polish();

  setInterval(polish,700);
})();
