
(function(){
  const q=s=>document.querySelector(s);
  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const timeAgo=d=>{const t=new Date(d).getTime();if(!t)return '';const sec=Math.max(0,(Date.now()-t)/1000);if(sec<60)return 'منذ لحظات';if(sec<3600)return 'منذ '+Math.floor(sec/60)+' دقيقة';if(sec<86400)return 'منذ '+Math.floor(sec/3600)+' ساعة';return new Date(d).toLocaleDateString('ar-EG')};

  function ensureServiceModal(){
    if(document.getElementById('serviceModalBackdrop')) return;
    document.body.insertAdjacentHTML('beforeend',`<div id="serviceModalBackdrop" class="service-modal-backdrop hidden" style="display:none" onclick="closeServiceModal(event)"><div class="service-modal" onclick="event.stopPropagation()"><div class="service-modal-head"><h2 id="serviceModalTitle">الخدمة</h2><button class="service-modal-close" onclick="closeServiceModal()">×</button></div><div id="serviceModalBody" class="service-modal-body"></div></div></div>`);
  }
  window.closeServiceModal=function(e){if(e&&e.target&&e.target.id!=='serviceModalBackdrop')return;const b=q('#serviceModalBackdrop');if(b){b.classList.add('hidden');b.style.display='none'}document.body.style.overflow=''};
  function openModal(title,html){ensureServiceModal();const b=q('#serviceModalBackdrop'),t=q('#serviceModalTitle'),body=q('#serviceModalBody');if(!b||!t||!body)return;t.textContent=title||'الخدمة';body.innerHTML=html||'<div class="card"><p class="muted">لا توجد بيانات لعرضها حاليًا.</p></div>';b.classList.remove('hidden');b.style.display='flex';document.body.style.overflow='hidden'}
  window.openCentralServiceModal=openModal;

  function cleanServiceCards(){
    document.querySelectorAll('#workerServices p.muted').forEach(p=>{if(/الخدمات الإلكترونية متاحة/.test(p.textContent))p.remove()});
    document.querySelectorAll('#workerServices .service-card p,#centralAdminServices .service-card p').forEach(p=>p.remove());
  }

  async function libraryWorker(){
    openModal('📚 مكتبة العاملين','<div class="card"><p class="muted">جارٍ تحميل المكتبة...</p></div>');
    const r=await db.from('worker_library_files').select('id,file_path,file_name,mime_type,size_bytes,title,description,category,is_published,created_at').eq('is_published',true).order('created_at',{ascending:false});
    if(r.error){q('#serviceModalBody').innerHTML=`<div class="card"><p class="error">تعذر تحميل المكتبة: ${escHtml(r.error.message)}</p></div>`;return;}
    const rows=r.data||[];
    q('#serviceModalBody').innerHTML=`<div class="card"><div class="shared-library-grid">${rows.length?rows.map(x=>`<div class="shared-file"><b>📄 ${escHtml(x.title||x.file_name||'مستند')}</b><div>${escHtml(x.description||'')}</div><div class="meta">${escHtml(x.category||'عام')} — ${escHtml(x.file_name||'')} — ${x.created_at?timeAgo(x.created_at):''}</div><div class="shared-actions"><button onclick="openLibraryFile('${escHtml(x.file_path||'')}')">👁️ فتح الملف</button></div></div>`).join(''):'<p class="muted">لا توجد ملفات منشورة حاليًا.</p>'}</div></div>`;
  }
  window.openLibraryFile=async function(path){if(!path){alert('لا يوجد ملف مرفق.');return}const r=await db.storage.from('worker-documents').createSignedUrl(path,3600);if(r.error){alert('تعذر فتح الملف: '+r.error.message);return}window.open(r.data.signedUrl,'_blank','noopener')};

  async function libraryAdmin(){
    openModal('📚 إدارة مكتبة العاملين','<div class="card"><p class="muted">جارٍ تحميل المكتبة...</p></div>');
    q('#serviceModalBody').innerHTML=`<div class="card"><h3>📤 إضافة ملف للمكتبة</h3><div class="formgrid"><input id="fbSharedTitle" placeholder="عنوان المستند / النموذج"><input id="fbSharedCategory" placeholder="التصنيف"><input id="fbSharedFile" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></div><textarea id="fbSharedDescription" rows="3" placeholder="وصف مختصر"></textarea><button onclick="fbUploadLibrary()">⬆️ نشر للجميع</button><p id="fbSharedMsg"></p></div><div class="card"><h3>📋 الملفات المنشورة</h3><div id="fbSharedList">جارٍ التحميل...</div></div>`;
    refreshFbAdminLibrary();
  }
  window.fbUploadLibrary=async function(){
    const title=q('#fbSharedTitle')?.value.trim(),category=q('#fbSharedCategory')?.value.trim()||'عام',description=q('#fbSharedDescription')?.value.trim()||'',file=q('#fbSharedFile')?.files?.[0],msg=q('#fbSharedMsg');
    if(!title||!file){msg.className='error';msg.textContent='اكتب العنوان واختر الملف.';return}if(file.size>20*1024*1024){msg.className='error';msg.textContent='حجم الملف لا يتجاوز 20 ميجابايت.';return}
    const {data:{user}}=await db.auth.getUser();if(!user){msg.className='error';msg.textContent='يجب تسجيل الدخول أولًا.';return}
    const safe=(file.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_'),path='shared/'+Date.now()+'-'+safe;msg.className='muted';msg.textContent='جارٍ الرفع...';
    const up=await db.storage.from('worker-documents').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(up.error){msg.className='error';msg.textContent='تعذر رفع الملف: '+up.error.message;return}
    const r=await db.from('worker_library_files').insert({file_path:path,file_name:file.name,mime_type:file.type||null,size_bytes:file.size,uploaded_by:user.id,title,description,category,is_published:true});
    if(r.error){await db.storage.from('worker-documents').remove([path]);msg.className='error';msg.textContent='تعذر تسجيل الملف: '+r.error.message;return}
    msg.className='success';msg.textContent='تم نشر الملف لجميع العاملين.';q('#fbSharedTitle').value='';q('#fbSharedDescription').value='';q('#fbSharedFile').value='';refreshFbAdminLibrary();
  };
  window.refreshFbAdminLibrary=async function(){
    const b=q('#fbSharedList');if(!b)return;const r=await db.from('worker_library_files').select('id,file_path,file_name,title,description,category,is_published,created_at').order('created_at',{ascending:false});
    if(r.error){b.innerHTML=`<p class="error">${escHtml(r.error.message)}</p>`;return}
    b.innerHTML=(r.data||[]).map(x=>`<div class="shared-file"><b>📄 ${escHtml(x.title||x.file_name)}</b><div>${escHtml(x.description||'')}</div><div class="meta">${escHtml(x.category||'عام')} — ${escHtml(x.file_name||'')}</div><div class="shared-actions"><button onclick="openLibraryFile('${escHtml(x.file_path||'')}')">👁️ فتح</button><button class="${x.is_published?'secondary':''}" onclick="fbToggleLibrary('${escHtml(x.id)}',${!x.is_published})">${x.is_published?'⏸️ إخفاء':'▶️ نشر'}</button><button class="danger" onclick="fbDeleteLibrary('${escHtml(x.id)}','${escHtml(x.file_path||'')}')">🗑️ حذف</button></div></div>`).join('')||'<p class="muted">لا توجد ملفات.</p>';
  };
  window.fbToggleLibrary=async function(id,val){const r=await db.from('worker_library_files').update({is_published:val}).eq('id',id);if(r.error)alert(r.error.message);else refreshFbAdminLibrary()};
  window.fbDeleteLibrary=async function(id,path){if(!confirm('حذف هذا الملف من المكتبة؟'))return;await db.storage.from('worker-documents').remove([path]);const r=await db.from('worker_library_files').delete().eq('id',id);if(r.error)alert(r.error.message);else refreshFbAdminLibrary()};

  function serviceLoan(){openModal('💰 السلفة المالية',`<div class="card"><h3>طلب سلفة مالية</h3><p class="muted">أدخل المبلغ المطلوب فقط.</p><input id="fbLoanAmount" type="number" min="1" step="1" placeholder="💵 المبلغ بالجنيه"><button onclick="fbSubmitLoan()">📨 إرسال الطلب</button><p id="fbLoanMsg"></p></div><div class="card"><h3>📋 طلباتي السابقة</h3><div id="fbLoanList">جارٍ التحميل...</div></div>`);fbLoadLoans()}
  window.fbSubmitLoan=async function(){const amount=Number(q('#fbLoanAmount')?.value||0),m=q('#fbLoanMsg');if(!amount||amount<=0){m.className='error';m.textContent='حدد مبلغًا صحيحًا.';return}const r=await db.from('financial_requests').insert({worker_id:window.currentWorkerId,request_type:'سلفة مالية',amount,reason:'',notes:'',status:'قيد المراجعة'});if(r.error){m.className='error';m.textContent='تعذر إرسال الطلب: '+r.error.message;return}m.className='success';m.textContent='تم إرسال طلب السلفة بنجاح.';q('#fbLoanAmount').value='';fbLoadLoans();};
  window.fbLoadLoans=async function(){const b=q('#fbLoanList');if(!b||!window.currentWorkerId)return;const r=await db.from('financial_requests').select('id,amount,status,admin_notes,created_at').eq('worker_id',window.currentWorkerId).eq('request_type','سلفة مالية').order('created_at',{ascending:false}).limit(30);if(r.error){b.innerHTML=`<p class="error">${escHtml(r.error.message)}</p>`;return}b.innerHTML=(r.data||[]).map(x=>`<div class="shared-file"><b>${fmtMoney(x.amount)}</b> جنيه <span class="req-status ${x.status==='مقبول'?'req-approved':x.status==='مرفوض'?'req-rejected':'req-pending'}">${escHtml(x.status||'قيد المراجعة')}</span><div class="meta">${timeAgo(x.created_at)}</div>${x.admin_notes?`<div class="muted">رد الإدارة: ${escHtml(x.admin_notes)}</div>`:''}</div>`).join('')||'<p class="muted">لا توجد طلبات سابقة.</p>'};

  function workerChat(){openModal('💬 التحدث مع المتابعة',`<div class="card"><div id="fbWorkerChat" class="admin-chat">جارٍ تحميل المحادثة...</div><textarea id="fbWorkerText" rows="3" placeholder="اكتب رسالتك للمتابعة المركزية..."></textarea><button onclick="fbSendWorkerMessage()">📨 إرسال</button><p id="fbWorkerMsg"></p></div>`);fbRefreshWorkerChat()}
  window.fbRefreshWorkerChat=async function(){const b=q('#fbWorkerChat');if(!b||!window.currentWorkerId)return;const r=await db.from('admin_messages').select('id,sender_type,message,created_at,read_at').eq('worker_id',window.currentWorkerId).order('created_at',{ascending:true}).limit(100);if(r.error){b.innerHTML=`<p class="error">${escHtml(r.error.message)}</p>`;return}b.innerHTML=(r.data||[]).map(x=>`<div class="chat-msg ${x.sender_type==='admin'?'admin':'worker'}"><b>${x.sender_type==='admin'?'👨‍💼 المتابعة المركزية':'👤 أنت'}</b><div>${escHtml(x.message)}</div><small class="muted">${timeAgo(x.created_at)}</small></div>`).join('')||'<p class="muted">ابدأ المحادثة برسالة جديدة.</p>';b.scrollTop=b.scrollHeight};
  window.fbSendWorkerMessage=async function(){const t=q('#fbWorkerText')?.value.trim(),m=q('#fbWorkerMsg');if(!t)return;const r=await db.from('admin_messages').insert({worker_id:window.currentWorkerId,sender_type:'worker',message:t});if(r.error){m.className='error';m.textContent='تعذر إرسال الرسالة: '+r.error.message;return}q('#fbWorkerText').value='';m.className='success';m.textContent='تم إرسال الرسالة.';fbRefreshWorkerChat();setTimeout(refreshFbBars,300)};

  function notificationsWorker(){openModal('🔔 الإشعارات',`<div class="card"><div id="fbWorkerNotifications">جارٍ التحميل...</div></div>`);fbLoadWorkerNotifications()}
  window.fbLoadWorkerNotifications=async function(){const b=q('#fbWorkerNotifications');if(!b||!window.currentWorkerId)return;const r=await db.from('notifications').select('id,message,title,notification_type,created_at,read_at').eq('recipient_worker_id',window.currentWorkerId).order('created_at',{ascending:false}).limit(50);if(r.error){b.innerHTML=`<p class="error">${escHtml(r.error.message)}</p>`;return}b.innerHTML=(r.data||[]).map(n=>`<div class="fb-item ${n.read_at?'':'unread'}" onclick="fbMarkNotification('${escHtml(n.id)}')"><div class="fb-item-icon">${n.notification_type==='عاجل'?'🚨':'🔔'}</div><div class="fb-item-text"><b>${escHtml(n.title||n.notification_type||'إشعار')}</b><span>${escHtml(n.message)}</span><span>${timeAgo(n.created_at)} ${n.read_at?'':'• جديد'}</span></div></div>`).join('')||'<div class="fb-empty">لا توجد إشعارات.</div>'};
  window.fbMarkNotification=async function(id){await db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);fbLoadWorkerNotifications();refreshFbBars()};

  function adminChat(){openModal('💬 رسائل العاملين',`<div class="card"><select id="fbAdminWorker" onchange="fbLoadAdminChat()"><option value="">اختر العامل...</option>${(workers||[]).map(w=>`<option value="${escHtml(w.id)}">${escHtml(w.worker_code)} — ${escHtml(w.full_name)}</option>`).join('')}</select><div id="fbAdminChat" class="admin-chat">اختر عاملًا.</div><textarea id="fbAdminReply" rows="3" placeholder="اكتب الرد..."></textarea><button onclick="fbSendAdminMessage()">📨 إرسال الرد</button><p id="fbAdminMsg"></p></div>`);}
  window.fbLoadAdminChat=async function(){const id=q('#fbAdminWorker')?.value,b=q('#fbAdminChat');if(!id||!b)return;const r=await db.from('admin_messages').select('id,sender_type,message,created_at,read_at').eq('worker_id',id).order('created_at',{ascending:true}).limit(100);if(r.error){b.innerHTML=`<p class="error">${escHtml(r.error.message)}</p>`;return}b.innerHTML=(r.data||[]).map(x=>`<div class="chat-msg ${x.sender_type==='admin'?'admin':'worker'}"><b>${x.sender_type==='admin'?'👨‍💼 المتابعة':'👤 العامل'}</b><div>${escHtml(x.message)}</div><small class="muted">${timeAgo(x.created_at)}</small></div>`).join('')||'<p class="muted">لا توجد رسائل.</p>';const unread=(r.data||[]).filter(x=>x.sender_type==='worker'&&!x.read_at).map(x=>x.id);if(unread.length)await db.from('admin_messages').update({read_at:new Date().toISOString()}).in('id',unread);b.scrollTop=b.scrollHeight;refreshFbBars()};
  window.fbSendAdminMessage=async function(){const id=q('#fbAdminWorker')?.value,t=q('#fbAdminReply')?.value.trim(),m=q('#fbAdminMsg');if(!id||!t)return;const r=await db.from('admin_messages').insert({worker_id:id,sender_type:'admin',message:t});if(r.error){m.className='error';m.textContent='تعذر إرسال الرد: '+r.error.message;return}q('#fbAdminReply').value='';m.className='success';m.textContent='تم إرسال الرد.';fbLoadAdminChat()};

  async function getWorkerIdentity(){
    if(window.currentWorkerId)return window.currentWorkerId;const {data:{user}}=await db.auth.getUser();if(!user)return null;const r=await db.from('workers').select('id').eq('user_id',user.id).maybeSingle();if(r.data){window.currentWorkerId=r.data.id;return r.data.id}return null;
  }
  window.refreshFbBars=async function(){
    const workerId=await getWorkerIdentity();
    const nb=q('#fbWorkerNotifBadge'),mb=q('#fbWorkerMsgBadge');
    if(workerId){const [n,m]=await Promise.all([db.from('notifications').select('id',{count:'exact',head:true}).eq('recipient_worker_id',workerId).is('read_at',null),db.from('admin_messages').select('id',{count:'exact',head:true}).eq('worker_id',workerId).eq('sender_type','admin').is('read_at',null)]);if(nb){nb.textContent=n.count||'';nb.style.display=n.count?'block':'none'}if(mb){mb.textContent=m.count||'';mb.style.display=m.count?'block':'none'}}
    const an=q('#fbAdminAlertBadge'),am=q('#fbAdminMsgBadge');if(an&&typeof workers!=='undefined'&&(workers||[]).length){const [req,doc]=await Promise.all([db.from('financial_requests').select('id',{count:'exact',head:true}).eq('status','قيد المراجعة'),db.from('worker_documents').select('id',{count:'exact',head:true}).eq('status','قيد المراجعة')]);const count=(req.count||0)+(doc.count||0);an.textContent=count||'';an.style.display=count?'block':'none'}if(am&&typeof workers!=='undefined'&&(workers||[]).length){const m=await db.from('admin_messages').select('id',{count:'exact',head:true}).eq('sender_type','worker').is('read_at',null);am.textContent=m.count||'';am.style.display=m.count?'block':'none'}
  };

  function injectBars(){
    if(document.getElementById('fbWorkerBar')&&!document.getElementById('fbAdminBar')){}
    const wp=q('#workerPage');
    if(wp&&!q('#fbWorkerBar')){wp.insertAdjacentHTML('afterbegin',`<div id="fbWorkerBar" class="fb-topbar"><div class="fb-user-mini"><div class="fb-user-avatar" id="fbWorkerAvatar">👤</div><span id="fbWorkerName">العامل</span></div><div class="fb-actions"><button class="fb-icon-btn" aria-label="الرسائل" onclick="toggleFbDrop('fbWorkerMsgDrop')">💬<span id="fbWorkerMsgBadge" class="fb-badge" style="display:none"></span></button><button class="fb-icon-btn" aria-label="الإشعارات" onclick="toggleFbDrop('fbWorkerNotifDrop')">🔔<span id="fbWorkerNotifBadge" class="fb-badge" style="display:none"></span></button></div><div id="fbWorkerMsgDrop" class="fb-dropdown"><div class="fb-drop-head">الرسائل</div><div id="fbWorkerMsgList" class="fb-drop-body"></div><div class="fb-drop-footer"><button onclick="workerChat();closeFbDrops()">فتح المحادثة</button></div></div><div id="fbWorkerNotifDrop" class="fb-dropdown"><div class="fb-drop-head">الإشعارات</div><div id="fbWorkerNotifList" class="fb-drop-body"></div><div class="fb-drop-footer"><button onclick="notificationsWorker();closeFbDrops()">عرض كل الإشعارات</button></div></div></div>`)}
    const dash=q('#dashboard');
    if(dash&&!q('#fbAdminBar')){dash.insertAdjacentHTML('afterbegin',`<div id="fbAdminBar" class="fb-topbar"><div class="fb-user-mini"><div class="fb-user-avatar">🛡️</div><span>المتابعة المركزية</span></div><div class="fb-actions"><button class="fb-icon-btn" aria-label="رسائل العاملين" onclick="toggleFbDrop('fbAdminMsgDrop')">💬<span id="fbAdminMsgBadge" class="fb-badge" style="display:none"></span></button><button class="fb-icon-btn" aria-label="تنبيهات" onclick="toggleFbDrop('fbAdminAlertDrop')">🔔<span id="fbAdminAlertBadge" class="fb-badge" style="display:none"></span></button></div><div id="fbAdminMsgDrop" class="fb-dropdown"><div class="fb-drop-head">رسائل العاملين</div><div id="fbAdminMsgList" class="fb-drop-body"></div><div class="fb-drop-footer"><button onclick="adminChat();closeFbDrops()">فتح الرسائل</button></div></div><div id="fbAdminAlertDrop" class="fb-dropdown"><div class="fb-drop-head">التنبيهات</div><div id="fbAdminAlertList" class="fb-drop-body"></div><div class="fb-drop-footer"><button onclick="adminOverview();closeFbDrops()">فتح لوحة المتابعة</button></div></div></div>`)}
    updateWorkerBarIdentity();loadFbDropData();
  }
  window.toggleFbDrop=function(id){document.querySelectorAll('.fb-dropdown').forEach(x=>{if(x.id!==id)x.classList.remove('open')});const x=q('#'+id);if(x)x.classList.toggle('open')};
  window.closeFbDrops=function(){document.querySelectorAll('.fb-dropdown').forEach(x=>x.classList.remove('open'))};
  document.addEventListener('click',e=>{if(!e.target.closest('.fb-topbar'))closeFbDrops()});
  async function updateWorkerBarIdentity(){const id=await getWorkerIdentity();if(!id)return;const w=(workers||[]).find(x=>x.id===id);if(q('#fbWorkerName'))q('#fbWorkerName').textContent=w?.full_name||'العامل';}
  async function loadFbDropData(){
    const id=await getWorkerIdentity();
    if(id){const [n,m]=await Promise.all([db.from('notifications').select('id,message,title,notification_type,created_at,read_at').eq('recipient_worker_id',id).order('created_at',{ascending:false}).limit(7),db.from('admin_messages').select('id,message,created_at,read_at').eq('worker_id',id).eq('sender_type','admin').order('created_at',{ascending:false}).limit(7)]);if(q('#fbWorkerNotifList'))q('#fbWorkerNotifList').innerHTML=(n.data||[]).map(x=>`<div class="fb-item ${x.read_at?'':'unread'}" onclick="fbMarkNotification('${escHtml(x.id)}')"><div class="fb-item-icon">🔔</div><div class="fb-item-text"><b>${escHtml(x.title||x.notification_type||'إشعار')}</b><span>${escHtml(x.message)}</span><span>${timeAgo(x.created_at)}</span></div></div>`).join('')||'<div class="fb-empty">لا توجد إشعارات.</div>';if(q('#fbWorkerMsgList'))q('#fbWorkerMsgList').innerHTML=(m.data||[]).map(x=>`<div class="fb-item ${x.read_at?'':'unread'}" onclick="workerChat();closeFbDrops()"><div class="fb-item-icon">💬</div><div class="fb-item-text"><b>المتابعة المركزية</b><span>${escHtml(x.message)}</span><span>${timeAgo(x.created_at)}</span></div></div>`).join('')||'<div class="fb-empty">لا توجد رسائل.</div>'}
    if(q('#fbAdminMsgList')){const m=await db.from('admin_messages').select('id,worker_id,message,created_at,read_at').eq('sender_type','worker').order('created_at',{ascending:false}).limit(7);q('#fbAdminMsgList').innerHTML=(m.data||[]).map(x=>{const w=(workers||[]).find(y=>y.id===x.worker_id);return `<div class="fb-item ${x.read_at?'':'unread'}" onclick="adminChat();closeFbDrops()"><div class="fb-item-icon">👤</div><div class="fb-item-text"><b>${escHtml(w?.full_name||'عامل')}</b><span>${escHtml(x.message)}</span><span>${timeAgo(x.created_at)}</span></div></div>`}).join('')||'<div class="fb-empty">لا توجد رسائل جديدة.</div>'}
    if(q('#fbAdminAlertList')){const [r,d]=await Promise.all([db.from('financial_requests').select('id,amount,created_at').eq('status','قيد المراجعة').order('created_at',{ascending:false}).limit(5),db.from('worker_documents').select('id,created_at').eq('status','قيد المراجعة').order('created_at',{ascending:false}).limit(5)]);const items=[...(r.data||[]).map(x=>({icon:'💰',text:'طلب سلفة '+fmtMoney(x.amount)+' جنيه',date:x.created_at})),...(d.data||[]).map(x=>({icon:'📁',text:'مستند يحتاج مراجعة',date:x.created_at}))].sort((a,b)=>new Date(b.date)-new Date(a.date));q('#fbAdminAlertList').innerHTML=items.map(x=>`<div class="fb-item"><div class="fb-item-icon">${x.icon}</div><div class="fb-item-text"><b>${escHtml(x.text)}</b><span>${timeAgo(x.date)}</span></div></div>`).join('')||'<div class="fb-empty">لا توجد تنبيهات جديدة.</div>'}
    refreshFbBars();
  }

  window.fbSaveProfile=async function(){return;if(email&&!/^\S+@\S+\.\S+$/.test(email)){m.className='error';m.textContent='اكتب بريدًا إلكترونيًا صحيحًا.';return}const r=await db.from('workers').update({phone,email}).eq('id',window.currentWorkerId);if(r.error){m.className='error';m.textContent='تعذر تحديث البيانات: '+r.error.message;return}const w=(workers||[]).find(x=>x.id===window.currentWorkerId);if(w){w.phone=phone;w.email=email}m.className='success';m.textContent='تم تحديث البيانات بنجاح.'};
  window.fbLoadPayslip=async function(){const mm=q('#fbPayMonth')?.value,yy=q('#fbPayYear')?.value;const oldM=q('#myMonth'),oldY=q('#myYear');if(oldM&&mm)oldM.value=mm;if(oldY&&yy)oldY.value=yy;if(typeof loadMyPayslip==='function'){await loadMyPayslip();setTimeout(()=>{const src=q('#myPayslip'),dst=q('#fbPayBody');if(src&&dst)dst.innerHTML=src.innerHTML},250)}};
  window.fbOpenSecurity=async function(){const {data:{user}}=await db.auth.getUser();openModal('🔐 مركز الأمان',`<div class="card"><div class="smart-tile"><b>آخر تسجيل دخول</b><div>${user?.last_sign_in_at?new Date(user.last_sign_in_at).toLocaleString('ar-EG'):'غير متاح'}</div></div><h3>🔑 تغيير كلمة المرور</h3><input id="fbSecPass" type="password" placeholder="كلمة المرور الجديدة"><input id="fbSecPass2" type="password" placeholder="تأكيد كلمة المرور"><button onclick="fbSavePassword()">💾 حفظ كلمة المرور</button><button class="secondary" onclick="fbSignOutOthers()">🚪 تسجيل الخروج من الأجهزة الأخرى</button><p id="fbSecMsg"></p></div>`) };
  window.fbSavePassword=async function(){const a=q('#fbSecPass')?.value||'',b=q('#fbSecPass2')?.value||'',m=q('#fbSecMsg');if(a.length<8){m.className='error';m.textContent='كلمة المرور يجب ألا تقل عن 8 أحرف.';return}if(a!==b){m.className='error';m.textContent='كلمتا المرور غير متطابقتين.';return}const r=await db.auth.updateUser({password:a});if(r.error){m.className='error';m.textContent='تعذر تغيير كلمة المرور: '+r.error.message;return}m.className='success';m.textContent='تم تغيير كلمة المرور بنجاح.'};
  window.fbSignOutOthers=async function(){const m=q('#fbSecMsg');const r=await db.auth.signOut({scope:'others'});if(r.error){m.className='error';m.textContent='تعذر إنهاء الجلسات الأخرى: '+r.error.message}else{m.className='success';m.textContent='تم تسجيل الخروج من الأجهزة الأخرى.'}};

  async function getAuthWorkerIdentity(){
    const {data:{user}}=await db.auth.getUser();
    if(!user) return null;
    const r=await db.from('workers').select('id,full_name,worker_code,department,gender,status').eq('user_id',user.id).maybeSingle();
    if(r.error || !r.data) return null;
    window.currentWorkerId=r.data.id;
    return r.data.id;
  }
  async function getPeerMe(myId){
    const r=await db.from('workers').select('id,full_name,worker_code,department,gender,status,user_id').eq('id',myId).maybeSingle();
    return r.data||null;
  }
  window.workerPeerChat=async function(){
    const id=await getAuthWorkerIdentity();
    if(!id){openModal('📁 تواصل العاملين','<div class="card"><p class="error">تعذر تحديد حساب العامل.</p></div>');return;}
    const me=await getPeerMe(id);
    if(!me){openModal('📁 تواصل العاملين','<div class="card"><p class="error">تعذر تحميل بيانات العامل.</p></div>');return;}
    const dept=me.department||''; const gender=me.gender||'';
    openModal('📁 فولدر تواصل العاملين',`<div class="peer-chat-folder">
      <div class="peer-chat-folder-head"><div><h3 style="margin:0">💬 تواصل العاملين</h3><p class="muted" style="margin:6px 0 0">دردشة خاصة داخل نفس الإدارة، مع فصل العاملات والعاملين.</p></div><div class="peer-chat-badge">📁 ${escHtml(dept||'الإدارة غير محددة')}</div></div>
      <div class="peer-chat-note">📁 الإدارة: <b>${escHtml(dept||'غير محددة')}</b> &nbsp; | &nbsp; 👤 أنت: <b>${escHtml(gender||'غير محدد')}</b></div>
      ${!gender?`<div class="peer-chat-note warning">⚠️ النوع غير محدد لحسابك، لذلك لن يتم فتح الدردشة حتى يتم تحديد النوع.</div>`:''}
      <div class="peer-chat-layout"><aside class="peer-chat-list">
        <div class="peer-chat-list-title">👥 العاملون في ${escHtml(dept||'الإدارة')}</div>
        <div class="peer-chat-section">👩 العاملات</div><div id="peerChatFemales">جارٍ التحميل...</div>
        <div class="peer-chat-section">👨 العاملون</div><div id="peerChatMales">جارٍ التحميل...</div>
      </aside><section class="peer-chat-window"><div id="peerChatHeader" class="peer-chat-header">💬 اختر زميلًا من القائمة</div><div id="peerChatMessages" class="peer-chat-messages"><div class="peer-empty">اختر زميلًا لبدء المحادثة.</div></div><div class="peer-compose"><textarea id="peerChatText" rows="2" maxlength="2000" placeholder="اكتب رسالة..."></textarea><button type="button" onclick="sendPeerChat()">📨 إرسال</button></div><div id="peerChatMsg" class="muted" style="padding:0 12px 8px"></div></section></div></div>`);
    await loadPeerChatPeople(id);
    setupPeerNotificationPolling();
    if('Notification' in window && Notification.permission==='default'){
      try{ setTimeout(()=>Notification.requestPermission().catch(()=>{}),300); }catch(e){}
    }
  };
  window.peerDirectoryCache=[];
  async function loadPeerChatPeople(myId){
    const femaleBox=q('#peerChatFemales'), maleBox=q('#peerChatMales'); if(!femaleBox||!maleBox)return;
    const me=await getPeerMe(myId);
    if(!me?.department){femaleBox.innerHTML=maleBox.innerHTML='<div class="peer-empty">لم يتم تحديد الإدارة لهذا الحساب.</div>';return;}
    const r=await db.rpc('get_worker_chat_directory',{p_worker_id:myId});
    if(r.error){femaleBox.innerHTML=maleBox.innerHTML='<div class="error">تعذر تحميل الزملاء: '+escHtml(r.error.message)+'</div>';return;}
    const rows=(r.data||[]).filter(w=>w.id!==myId); window.peerDirectoryCache=rows;
    const myGender=peerGender(me.gender);
    const render=(arr,kind)=>arr.map(w=>{
      const normalizedGender=peerGender(w.gender), icon=kind==='female'?'👩':'👨', can=myGender===normalizedGender;
      const state=can?'متاح للدردشة':'غير متاح لحسابك'; const fullName=(w.full_name||'').trim() || 'عامل';
      return `<button type="button" class="peer-person ${can?'':'locked'}" ${can?`onclick="selectPeerChat('${w.id}')"`:''}><span class="peer-avatar">${icon}</span><span class="peer-person-main"><b class="peer-person-name">${escHtml(fullName)}</b><small class="peer-person-dept">${escHtml(w.department||me.department||'')}</small><em class="${can?'peer-available':'peer-no-access'}">${can?'🟢 '+state:'🔒 '+state}</em></span></button>`;
    }).join('');
    const females=rows.filter(w=>peerGender(w.gender)==='أنثى'), males=rows.filter(w=>peerGender(w.gender)==='ذكر');
    femaleBox.innerHTML=render(females,'female') || '<div class="peer-empty">لا توجد عاملات أخريات في نفس الإدارة.</div>';
    maleBox.innerHTML=render(males,'male') || '<div class="peer-empty">لا يوجد عاملون آخرون في نفس الإدارة.</div>';
  }
  function normPeerText(v){return String(v||'').trim().replace(/[إأآ]/g,'ا').replace(/[ى]/g,'ي').replace(/[ة]/g,'ه').replace(/[ـ]/g,'').replace(/\s+/g,' ').toLowerCase();}
  function peerGender(v){const x=normPeerText(v); if(x.includes('انث')) return 'أنثى'; if(x.includes('ذكر')) return 'ذكر'; return String(v||'').trim();}
  function samePeerGroup(a,b){return !!a&&!!b&&normPeerText(a.department)===normPeerText(b.department)&&peerGender(a.gender)===peerGender(b.gender);}
  window.selectPeerChat=async function(otherId){
    const myId=await getAuthWorkerIdentity(); if(!myId||!otherId)return; const me=await getPeerMe(myId);
    let target=(window.peerDirectoryCache||[]).find(x=>x.id===otherId); if(!target){await loadPeerChatPeople(myId);target=(window.peerDirectoryCache||[]).find(x=>x.id===otherId);}
    if(!samePeerGroup(me,target)){alert('لا يمكنك بدء محادثة مع هذا العامل.');return;}
    q('#peerChatHeader').innerHTML=`<span class="peer-head-avatar">${peerGender(target.gender)==='أنثى'?'👩':'👨'}</span><span><span class="peer-head-name">${escHtml(target.full_name)}</span><span class="peer-head-meta">${escHtml(target.department||'')} • متاح الآن</span></span>`;
    q('#peerChatMessages').dataset.peer=otherId; document.querySelectorAll('.peer-person').forEach(x=>x.classList.remove('active'));
    const btn=[...document.querySelectorAll('.peer-person')].find(x=>x.getAttribute('onclick')?.includes(otherId)); if(btn)btn.classList.add('active'); await refreshPeerChat();
  };
  window.refreshPeerChat=async function(){
    const otherId=q('#peerChatMessages')?.dataset.peer,b=q('#peerChatMessages'); if(!otherId||!b)return;
    const r=await db.rpc('get_worker_peer_messages',{p_other_worker_id:otherId}); if(r.error){b.innerHTML='<div class="error">'+escHtml(r.error.message)+'</div>';return;}
    const myId=await getAuthWorkerIdentity(); if(!myId)return;
    b.innerHTML=(r.data||[]).map(x=>`<div class="peer-msg ${x.sender_worker_id===myId?'mine':'theirs'}"><div>${escHtml(x.message)}</div><small>${timeAgo(x.created_at)}</small></div>`).join('')||'<div class="peer-empty">لا توجد رسائل بعد. ابدأ المحادثة 👋</div>';
    const unread=(r.data||[]).filter(x=>x.receiver_worker_id===myId&&!x.read_at).map(x=>x.id); if(unread.length)await db.from('worker_chat_messages').update({read_at:new Date().toISOString()}).in('id',unread); b.scrollTop=b.scrollHeight;
  };
  window.sendPeerChat=async function(){
    const text=(q('#peerChatText')?.value||'').trim(),otherId=q('#peerChatMessages')?.dataset.peer,msg=q('#peerChatMsg');
    if(!text||!otherId){if(msg)msg.textContent='اختر زميلًا واكتب رسالة أولًا.';return;}
    const r=await db.rpc('send_worker_peer_message',{p_receiver_worker_id:otherId,p_message:text});
    if(r.error){if(msg){msg.className='error';msg.textContent='تعذر إرسال الرسالة: '+r.error.message;}return;}
    q('#peerChatText').value=''; if(msg){msg.className='success';msg.textContent='';} await refreshPeerChat();
  };
  let peerNotifyTimer=null, peerLastNotificationId=null;
  function setupPeerNotificationPolling(){
    if(peerNotifyTimer)clearInterval(peerNotifyTimer);
    checkPeerNotifications(true);
    peerNotifyTimer=setInterval(()=>checkPeerNotifications(false),6000);
  }
  async function checkPeerNotifications(initial){
    const id=await getWorkerIdentity(); if(!id)return;
    const r=await db.from('notifications').select('id,message,title,notification_type,created_at,read_at').eq('recipient_worker_id',id).eq('notification_type','رسالة عاملين').order('created_at',{ascending:false}).limit(5);
    if(r.error||!r.data?.length)return;
    const latest=r.data[0];
    if(!peerLastNotificationId){peerLastNotificationId=latest.id;return;}
    const fresh=r.data.filter(x=>x.id!==peerLastNotificationId && !x.read_at);
    if(fresh.length && !initial){
      peerLastNotificationId=latest.id;
      const item=fresh[0];
      if('Notification' in window){try{if(Notification.permission==='granted')new Notification(item.title||'💬 رسالة جديدة',{body:item.message});else if(Notification.permission==='default')Notification.requestPermission().catch(()=>{});}catch(e){}}
      if(q('#fbWorkerNotifBadge')){const cur=parseInt(q('#fbWorkerNotifBadge').textContent||'0',10)||0;q('#fbWorkerNotifBadge').textContent=String(cur+fresh.length);q('#fbWorkerNotifBadge').style.display='block';}
      if(q('#peerChatMsg')){q('#peerChatMsg').className='success';q('#peerChatMsg').textContent='💬 لديك رسالة جديدة';}
      loadFbDropData();
    }
  }
  async function workerServiceOpen(kind){
    cleanServiceCards();
    if(kind==='library')return libraryWorker();if(kind==='loan')return serviceLoan();if(kind==='chat')return workerChat();if(kind==='peerchat')return workerPeerChat();if(kind==='notifications')return notificationsWorker();
    if(kind==='home'){openModal('🏠 الرئيسية الذكية','<div class="card"><h3>🏠 الرئيسية الذكية</h3></div>');return}
    if(kind==='profile'){ return; }
    if(kind==='attendance'){openModal('📅 سجلي',`<div class="card"><div class="month-controls"><div><label>الشهر</label><select id="fbAttMonth"></select></div><div><label>السنة</label><select id="fbAttYear"></select></div></div><div id="fbAttBody">جارٍ التحميل...</div></div>`);const m=q('#myAttMonth'),y=q('#myAttYear');if(m)q('#fbAttMonth').innerHTML=m.innerHTML;if(y)q('#fbAttYear').innerHTML=y.innerHTML;if(typeof loadMyAttendanceTable==='function'){await loadMyAttendanceTable();setTimeout(()=>{const src=q('#myAttendance'),dst=q('#fbAttBody');if(src&&dst)dst.innerHTML=src.innerHTML},250)}return}
    if(kind==='payslip'){const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];openModal('💳 مفردات المرتب',`<div class="card"><div class="month-controls"><div><div id="fbPayMonths" class="salary-months-horizontal">${months.map((m,i)=>`<button type="button" class="salary-month-chip" data-month="${i+1}" onclick="selectSalaryMonth(${i+1})">${m}</button>`).join('')}</div></div><div style="margin-top:8px"><label>السنة</label><select id="fbPayYear"></select></div></div><button onclick="fbLoadPayslip()">📄 عرض مفردات المرتب</button><div id="fbPayBody">اختر الشهر والسنة ثم اضغط عرض.</div></div>`);const py=q('#myYear');if(py)q('#fbPayYear').innerHTML=py.innerHTML;window.selectSalaryMonth=function(m){const src=q('#myMonth'),ys=q('#fbPayYear');if(src)src.value=String(m);document.querySelectorAll('.salary-month-chip').forEach(b=>b.classList.toggle('active',b.dataset.month===String(m)));};selectSalaryMonth(new Date().getMonth()+1);return}
    if(kind==='requests'){openModal('📝 طلباتي','<div class="card"><div id="allMyRequests">جارٍ التحميل...</div></div>');if(typeof loadAllMyRequests==='function')loadAllMyRequests();return}
    if(kind==='announcements'){return v5OpenAnnouncements();}
    if(kind==='calendar'){openModal('📅 التقويم الإداري','<div class="card"><h3>اليوم</h3><div>'+new Date().toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'})+'</div></div>');return}
    if(kind==='security'){return fbOpenSecurity()}
  }
  window.openWorkerService=function(kind){return workerServiceOpen(kind)};
  window.adminSharedLibrary=libraryAdmin;
  window.adminChatCenter=adminChat;
  window.adminLoanRequests=async function(){if(typeof workers==='undefined')return;openModal('💰 طلبات السلف','<div class="card"><div id="fbAdminLoans">جارٍ التحميل...</div></div>');const r=await db.from('financial_requests').select('id,worker_id,amount,status,admin_notes,created_at').eq('request_type','سلفة مالية').order('created_at',{ascending:false}).limit(100);if(r.error){q('#fbAdminLoans').innerHTML=`<p class="error">${escHtml(r.error.message)}</p>`;return}q('#fbAdminLoans').innerHTML=(r.data||[]).map(x=>{const w=(workers||[]).find(y=>y.id===x.worker_id);return `<div class="shared-file"><b>${escHtml(w?.full_name||'عامل')}</b> — ${fmtMoney(x.amount)} جنيه <span class="req-status ${x.status==='مقبول'?'req-approved':x.status==='مرفوض'?'req-rejected':'req-pending'}">${escHtml(x.status)}</span><div class="meta">${timeAgo(x.created_at)}</div></div>`}).join('')||'<p class="muted">لا توجد طلبات سلف.</p>'};
  window.adminOverview=async function(){openModal('📊 ملخص المتابعة المركزية','<div class="card"><p>يمكنك مراجعة الطلبات والمستندات والتنبيهات من لوحة المتابعة.</p><div class="grid"><div class="stat"><span>العمال</span><b>'+(typeof workers!=='undefined'?workers.length:0)+'</b></div></div></div>')};

  function boot(){ensureServiceModal();const stale=q('#serviceModalBackdrop');if(stale&&stale.classList.contains('hidden'))stale.style.display='none';cleanServiceCards();injectBars();refreshFbBars();loadFbDropData();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',()=>{setTimeout(boot,700);setTimeout(boot,1800)});
  setInterval(()=>{if(!document.hidden){refreshFbBars();loadFbDropData()}},15000);
})();
