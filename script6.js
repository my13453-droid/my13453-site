
(function(){
  async function getIdentity(){
    if(window.currentWorkerId) return window.currentWorkerId;
    if(window.ensureIdentity) return await window.ensureIdentity();
    const {data:{user}}=await db.auth.getUser();
    if(!user) return null;
    const r=await db.from('workers').select('id').eq('user_id',user.id).maybeSingle();
    if(!r.error&&r.data){window.currentWorkerId=r.data.id;return r.data.id;}
    return null;
  }
  const oldOpen=window.openWorkerService;
  window.openWorkerService=async function(kind){
    await getIdentity();
    const box=document.getElementById('workerServiceArea');
    if(!box) return;
    if(['home','profile','requests','notifications','announcements','calendar','security'].includes(kind)){
      await renderExtraService(kind,box);
      box.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    if(kind==='attendance'){
      const el=document.getElementById('myAttendance');
      if(el){el.scrollIntoView({behavior:'smooth',block:'start'});loadMyAttendanceTable();}
      return;
    }
    if(kind==='payslip'){
      const el=document.getElementById('myPayslip');
      if(el){loadMyPayslip();el.scrollIntoView({behavior:'smooth',block:'start'});}
      return;
    }
    return oldOpen?oldOpen(kind):null;
  };

  async function renderExtraService(kind,box){
    if(kind==='home'){
      const {data:w}=await db.from('workers').select('full_name,worker_code,department,job_title,email,phone').eq('id',window.currentWorkerId).maybeSingle();
      const {data:notifs}=await db.from('notifications').select('message,created_at,read_at').eq('recipient_worker_id',window.currentWorkerId).order('created_at',{ascending:false}).limit(1);
      const n=notifs?.[0];
      box.innerHTML=`<div class="card"><h3>🏠 الرئيسية الذكية</h3><div class="smart-home"><div class="smart-profile"><div class="service-icon">👤</div><b>${esc(w?.full_name||'—')}</b><span>الكود: ${esc(w?.worker_code||'—')}</span><span>${esc(w?.department||'')} — ${esc(w?.job_title||'')}</span></div><div class="smart-tile"><b>🔔 آخر تنبيه</b><div>${esc(n?.message||'لا توجد تنبيهات جديدة')}</div><small class="muted">${n?.created_at?new Date(n.created_at).toLocaleString('ar-EG'):''}</small></div><div class="smart-tile"><b>🕒 آخر تحديث</b><div>بياناتك الأساسية محفوظة لدى المتابعة المركزية.</div></div></div><div class="quick-actions"><button onclick="openWorkerService('attendance')">📅 سجلي</button><button onclick="openWorkerService('payslip')">💳 المرتب</button><button onclick="openWorkerService('library')">📚 المكتبة</button><button onclick="openWorkerService('notifications')">🔔 الإشعارات</button></div></div>`;
      return;
    }
    if(kind==='profile'){ return; }
    if(kind==='announcements'){
      const r=await db.from('notifications').select('id,message,title,notification_type,created_at,read_at').eq('recipient_worker_id',window.currentWorkerId).eq('notification_type','إعلان عام').order('created_at',{ascending:false}).limit(50);
      if(r.error){box.innerHTML=`<div class="card"><p class="error">تعذر تحميل الإعلانات: ${esc(r.error.message)}</p></div>`;return;}
      box.innerHTML=`<div class="card"><h3>📢 الإعلانات</h3>${(r.data||[]).map(x=>`<div class="shared-file"><b>📢 ${esc(x.title||'إعلان عام')}</b><div>${esc(x.message)}</div><div class="meta">${new Date(x.created_at).toLocaleString('ar-EG')}${x.read_at?'':' — جديد'}</div>${!x.read_at?`<button onclick="markNotificationRead('${esc(x.id)}');openWorkerService('announcements')">✓ تمت القراءة</button>`:''}</div>`).join('')||'<p class="muted">لا توجد إعلانات عامة حاليًا.</p>'}</div>`;
      return;
    }
    if(kind==='requests'){
      box.innerHTML=`<div class="card"><h3>📝 الطلبات الإلكترونية</h3><p class="muted">اختر نوع الطلب وأرسل التفاصيل، ثم تابع حالته من نفس الصفحة.</p><div class="formgrid"><select id="generalRequestType"><option>طلب تحديث بيانات</option><option>طلب مستند</option><option>طلب إفادة</option><option>طلب تعديل بيانات</option><option>طلب آخر</option></select><textarea id="generalRequestNotes" rows="3" placeholder="اكتب تفاصيل الطلب"></textarea></div><button onclick="submitGeneralRequest()">📨 إرسال الطلب</button><p id="generalRequestMsg"></p></div><div class="card"><h3>📋 سجل طلباتي</h3><div id="allMyRequests">جارٍ التحميل...</div></div>`;
      await loadAllMyRequests(); return;
    }
    if(kind==='calendar'){
      const d=new Date();const g=new Intl.DateTimeFormat('ar-EG',{dateStyle:'full'}).format(d);const h=new Intl.DateTimeFormat('ar-EG-u-ca-islamic',{dateStyle:'full'}).format(d);
      box.innerHTML=`<div class="card"><h3>📅 التقويم الإداري</h3><div class="smart-tile"><b>الميلادي</b><div>${g}</div></div><div class="smart-tile"><b>الهجري</b><div>${h}</div></div><div class="smart-tile"><b>💡 تذكير</b><div>راجع بياناتك ومستنداتك قبل المواعيد الإدارية المهمة.</div></div></div>`;return;
    }
    if(kind==='security'){
      const {data:{session}}=await db.auth.getSession();const u=session?.user;const last=u?.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('ar-EG'):'غير متاح';
      box.innerHTML=`<div class="card"><h3>🔐 مركز أمان الحساب</h3><div class="smart-tile"><b>آخر تسجيل دخول</b><div>${last}</div></div><div class="smart-tile"><b>البريد</b><div>${esc(u?.email||'—')}</div></div><button onclick="showWorkerSecurityPassword()">🔑 تغيير كلمة المرور</button><button class="secondary" onclick="signOutOtherSessions()">🚪 تسجيل الخروج من الأجهزة الأخرى</button><p id="securityMsg" class="muted">إذا كان MFA مفعّلًا على حسابك فسيظل مطلوبًا وفق إعدادات Supabase.</p></div>`;return;
    }
  }

  window.saveMyProfile=async function(){
    const phone=document.getElementById('selfPhone')?.value.trim()||'',email=document.getElementById('selfEmail')?.value.trim()||'',msg=document.getElementById('selfProfileMsg');
    if(email && !/^\S+@\S+\.\S+$/.test(email)){msg.className='error';msg.textContent='اكتب بريدًا إلكترونيًا صحيحًا.';return;}
    const r=await db.from('workers').update({phone,email}).eq('id',window.currentWorkerId);
    if(r.error){msg.className='error';msg.textContent='تعذر تحديث البيانات: '+r.error.message;return;}
    const w=workers.find(x=>x.id===window.currentWorkerId);if(w){w.phone=phone;w.email=email;}msg.className='success';msg.textContent='تم تحديث بياناتك بنجاح.';
  };
  window.loadServiceNotifications=async function(){
    const b=document.getElementById('workerServiceNotifications');if(!b||!window.currentWorkerId)return;
    const r=await db.from('notifications').select('id,message,created_at,read_at').eq('recipient_worker_id',window.currentWorkerId).order('created_at',{ascending:false}).limit(50);
    if(r.error){b.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return;}
    b.innerHTML=(r.data||[]).map(n=>`<div class="shared-file"><b>${n.read_at?'🔔':'🆕'} إشعار</b><div>${esc(n.message)}</div><div class="meta">${new Date(n.created_at).toLocaleString('ar-EG')}</div>${!n.read_at?`<button onclick="markNotificationRead('${esc(n.id)}');loadServiceNotifications()">✓ تمت القراءة</button>`:''}</div>`).join('')||'<p class="muted">لا توجد إشعارات.</p>';
  };
  window.submitGeneralRequest=async function(){
    const type=document.getElementById('generalRequestType')?.value,notes=document.getElementById('generalRequestNotes')?.value.trim(),msg=document.getElementById('generalRequestMsg');
    if(!type||!notes){msg.className='error';msg.textContent='اختر نوع الطلب واكتب التفاصيل.';return;}
    const r=await db.from('financial_requests').insert({worker_id:window.currentWorkerId,request_type:type,amount:0,reason:type,notes,status:'قيد المراجعة'});
    if(r.error){msg.className='error';msg.textContent='تعذر إرسال الطلب: '+r.error.message;return;}
    msg.className='success';msg.textContent='تم إرسال الطلب بنجاح.';document.getElementById('generalRequestNotes').value='';loadAllMyRequests();
  };
  window.loadAllMyRequests=async function(){
    const b=document.getElementById('allMyRequests');if(!b||!window.currentWorkerId)return;
    const r=await db.from('financial_requests').select('id,request_type,amount,status,notes,admin_notes,created_at').eq('worker_id',window.currentWorkerId).order('created_at',{ascending:false}).limit(50);
    if(r.error){b.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return;}
    b.innerHTML=(r.data||[]).map(x=>`<div class="shared-file"><b>📝 ${esc(x.request_type||'طلب')}</b><span class="req-status ${x.status==='مقبول'?'req-approved':x.status==='مرفوض'?'req-rejected':'req-pending'}">${esc(x.status||'قيد المراجعة')}</span><div>${esc(x.notes||'')}</div><div class="meta">رقم الطلب: ${esc(x.id)} — ${new Date(x.created_at).toLocaleString('ar-EG')}</div>${x.admin_notes?`<div class="muted">رد الإدارة: ${esc(x.admin_notes)}</div>`:''}</div>`).join('')||'<p class="muted">لا توجد طلبات.</p>';
  };
  window.showWorkerSecurityPassword=function(){
    const b=document.getElementById('workerServiceArea');if(!b)return;
    b.innerHTML+=`<div class="card"><h3>🔑 تغيير كلمة المرور</h3><input id="svcNewPass" type="password" placeholder="كلمة المرور الجديدة"><input id="svcNewPass2" type="password" placeholder="تأكيد كلمة المرور"><button onclick="saveServicePassword()">💾 حفظ</button><p id="svcPassMsg"></p></div>`;
  };
  window.saveServicePassword=async function(){
    const p=document.getElementById('svcNewPass')?.value||'',p2=document.getElementById('svcNewPass2')?.value||'',m=document.getElementById('svcPassMsg');
    if(p.length<8){m.className='error';m.textContent='استخدم كلمة مرور من 8 أحرف على الأقل.';return}if(p!==p2){m.className='error';m.textContent='كلمتا المرور غير متطابقتين.';return}
    const r=await db.auth.updateUser({password:p});if(r.error){m.className='error';m.textContent='تعذر تغيير كلمة المرور: '+r.error.message;return}m.className='success';m.textContent='تم تغيير كلمة المرور بنجاح.';
  };
  window.signOutOtherSessions=async function(){
    const m=document.getElementById('securityMsg');try{const r=await db.auth.signOut({scope:'others'});if(r.error)throw r.error;m.className='success';m.textContent='تم تسجيل الخروج من الجلسات الأخرى.';}catch(e){m.className='error';m.textContent='تعذر إنهاء الجلسات الأخرى: '+(e?.message||e);}
  };

  window.adminGeneralAnnouncement=async function(){
    const box=document.getElementById('adminServiceArea');if(!box)return;
    box.innerHTML=`<div class="card"><h3>📢 نشر إعلان عام</h3><textarea id="generalAnnouncementText" rows="4" placeholder="اكتب الإعلان الذي سيظهر لجميع العاملين..."></textarea><button onclick="sendGeneralAnnouncement()">📢 نشر الإعلان</button><p id="generalAnnouncementMsg"></p></div>`;
  };
  window.sendGeneralAnnouncement=async function(){
    const text=document.getElementById('generalAnnouncementText')?.value.trim(),m=document.getElementById('generalAnnouncementMsg');if(!text){m.className='error';m.textContent='اكتب نص الإعلان.';return}
    const rows=(workers||[]).map(w=>({recipient_worker_id:w.id,message:text}));if(!rows.length){m.className='error';m.textContent='لا توجد عمالة مسجلة.';return}
    const r=await db.from('notifications').insert(rows);if(r.error){m.className='error';m.textContent='تعذر نشر الإعلان: '+r.error.message;return}m.className='success';m.textContent=`تم نشر الإعلان لـ ${rows.length} عامل.`;document.getElementById('generalAnnouncementText').value='';
  };
  window.adminOverview=async function(){
    const box=document.getElementById('adminServiceArea');if(!box)return;box.innerHTML='<div class="card"><h3>📊 ملخص المتابعة المركزية</h3><p>جارٍ التحميل...</p></div>';
    const [docs,reqs,notifs]=await Promise.all([
      db.from('worker_documents').select('id,status',{count:'exact',head:true}).eq('status','قيد المراجعة'),
      db.from('financial_requests').select('id,status',{count:'exact',head:true}).eq('status','قيد المراجعة'),
      db.from('notifications').select('id,read_at',{count:'exact',head:true}).is('read_at',null)
    ]);
    box.innerHTML=`<div class="card"><h3>📊 ملخص المتابعة المركزية</h3><div class="grid"><div class="stat"><span>إجمالي العمال</span><b>${workers.length}</b></div><div class="stat"><span>مستندات تحتاج مراجعة</span><b>${docs.count??'—'}</b></div><div class="stat"><span>طلبات قيد المراجعة</span><b>${reqs.count??'—'}</b></div><div class="stat"><span>تنبيهات غير مقروءة</span><b>${notifs.count??'—'}</b></div></div><p class="muted">استخدم أقسام المستندات والتنبيهات والسلف والمحادثات لإدارة التفاصيل.</p></div>`;
  };
})();
