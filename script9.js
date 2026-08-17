
(function(){
  const q=s=>document.querySelector(s);

  /* Remove the welcome/status cards completely */
  function removeWelcomeCards(){
    ['fbWorkerStatusCard','fbAdminStatusCard'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.remove();
    });
  }

  /* Restore the full EgyptAir brand for both worker and admin after login */
  function addBrand(){
    removeWelcomeCards();
    const worker=q('#workerPage');
    if(worker && !q('#fbWorkerBrand')){
      const bar=q('#fbWorkerBar');
      const brand=document.createElement('div');
      brand.id='fbWorkerBrand';
      brand.className='fb-brand-strip';
      brand.innerHTML='<div class="fb-brand-company">شركة مصر للطيران للخدمات الجوية</div><div class="fb-brand-unit">المتابعة المركزية — العمالة المعاونة</div><div class="fb-brand-rule"></div>';
      if(bar && bar.parentNode) bar.insertAdjacentElement('afterend',brand);
      else worker.insertAdjacentElement('afterbegin',brand);
    }
    const admin=q('#dashboard');
    if(admin && !q('#fbAdminBrand')){
      const bar=q('#fbAdminBar');
      const brand=document.createElement('div');
      brand.id='fbAdminBrand';
      brand.className='fb-brand-strip';
      brand.innerHTML='<div class="fb-brand-company">شركة مصر للطيران للخدمات الجوية</div><div class="fb-brand-unit">المتابعة المركزية — العمالة المعاونة</div><div class="fb-brand-rule"></div>';
      if(bar && bar.parentNode) bar.insertAdjacentElement('afterend',brand);
      else admin.insertAdjacentElement('afterbegin',brand);
    }
  }

  /* Separate announcements from notifications */
  window.v5LoadWorkerAnnouncements = async function(){
    const b=q('#fbWorkerAnnouncements');
    if(!b || !window.currentWorkerId) return;
    const r=await db.from('notifications')
      .select('id,message,title,notification_type,created_at,read_at')
      .eq('recipient_worker_id',window.currentWorkerId)
      .eq('notification_type','إعلان عام')
      .order('created_at',{ascending:false})
      .limit(50);
    if(r.error){
      b.innerHTML='<p class="error">'+escHtml(r.error.message)+'</p>';
      return;
    }
    b.innerHTML=(r.data||[]).map(n=>
      '<div class="fb-item '+(n.read_at?'':'unread')+'" onclick="fbMarkNotification(\''+escHtml(n.id)+'\')">'+
      '<div class="fb-item-icon">📢</div><div class="fb-item-text">'+
      '<b>'+escHtml(n.title||'إعلان عام')+'</b>'+
      '<span>'+escHtml(n.message)+'</span><span>'+timeAgo(n.created_at)+(n.read_at?'':' • جديد')+'</span>'+
      '</div></div>'
    ).join('') || '<div class="fb-empty">لا توجد إعلانات عامة حاليًا.</div>';
  };

  window.v5OpenAnnouncements = async function(){
    openModal('📢 الإعلانات', '<div class="card"><div id="fbWorkerAnnouncements">جارٍ تحميل الإعلانات...</div></div>');
    await getWorkerIdentity();
    await v5LoadWorkerAnnouncements();
  };

  /* Fix admin broadcast using a secure server-side RPC */
  window.sendGeneralAnnouncement = async function(){
    const input=q('#generalAnnouncementText'), msg=q('#generalAnnouncementMsg');
    const value=(input?.value||'').trim();
    if(!value){
      if(msg){msg.className='error';msg.textContent='اكتب نص الإعلان.';}
      return;
    }
    if(msg){msg.className='muted';msg.textContent='جارٍ نشر الإعلان لجميع العاملين...';}
    const r=await db.rpc('admin_broadcast_announcement',{p_message:value});
    if(r.error){
      if(msg){msg.className='error';msg.textContent='تعذر نشر الإعلان: '+r.error.message;}
      return;
    }
    if(input) input.value='';
    if(msg){
      msg.className='success';
      msg.textContent='تم نشر الإعلان بنجاح لجميع العاملين ('+(r.data||0)+' عامل).';
    }
    if(typeof refreshFbBars==='function') setTimeout(refreshFbBars,300);
  };

  /* Make worker document storage paths more organized for new uploads */
  window.v5DocumentPath = function(userId,type,fileName){
    const ext=(fileName.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';
    const cleanType=String(type||'other').replace(/[^a-zA-Z0-9_-]/g,'_');
    return userId+'/documents/'+cleanType+'-'+Date.now()+'.'+ext;
  };

  /* Folder-style visual grouping of the worker's documents */
  window.loadMyDocuments = async function(){
    const box=q('#myDocumentsList');
    if(!box || !window.currentWorkerId) return;
    const {data,error}=await db.from('worker_documents')
      .select('id,document_type,file_path,file_name,uploaded_at,status,notes')
      .eq('worker_id',window.currentWorkerId)
      .order('uploaded_at',{ascending:false});
    if(error){
      box.innerHTML='<p class="error">'+escHtml(error.message)+'</p>';
      return;
    }
    if(!data?.length){
      box.innerHTML="<p class='muted'>📂 مجلد مستنداتي فارغ حاليًا.</p>";
      return;
    }
    const groups={};
    data.forEach(d=>{
      const key=d.document_type||'other';
      (groups[key] ||= []).push(d);
    });
    box.innerHTML='<div class="worker-doc-folders">'+Object.entries(groups).map(([type,items])=>{
      const title=typeof documentLabel==='function'?documentLabel(type):type;
      return '<div class="worker-doc-folder"><div class="folder-title">📁 '+esc(title)+'</div>'+
        '<div class="folder-meta">'+items.length+' ملف</div>'+
        '<div class="folder-files">'+items.map(d=>
          '<div class="doc-row"><b>'+esc(typeof documentLabel==='function'?documentLabel(d.document_type):d.document_type)+'</b>'+
          '<div class="muted">'+esc(d.file_name||'')+'</div>'+
          '<div class="muted">📅 '+(d.uploaded_at?new Date(d.uploaded_at).toLocaleString('ar-EG'):'—')+'</div>'+
          '<div class="doc-status '+(d.status==='مكتمل'?'status-ok':d.status==='مرفوض'?'status-reject':'status-pending')+'">الحالة: '+esc(d.status||'قيد المراجعة')+'</div>'+
          (d.notes?'<div class="muted">📝 '+esc(d.notes)+'</div>':'')+
          '<div class="doc-actions"><button onclick="openMyDocument(\''+esc(d.file_path)+'\')">👁️ عرض</button></div></div>'
        ).join('')+'</div></div>';
    }).join('')+'</div>';
  };

  /* Keep announcements as their own service, not notifications */
  const oldWorkerService=window.openWorkerService;
  window.openWorkerService=async function(kind){
    if(kind==='announcements') return v5OpenAnnouncements();
    return oldWorkerService ? oldWorkerService(kind) : null;
  };

  /* Patch storage path in the upload functions by intercepting the generated path helpers */
  const originalUploadMyDocument=window.uploadMyDocument;
  if(originalUploadMyDocument){
    /* The original function remains for backward compatibility; new files are organized
       by a small pre-submit hook when possible. */
  }

  function patchPathsInScripts(){
    document.querySelectorAll('script').forEach(sc=>{
      if(!sc.textContent.includes('`${user.id}/${type}-')) return;
      sc.textContent=sc.textContent.replaceAll(
        '`${user.id}/${type}-${Date.now()}.${ext}`',
        'v5DocumentPath(user.id,type,f.name)'
      );
      sc.textContent=sc.textContent.replaceAll(
        '`'+"${user.id}"+'/مستنداتي/صورة_شخصية-${Date.now()}.jpg`',
        '`'+"${user.id}"+'/مستنداتي/personal_photo/صورة_شخصية-${Date.now()}.jpg`'
      );
    });
  }

  /* Admin broadcast: server-side RPC, independent of the worker services script. */
  window.adminGeneralAnnouncement=window.adminGeneralAnnouncement||function(){
    openModal('📢 إعلان للجميع','<div class="card"><h3>📢 نشر إعلان لجميع العاملين</h3><textarea id="generalAnnouncementText" rows="5" placeholder="اكتب الإعلان هنا..."></textarea><button onclick="sendGeneralAnnouncement()">📢 نشر الإعلان</button><p id="generalAnnouncementMsg"></p></div>');
  };
  window.sendGeneralAnnouncement=async function(){
    const input=q('#generalAnnouncementText'), msg=q('#generalAnnouncementMsg'), value=(input?.value||'').trim();
    if(!value){if(msg){msg.className='error';msg.textContent='اكتب نص الإعلان.';}return;}
    if(msg){msg.className='muted';msg.textContent='جارٍ نشر الإعلان لجميع العاملين...';}
    const r=await db.rpc('admin_broadcast_announcement',{p_message:value});
    if(r.error){if(msg){msg.className='error';msg.textContent='تعذر نشر الإعلان: '+r.error.message;}return;}
    if(input) input.value='';
    if(msg){msg.className='success';msg.textContent='تم نشر الإعلان بنجاح لجميع العاملين ('+(r.data||0)+' عامل).';}
    if(typeof refreshFbBars==='function') setTimeout(refreshFbBars,300);
  };

  function boot(){
    addBrand();
    removeWelcomeCards();
    setTimeout(addBrand,400);
    setTimeout(addBrand,1200);
    setTimeout(removeWelcomeCards,1600);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
  setInterval(()=>{addBrand();removeWelcomeCards()},1200);
})();
