
(function(){
  const originalShowTab = window.showTab;
  const originalLoadWorker = window.loadWorker;
  const originalLoadAdmin = window.loadAdmin;

  function serviceShell(){
    return `
      <div id="workerServices" class="card">
        <h2>🧰 خدمات العاملين</h2>
        
        <div class="service-grid service-grid-strong">
          <div class="service-card"><div class="service-icon">🏠</div><h3>الرئيسية الذكية</h3><p>ملخص سريع لبياناتك وآخر تنبيه والخدمات الأكثر استخدامًا.</p><button onclick="openWorkerService('home')">🏠 فتح</button></div>
<div class="service-card"><div class="service-icon">📅</div><h3>سجلي</h3><p>عرض الشهر يومًا بيوم من 1 إلى 31 بدون عرض الغياب أو المأموريات.</p><button onclick="openWorkerService('attendance')">📅 فتح السجل</button></div>
          <div class="service-card"><div class="service-icon">💳</div><h3>مفردات المرتب</h3><p>عرض وطباعة مفردات المرتب الشهرية بتصميم منظم.</p><button onclick="openWorkerService('payslip')">💳 عرض</button></div>
          <div class="service-card personal-docs-service"><div class="service-icon">📁</div><h3>مستنداتي</h3><p>ملفاتك ومستنداتك الشخصية في فولدر خاص بك، لا تظهر للعاملين الآخرين.</p><button onclick="openWorkerService('mydocs')">📁 فتح مستنداتي</button></div>
          <div class="service-card"><div class="service-icon">📚</div><h3>مكتبة المرفقات</h3><p>تعليمات ونماذج وملفات مشتركة تظهر لجميع العاملين.</p><button onclick="openWorkerService('library')">📂 فتح المكتبة</button></div>
          <div class="service-card"><div class="service-icon">📝</div><h3>طلباتي</h3><p>متابعة الطلبات الإلكترونية وحالاتها وأرقامها وتواريخها.</p><button onclick="openWorkerService('requests')">📝 فتح الطلبات</button></div>
          <div class="service-card"><div class="service-icon">💰</div><h3>السلفة المالية</h3><p>طلب سلفة بالمبلغ فقط ومتابعة القرار حتى الصرف.</p><button onclick="openWorkerService('loan')">➕ طلب سلفة</button></div>
          <div class="service-card"><div class="service-icon">💬</div><h3>تحدث مع المتابعة</h3><p>محادثة مباشرة مع المتابعة المركزية ومتابعة الردود.</p><button onclick="openWorkerService('chat')">💬 بدء محادثة</button></div>
          <div class="service-card worker-peer-chat-card"><div class="service-icon">📁</div><h3>تواصل العاملين</h3><p>فولدر خاص للدردشة مع زملائك من نفس الإدارة ونفس النوع فقط.</p><button onclick="openWorkerService('peerchat')">📁 فتح فولدر التواصل</button></div>
          <div class="service-card"><div class="service-icon">🔔</div><h3>الإشعارات</h3><p>كل التنبيهات مع إمكانية وضع علامة تمت القراءة.</p><button onclick="openWorkerService('notifications')">🔔 عرض</button></div>
          <div class="service-card"><div class="service-icon">📢</div><h3>الإعلانات</h3><p>الإعلانات والتعليمات العامة المنشورة للعاملين.</p><button onclick="openWorkerService('announcements')">📢 عرض</button></div>
          <div class="service-card"><div class="service-icon">📅</div><h3>التقويم الإداري</h3><p>تاريخ اليوم ومواعيد مهمة وتذكيرات إدارية.</p><button onclick="openWorkerService('calendar')">📅 فتح التقويم</button></div>
          <div class="service-card"><div class="service-icon">🔐</div><h3>مركز الأمان</h3><p>آخر تسجيل دخول وتغيير كلمة المرور وإنهاء الجلسات الأخرى.</p><button onclick="openWorkerService('security')">🛡️ تأمين الحساب</button></div>
        </div>
        <div id="workerServiceArea"></div>
      </div>`;
  }

  function adminShell(){
    return `
      <div id="centralAdminServices" class="card">
        <h2>🧰 خدمات العاملين — الإدارة</h2>
        <div class="service-grid">
          <div class="service-card"><div class="service-icon">📚</div><h3>مكتبة العاملين المشتركة</h3><p>رفع تعليمات التشغيل والنماذج والمستندات التي تظهر لجميع العاملين.</p><button onclick="adminSharedLibrary()">📚 إدارة المكتبة</button></div>
          <div class="service-card"><div class="service-icon">💰</div><h3>طلبات السلف</h3><p>مراجعة الطلبات وتحديد الحالة والملاحظات.</p><button onclick="adminLoanRequests()">💰 مراجعة الطلبات</button></div>
          <div class="service-card"><div class="service-icon">💬</div><h3>محادثات العاملين</h3><p>استقبال استفسارات العاملين والرد عليها.</p><button onclick="adminChatCenter()">💬 فتح المحادثات</button></div>
          <div class="service-card"><div class="service-icon">📢</div><h3>إعلان للجميع</h3><p>نشر إعلان عام لجميع العاملين المسجلين.</p><button onclick="adminGeneralAnnouncement()">📢 نشر إعلان</button></div>
          <div class="service-card"><div class="service-icon">📊</div><h3>ملخص المتابعة</h3><p>عدد الطلبات والمستندات والتنبيهات غير المقروءة وآخر العمليات.</p><button onclick="adminOverview()">📊 عرض الملخص</button></div>
        </div>
        <div id="adminServiceArea" style="margin-top:14px"></div>
      </div>`;
  }

  function ensureWorkerServices(){
    const page=document.getElementById("workerPage");
    if(!page || document.getElementById("workerServices")) return;
    const holder=document.createElement("div");
    holder.innerHTML=serviceShell();
    // Put services immediately after the profile/personal-data card.
    const cards=[...page.querySelectorAll(".card")];
    const profileCard=cards.find(c=>/الملف الشخصي|البيانات الشخصية|معلومات العامل/.test(c.innerText||""));
    if(profileCard && profileCard.parentNode){
      profileCard.parentNode.insertBefore(holder, profileCard.nextSibling);
    }else{
      const first=page.firstElementChild;
      page.insertBefore(holder, first?.nextSibling || null);
    }
  }
  function ensureAdminServices(){
    const home=document.getElementById("home");
    if(!home || document.getElementById("centralAdminServices")) return;
    const holder=document.createElement("div");
    holder.innerHTML=adminShell();
    home.appendChild(holder);
  }

  window.openWorkerService=async function(kind){
    const box=document.getElementById("workerServiceArea"); if(!box)return;
    if(kind==="library") { await loadSharedLibrary(box); box.scrollIntoView({behavior:"smooth",block:"start"}); return; }
    if(kind==="loan") { renderLoanForm(box); box.scrollIntoView({behavior:"smooth",block:"start"}); return; }
    if(kind==="chat") { await loadWorkerChat(box); box.scrollIntoView({behavior:"smooth",block:"start"}); return; }
  };

  window.loadSharedLibrary=async function(box){
    box.innerHTML='<div class="card"><h3>📚 مكتبة العاملين</h3><p class="muted">جارٍ تحميل التعليمات والنماذج المشتركة...</p></div>';
    const r=await db.from("shared_library").select("id,title,description,category,file_path,file_name,file_url,created_at").eq("is_published",true).order("created_at",{ascending:false});
    if(r.error){box.innerHTML=`<div class="card"><p class="error">تعذر تحميل المكتبة: ${esc(r.error.message)}<br><small>إذا كان هذا أول تشغيل، طبّق ملف إعداد Supabase المرفق مع النسخة.</small></p></div>`;return;}
    const rows=r.data||[];
    box.innerHTML=`<div class="card"><h3>📚 مكتبة العاملين المشتركة</h3><p class="muted">هذه المكتبة مشتركة وتظهر لجميع العاملين المسجلين، وليست مرتبطة بعامل محدد.</p>
      <div class="shared-library-grid">${rows.length?rows.map(x=>`<div class="shared-file"><b>📄 ${esc(x.title)}</b><div>${esc(x.description||"")}</div><div class="meta">${esc(x.category||"عام")} — ${x.created_at?new Date(x.created_at).toLocaleString("ar-EG"):""}</div><div class="shared-actions"><button onclick="openSharedFile('${esc(x.id)}','${esc(x.file_path||"")}','${esc(x.file_url||"")}')">👁️ فتح</button></div></div>`).join(""):"<p class='muted'>لا توجد تعليمات أو نماذج منشورة حاليًا.</p>"}</div></div>`;
  };

  window.openSharedFile=async function(id,path,url){
    if(url){window.open(url,"_blank","noopener");return;}
    if(!path){alert("لا يوجد ملف مرفق.");return;}
    const r=await db.storage.from("worker-documents").createSignedUrl(path,600);
    if(r.error){alert("تعذر فتح الملف: "+r.error.message);return;}
    window.open(r.data.signedUrl,"_blank","noopener");
  };

  window.renderLoanForm=function(box){
    box.innerHTML=`<div class="card"><h3>💰 طلب سلفة مالية</h3><p class="muted">أدخل المبلغ المطلوب فقط، وسيتم تسجيل الطلب للمتابعة المركزية.</p><div class="formgrid"><input id="loanAmount" type="number" min="1" step="1" placeholder="💵 المبلغ بالجنيه"></div><button onclick="submitLoanRequest()">📨 إرسال الطلب</button><p id="loanMsg"></p></div><div class="card"><h3>📋 طلباتي السابقة</h3><div id="myLoanRequests">جارٍ التحميل...</div></div>`;loadMyLoanRequests();
  };
  window.submitLoanRequest=async function(){const amount=Number(document.getElementById("loanAmount")?.value||0),msg=document.getElementById("loanMsg");if(!amount||amount<=0){msg.className="error";msg.textContent="حدد مبلغًا صحيحًا.";return}const r=await db.from("financial_requests").insert({worker_id:window.currentWorkerId,request_type:"سلفة مالية",amount,reason:"",notes:"",status:"قيد المراجعة"});if(r.error){msg.className="error";msg.textContent="تعذر إرسال الطلب: "+r.error.message;return}msg.className="success";msg.textContent="تم إرسال طلب السلفة بنجاح.";document.getElementById("loanAmount").value="";loadMyLoanRequests()};
  window.loadMyLoanRequests=async function(){const box=document.getElementById("myLoanRequests");if(!box||!window.currentWorkerId)return;const r=await db.from("financial_requests").select("id,amount,status,admin_notes,created_at").eq("worker_id",window.currentWorkerId).eq("request_type","سلفة مالية").order("created_at",{ascending:false}).limit(30);if(r.error){box.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return}box.innerHTML=(r.data||[]).map(x=>`<div class="shared-file"><b>${fmtMoney(x.amount)}</b> <span class="req-status ${x.status==="مقبول"?"req-approved":x.status==="مرفوض"?"req-rejected":"req-pending"}">${esc(x.status||"قيد المراجعة")}</span><div class="meta">${new Date(x.created_at).toLocaleString("ar-EG")}</div>${x.admin_notes?`<div class="muted">رد الإدارة: ${esc(x.admin_notes)}</div>`:""}</div>`).join("")||"<p class='muted'>لا توجد طلبات سابقة.</p>"};

  window.loadWorkerChat=async function(box){
    box.innerHTML=`<div class="card"><h3>💬 التحدث إلى الأدمن</h3><div id="workerChatMessages" class="admin-chat">جارٍ تحميل المحادثة...</div><textarea id="workerChatText" rows="3" placeholder="اكتب رسالتك للأدمن..."></textarea><button onclick="sendWorkerChat()">📨 إرسال</button><p id="workerChatMsg"></p></div>`;
    await refreshWorkerChat();
  };
  window.refreshWorkerChat=async function(){
    const box=document.getElementById("workerChatMessages");if(!box||!window.currentWorkerId)return;
    const r=await db.from("admin_messages").select("id,sender_type,message,created_at").eq("worker_id",window.currentWorkerId).order("created_at",{ascending:true}).limit(100);
    if(r.error){box.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return;}
    box.innerHTML=(r.data||[]).map(x=>`<div class="chat-msg ${x.sender_type==="admin"?"admin":"worker"}"><b>${x.sender_type==="admin"?"👨‍💼 الأدمن":"👤 أنت"}</b><div>${esc(x.message)}</div><small class="muted">${new Date(x.created_at).toLocaleString("ar-EG")}</small></div>`).join("")||"<p class='muted'>ابدأ المحادثة برسالة جديدة.</p>";
    box.scrollTop=box.scrollHeight;
  };
  window.sendWorkerChat=async function(){
    const text=document.getElementById("workerChatText")?.value.trim(),msg=document.getElementById("workerChatMsg");if(!text)return;
    const r=await db.from("admin_messages").insert({worker_id:window.currentWorkerId,sender_type:"worker",message:text});
    if(r.error){msg.className="error";msg.textContent="تعذر إرسال الرسالة: "+r.error.message;return;}
    document.getElementById("workerChatText").value="";msg.className="success";msg.textContent="تم إرسال الرسالة.";refreshWorkerChat();
  };

  window.adminSharedLibrary=async function(){
    const box=document.getElementById("adminServiceArea");if(!box)return;
    box.innerHTML=`<div class="card"><h3>📚 إدارة مكتبة العاملين</h3><div class="formgrid"><input id="sharedTitle" placeholder="عنوان المستند / النموذج"><input id="sharedCategory" placeholder="التصنيف: تعليمات / نموذج / إعلان"><input id="sharedFile" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></div><textarea id="sharedDescription" rows="3" placeholder="وصف مختصر"></textarea><button onclick="uploadSharedLibraryFile()">⬆️ نشر في المكتبة للجميع</button><p id="sharedAdminMsg"></p></div><div class="card"><h3>📋 الملفات المنشورة</h3><div id="adminSharedList">جارٍ التحميل...</div></div>`;
    refreshAdminSharedLibrary();
  };
  window.uploadSharedLibraryFile=async function(){
    const title=document.getElementById("sharedTitle").value.trim(),category=document.getElementById("sharedCategory").value.trim()||"عام",description=document.getElementById("sharedDescription").value.trim(),file=document.getElementById("sharedFile").files?.[0],msg=document.getElementById("sharedAdminMsg");
    if(!title||!file){msg.className="error";msg.textContent="اكتب العنوان واختر الملف.";return;}
    if(file.size>20*1024*1024){msg.className="error";msg.textContent="حجم الملف لا يتجاوز 20 ميجابايت.";return;}
    const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin",path=`shared/${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}.${ext}`;
    msg.className="muted";msg.textContent="جارٍ الرفع...";
    const up=await db.storage.from("worker-documents").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});
    if(up.error){msg.className="error";msg.textContent="تعذر رفع الملف: "+up.error.message;return;}
    const r=await db.from("shared_library").insert({title,description,category,file_path:path,file_name:file.name,is_published:true});
    if(r.error){await db.storage.from("worker-documents").remove([path]);msg.className="error";msg.textContent="تم رفع الملف لكن تعذر تسجيله: "+r.error.message;return;}
    msg.className="success";msg.textContent="تم نشر الملف لجميع العاملين.";document.getElementById("sharedTitle").value="";document.getElementById("sharedDescription").value="";document.getElementById("sharedFile").value="";refreshAdminSharedLibrary();
  };
  window.refreshAdminSharedLibrary=async function(){
    const box=document.getElementById("adminSharedList");if(!box)return;
    const r=await db.from("shared_library").select("id,title,description,category,file_path,file_name,is_published,created_at").order("created_at",{ascending:false});
    if(r.error){box.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return;}
    box.innerHTML=(r.data||[]).map(x=>`<div class="shared-file"><b>📄 ${esc(x.title)}</b><div>${esc(x.description||"")}</div><div class="meta">${esc(x.category||"عام")} — ${esc(x.file_name||"")}</div><div class="shared-actions"><button onclick="openSharedFile('${esc(x.id)}','${esc(x.file_path||"")}','')">👁️ فتح</button><button class="${x.is_published?"secondary":""}" onclick="toggleSharedPublish('${esc(x.id)}',${!x.is_published})">${x.is_published?"⏸️ إخفاء":"▶️ نشر"}</button><button class="danger" onclick="deleteSharedLibrary('${esc(x.id)}','${esc(x.file_path||"")}')">🗑️ حذف</button></div></div>`).join("")||"<p class='muted'>لا توجد ملفات.</p>";
  };
  window.toggleSharedPublish=async function(id,val){const r=await db.from("shared_library").update({is_published:val}).eq("id",id);if(r.error)alert(r.error.message);else refreshAdminSharedLibrary();};
  window.deleteSharedLibrary=async function(id,path){if(!confirm("حذف هذا الملف من المكتبة؟"))return;await db.storage.from("worker-documents").remove([path]);const r=await db.from("shared_library").delete().eq("id",id);if(r.error)alert(r.error.message);else refreshAdminSharedLibrary();};

  window.adminLoanRequests=async function(){
    const box=document.getElementById("adminServiceArea");if(!box)return;
    box.innerHTML=`<div class="card"><h3>💰 طلبات السلف المالية</h3><div id="adminLoanList">جارٍ التحميل...</div></div>`;
    const r=await db.from("financial_requests").select("id,worker_id,amount,status,admin_notes,created_at,workers(full_name,worker_code)").eq("request_type","سلفة مالية").order("created_at",{ascending:false}).limit(100);
    const list=document.getElementById("adminLoanList");
    if(r.error){list.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return;}
    list.innerHTML=(r.data||[]).map(x=>`<div class="shared-file"><b>👤 ${esc(x.workers?.full_name||"—")} — ${esc(x.workers?.worker_code||"")}</b><div style="margin-top:7px"><b>المبلغ: ${fmtMoney(x.amount)}</b></div><div class="meta">${new Date(x.created_at).toLocaleString("ar-EG")}</div>${x.notes?`<div>${esc(x.notes)}</div>`:""}<div class="formgrid"><select id="loanSt-${esc(x.id)}"><option ${x.status==="قيد المراجعة"?"selected":""}>قيد المراجعة</option><option ${x.status==="مقبول"?"selected":""}>مقبول</option><option ${x.status==="مرفوض"?"selected":""}>مرفوض</option></select><input id="loanNote-${esc(x.id)}" value="${esc(x.admin_notes||"")}" placeholder="ملاحظة الإدارة"></div><button onclick="updateLoanRequest('${esc(x.id)}')">💾 حفظ قرار الإدارة</button></div>`).join("")||"<p class='muted'>لا توجد طلبات.</p>";
  };
  window.updateLoanRequest=async function(id){const status=document.getElementById("loanSt-"+id).value,admin_notes=document.getElementById("loanNote-"+id).value.trim();const r=await db.from("financial_requests").update({status,admin_notes,updated_at:new Date().toISOString()}).eq("id",id);if(r.error)alert("تعذر تحديث الطلب: "+r.error.message);else adminLoanRequests();};

  window.adminChatCenter=async function(){
    const box=document.getElementById("adminServiceArea");if(!box)return;
    box.innerHTML=`<div class="card"><h3>💬 محادثات العاملين</h3><select id="adminChatWorker" onchange="refreshAdminChat()"><option value="">اختر العامل...</option>${(workers||[]).map(w=>`<option value="${esc(w.id)}">${esc(w.worker_code)} — ${esc(w.full_name)}</option>`).join("")}</select><div id="adminChatMessages" class="admin-chat">اختر عاملًا.</div><textarea id="adminChatText" rows="3" placeholder="اكتب الرد..."></textarea><button onclick="sendAdminChat()">📨 إرسال الرد</button><p id="adminChatMsg"></p></div>`;
  };
  window.refreshAdminChat=async function(){
    const wid=document.getElementById("adminChatWorker")?.value,box=document.getElementById("adminChatMessages");if(!wid||!box){return;}
    const r=await db.from("admin_messages").select("id,sender_type,message,created_at").eq("worker_id",wid).order("created_at",{ascending:true}).limit(100);
    if(r.error){box.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return;}
    box.innerHTML=(r.data||[]).map(x=>`<div class="chat-msg ${x.sender_type==="admin"?"admin":"worker"}"><b>${x.sender_type==="admin"?"👨‍💼 الأدمن":"👤 العامل"}</b><div>${esc(x.message)}</div><small class="muted">${new Date(x.created_at).toLocaleString("ar-EG")}</small></div>`).join("")||"<p class='muted'>لا توجد رسائل.</p>";
    box.scrollTop=box.scrollHeight;
  };
  window.sendAdminChat=async function(){
    const wid=document.getElementById("adminChatWorker")?.value,text=document.getElementById("adminChatText")?.value.trim(),msg=document.getElementById("adminChatMsg");if(!wid||!text){msg.className="error";msg.textContent="اختر العامل واكتب الرد.";return;}
    const r=await db.from("admin_messages").insert({worker_id:wid,sender_type:"admin",message:text});
    if(r.error){msg.className="error";msg.textContent="تعذر إرسال الرد: "+r.error.message;return;}
    document.getElementById("adminChatText").value="";msg.className="success";msg.textContent="تم إرسال الرد.";refreshAdminChat();
  };

  // نضيف الخدمات بعد تحميل الواجهة الأساسية.
  window.addEventListener("load",()=>{
    setTimeout(()=>{ensureWorkerServices();ensureAdminServices();},500);
  });

  // لو تم تسجيل الدخول لاحقًا، نتأكد من وجود الأقسام.
  window.ensureCentralServices=()=>{ensureWorkerServices();ensureAdminServices();};
})();
