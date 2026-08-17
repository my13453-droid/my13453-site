
(function(){
 async function ensureIdentity(){
   if(window.currentWorkerId) return window.currentWorkerId;
   const {data:{user}}=await db.auth.getUser();
   if(!user) return null;
   const r=await db.from('workers').select('id').eq('user_id',user.id).maybeSingle();
   if(!r.error && r.data){ window.currentWorkerId=r.data.id; return r.data.id; }
   return null;
 }
 window.ensureIdentity=ensureIdentity;

 async function moveLibrary(){
   const page=document.getElementById('workerPage'), services=document.getElementById('workerServices');
   if(!page||!services) return;
   const profile=page.querySelector('.profile-card');
   if(profile && profile.nextElementSibling!==services) profile.insertAdjacentElement('afterend',services);
 }
 window.moveLibrary=moveLibrary;

 window.loadSharedLibrary=async function(box){
   box.innerHTML='<div class="card"><h3>📚 مكتبة العاملين</h3><p class="muted">جارٍ تحميل التعليمات والنماذج المشتركة...</p></div>';
   const r=await db.from('worker_library_files').select('id,title,description,category,file_path,file_name,mime_type,size_bytes,is_published,created_at').eq('is_published',true).order('created_at',{ascending:false});
   if(r.error){box.innerHTML='<div class="card"><p class="error">تعذر تحميل المكتبة: '+esc(r.error.message)+'</p></div>';return;}
   const rows=r.data||[];
   box.innerHTML='<div class="card"><h3>📚 مكتبة العاملين المشتركة</h3><p class="muted">التعليمات والنماذج المنشورة هنا تظهر لجميع العاملين المسجلين.</p><div class="shared-library-grid">'+(rows.length?rows.map(x=>'<div class="shared-file"><b>📄 '+esc(x.title||x.file_name||'مستند')+'</b><div>'+esc(x.description||'')+'</div><div class="meta">'+esc(x.category||'عام')+' — '+esc(x.file_name||'')+'</div><div class="shared-actions"><button onclick="openSharedFile(\''+esc(x.file_path||'')+'\')">👁️ فتح</button></div></div>').join(''):'<p class="muted">لا توجد تعليمات أو نماذج منشورة حاليًا.</p>')+'</div></div>';
 };
 window.openSharedFile=async function(path){
   if(!path){alert('لا يوجد ملف مرفق.');return;}
   const r=await db.storage.from('worker-documents').createSignedUrl(path,3600);
   if(r.error){alert('تعذر فتح الملف: '+r.error.message);return;}
   window.open(r.data.signedUrl,'_blank','noopener');
 };

 window.uploadSharedLibraryFile=async function(){
   const title=document.getElementById('sharedTitle').value.trim(), category=document.getElementById('sharedCategory').value.trim()||'عام', description=document.getElementById('sharedDescription').value.trim(), file=document.getElementById('sharedFile').files?.[0], msg=document.getElementById('sharedAdminMsg');
   if(!title||!file){msg.className='error';msg.textContent='اكتب العنوان واختر الملف.';return;}
   const {data:{user}}=await db.auth.getUser(); if(!user){msg.className='error';msg.textContent='يجب تسجيل الدخول أولاً.';return;}
   const safe=(file.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
   const path='shared/'+Date.now()+'-'+safe;
   msg.className='muted';msg.textContent='جارٍ رفع الملف...';
   const up=await db.storage.from('worker-documents').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
   if(up.error){msg.className='error';msg.textContent='فشل رفع المرفق: '+up.error.message;return;}
   const r=await db.from('worker_library_files').insert({file_path:path,file_name:file.name,mime_type:file.type||null,size_bytes:file.size,uploaded_by:user.id,title,description,category,is_published:true});
   if(r.error){await db.storage.from('worker-documents').remove([path]);msg.className='error';msg.textContent='تم رفع الملف لكن تعذر تسجيله: '+r.error.message;return;}
   msg.className='success';msg.textContent='تم نشر الملف لجميع العاملين بنجاح.';document.getElementById('sharedFile').value='';document.getElementById('sharedTitle').value='';document.getElementById('sharedDescription').value='';refreshAdminSharedLibrary();
 };
 window.refreshAdminSharedLibrary=async function(){
   const box=document.getElementById('adminSharedList');if(!box)return;
   const r=await db.from('worker_library_files').select('id,title,description,category,file_path,file_name,is_published,created_at').order('created_at',{ascending:false});
   if(r.error){box.innerHTML='<p class="error">'+esc(r.error.message)+'</p>';return;}
   box.innerHTML=(r.data||[]).map(x=>'<div class="shared-file"><b>📄 '+esc(x.title||x.file_name)+'</b><div>'+esc(x.description||'')+'</div><div class="meta">'+esc(x.category||'عام')+' — '+esc(x.file_name||'')+'</div><div class="shared-actions"><button onclick="openSharedFile(\''+esc(x.file_path||'')+'\')">👁️ فتح</button><button onclick="toggleSharedPublish(\''+esc(x.id)+'\','+(!x.is_published)+')">'+(x.is_published?'⏸️ إخفاء':'▶️ نشر')+'</button><button class="danger" onclick="deleteSharedLibrary(\''+esc(x.id)+'\',\''+esc(x.file_path||'')+'\')">🗑️ حذف</button></div></div>').join('')||'<p class="muted">لا توجد ملفات.</p>';
 };
 window.toggleSharedPublish=async function(id,val){const r=await db.from('worker_library_files').update({is_published:val}).eq('id',id);if(r.error)alert(r.error.message);else refreshAdminSharedLibrary();};
 window.deleteSharedLibrary=async function(id,path){if(!confirm('حذف هذا الملف من المكتبة؟'))return;const a=await db.storage.from('worker-documents').remove([path]);const r=await db.from('worker_library_files').delete().eq('id',id);if(r.error)alert(r.error.message);else refreshAdminSharedLibrary();};

 // ضمان ظهور المكتبة مباشرة أسفل الملف الشخصي، وليس في أسفل الصفحة.
 const oldEnsure=window.ensureCentralServices;
 window.ensureCentralServices=async function(){ if(oldEnsure) oldEnsure(); setTimeout(moveLibrary,100); setTimeout(moveLibrary,700); };
 window.addEventListener('load',()=>{setTimeout(moveLibrary,900);});

 // إصلاح خدمات العامل حتى تعمل حتى لو لم يتم ضبط currentWorkerId في النسخة القديمة.
 const oldOpen=window.openWorkerService;
 window.openWorkerService=async function(kind){ await ensureIdentity(); return oldOpen?oldOpen(kind):null; };
 const oldSubmit=window.submitLoanRequest;
 window.submitLoanRequest=async function(){ await ensureIdentity(); return oldSubmit?oldSubmit():null; };
 const oldLoadLoans=window.loadMyLoanRequests;
 window.loadMyLoanRequests=async function(){ await ensureIdentity(); return oldLoadLoans?oldLoadLoans():null; };
 const oldChat=window.loadWorkerChat;
 window.loadWorkerChat=async function(box){ await ensureIdentity(); return oldChat?oldChat(box):null; };
 const oldSend=window.sendWorkerChat;
 window.sendWorkerChat=async function(){ await ensureIdentity(); return oldSend?oldSend():null; };
})();
