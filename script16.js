
(function(){
const names={national_id_front:'الرقم القومي — أمام',national_id_back:'الرقم القومي — خلف',customs_permit:'التصريح الجمركي',introduction_letter:'وثيقة التعارف',other:'مستندات أخرى'};
const stat={national_id_front:'v15s1',national_id_back:'v15s2',customs_permit:'v15s3',introduction_letter:'v15s4',other:'v15s5'};
const folders={national_id_front:'الرقم_القومي/أمام',national_id_back:'الرقم_القومي/خلف',customs_permit:'التصريح_الجمركي',introduction_letter:'وثيقة_التعارف',other:'مستندات_أخرى'};

const getAuthUser=async()=>{
  if(!window.db) throw new Error('قاعدة البيانات غير متاحة.');
  const r=await db.auth.getUser();
  if(r.error) throw r.error;
  const u=r.data?.user;
  if(!u) throw new Error('جلسة الدخول غير صالحة. أعد تسجيل الدخول ثم حاول مرة أخرى.');
  return u;
};

/* مهم: نستخدم user_id المرتبط بالحساب بدل currentWorkerId إذا كان مختلفًا. */
const getWorkerId=async()=>{
  const u=await getAuthUser();
  const r=await db.from('workers').select('id').eq('user_id',u.id).maybeSingle();
  if(r.error) throw r.error;
  if(r.data?.id) return {user:u,workerId:r.data.id};
  if(window.currentWorkerId) return {user:u,workerId:window.currentWorkerId};
  throw new Error('لم يتم العثور على سجل العامل المرتبط بحساب الدخول.');
};

const say=(t,ok)=>{
  const e=document.getElementById('v15Msg');
  if(e){e.textContent=t;e.className='v15-msg show '+(ok?'ok':'err');}
};

async function loadExisting(){
  const box=document.getElementById('v15Existing');
  if(!box||!window.db) return;
  try{
    const {workerId}=await getWorkerId();
    const r=await db.rpc('get_my_worker_documents');
    if(r.error) throw r.error;
    const rows=(r.data||[]);

    Object.keys(stat).forEach(k=>{
      const el=document.getElementById(stat[k]);
      if(el) el.textContent=rows.some(x=>x.document_type===k || (k==='customs_permit' && x.document_type==='access_permit'))?'مرفوع مسبقًا ✓':'لم يتم الرفع';
    });

    if(!rows.length){
      box.innerHTML='<span style="color:#6b7280">لا توجد مستندات محفوظة حتى الآن.</span>';
      return;
    }

    box.innerHTML=rows.map(x=>
      '<div class="v15-row">'+
      '<span><b style="color:#123b58">📄 '+(x.file_name||names[x.document_type]||(x.document_type==='access_permit'?'التصريح الجمركي':'مستند'))+'</b>'+ 
      '<small style="display:block;color:#198754;font-weight:800;margin-top:4px">✅ تم رفعه وحفظه في حسابك</small>'+ 
      (x.uploaded_at?'<small style="display:block;color:#6b7280;margin-top:3px">تاريخ الرفع: '+new Date(x.uploaded_at).toLocaleString('ar-EG')+'</small>':'')+
      (x.status?'<small style="display:block;color:#6b7280;margin-top:3px">الحالة: '+x.status+'</small>':'')+
      '</span>'+
      '<button class="v15-view" type="button" data-p="'+encodeURIComponent(x.file_path||'')+'">👁️ عرض</button>'+
      '</div>'
    ).join('');

    box.querySelectorAll('.v15-view').forEach(b=>b.onclick=async()=>{
      try{
        const path=decodeURIComponent(b.dataset.p||'');
        const u=await db.storage.from('worker-documents').createSignedUrl(path,600);
        if(u.error) throw u.error;
        window.open(u.data.signedUrl,'_blank','noopener');
      }catch(e){say('تعذر فتح المستند: '+(e.message||e),false);}
    });
  }catch(e){
    box.innerHTML='<span style="color:#a61b1b">تعذر تحميل مستنداتك السابقة: '+(e.message||e)+'</span>';
  }
}

async function open(){
  const o=document.getElementById('v15DocsOverlay');
  if(!o)return;
  o.classList.add('v15-show');
  await loadExisting();
}
window.openV15Docs=open;
window.closeV15Docs=()=>document.getElementById('v15DocsOverlay')?.classList.remove('v15-show');

async function upload(i){
  const f=i.files?.[0],type=i.dataset.v15;
  if(!f||!type)return;

  try{
    const {user,workerId}=await getWorkerId();
    say('جاري رفع المستند...',true);

    const clean=(f.name||'document').replace(/[^\w\u0600-\u06FF.\- ]/g,'_');
    const safeType=String(type||'other').replace(/[^a-zA-Z0-9_-]/g,'_');
    const safeName=clean.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=user.id+'/documents/'+safeType+'-'+Date.now()+'_'+safeName;

    /* الرفع في Storage يتم داخل مجلد UUID الخاص بالحساب، وهو المسار المسموح به في RLS. */
    const up=await db.storage.from('worker-documents').upload(path,f,{
      upsert:false,
      contentType:f.type||'application/octet-stream'
    });
    if(up.error) throw up.error;

    const dbType = type==='customs_permit' ? 'access_permit' : type;
    const ins=await db.from('worker_documents').insert({
      worker_id:workerId,
      document_type:dbType,
      file_path:path,
      file_name:f.name,
      mime_type:f.type||null,
      status:'pending'
    });

    if(ins.error){
      await db.storage.from('worker-documents').remove([path]);
      throw ins.error;
    }

    i.value='';
    say('تم حفظ المستند بنجاح، وسيظهر الآن ضمن «مستنداتي السابقة».',true);
    await loadExisting();
  }catch(e){
    i.value='';
    say('تعذر إرفاق المستند: '+(e.message||e),false);
  }
}

function tile(){
  document.querySelectorAll('#workerServices .service-grid,#workerServices .service-grid-strong').forEach(g=>{
    g.querySelectorAll('.v9-mydocs-tile,.v10-docs-tile,.v12-only-docs,.v15-docs-tile').forEach(e=>e.remove());
    let t=document.createElement('div');
    t.className='service-card v15-docs-tile';
    t.innerHTML='<div class="service-icon">📁</div><h3>مستنداتي</h3><p>الرقم القومي والتصريح الجمركي ووثيقة التعارف ومستنداتك الخاصة.</p><button type="button">📁 فتح مستنداتي</button>';
    t.querySelector('button').onclick=open;
    g.prepend(t);
  });
}

function boot(){tile();setTimeout(tile,500);setTimeout(tile,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('load',boot);
document.addEventListener('change',e=>{if(e.target.matches('#v15DocsOverlay [data-v15]'))upload(e.target)});
document.addEventListener('click',e=>{if(e.target.id==='v15DocsOverlay')window.closeV15Docs()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.closeV15Docs()});
})();
