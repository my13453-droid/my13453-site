
const SUPABASE_URL="https://ukzxcamswsbduskfglce.supabase.co";
const SUPABASE_KEY="sb_publishable_7FFYm4-Kn4gNCdQQk87TVQ_To-zIKFw";

// تثبيت جلسة الدخول في localStorage.
// تم توحيد storageKey مع المفتاح القياسي لـ Supabase، مع ترحيل المفتاح
// القديم حتى لا يفقد المستخدمون جلساتهم بعد تحديث الموقع.
const SUPABASE_STORAGE_KEY="sb-ukzxcamswsbduskfglce-auth-token";
const LEGACY_STORAGE_KEY="egyptair-central-monitoring-auth";
try{
  const legacy=window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const current=window.localStorage.getItem(SUPABASE_STORAGE_KEY);
  if(legacy && !current) window.localStorage.setItem(SUPABASE_STORAGE_KEY,legacy);
}catch(e){ console.warn("تعذر ترحيل جلسة الدخول:",e); }

const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storage:window.localStorage,
    storageKey:SUPABASE_STORAGE_KEY,
    flowType:"implicit"
  }
});
let workers=[];
let appBooted=false;
let restoringSession=false;

function showTab(id){document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));document.getElementById(id).classList.remove("hidden");if(id==="attendance"){initMonthSelectors();loadMonthlyAttendance();loadMonthlySummary();}if(id==="notificationsAdmin"){loadAdminNotifications();}}

async function login(){
 const identifier=document.getElementById("email").value.trim();
 const password=document.getElementById("password").value;
 const msg=document.getElementById("loginMsg");
 msg.textContent="";
 if(!identifier||!password){msg.className="error";msg.textContent="اكتب البريد الإلكتروني أو رقم الهاتف وكلمة المرور.";return;}
 msg.className="muted";msg.textContent="جارٍ تسجيل الدخول...";
 const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
 const payload=isEmail?{email:identifier,password}:{phone:identifier.replace(/[^0-9+]/g,""),password};
 const {data,error}=await db.auth.signInWithPassword(payload);
 if(error){msg.className="error";msg.textContent="فشل الدخول: "+error.message+(isEmail?"":" — تأكد أن رقم الهاتف مرتبط بحساب Supabase ومفعل للدخول.");return;}
 msg.className="success";msg.textContent="تم تسجيل الدخول بنجاح.";
 await restoreAppSession(data.session);
}
async function loadAdmin(){
 const msg=document.getElementById("adminLoadMsg");
 if(msg){msg.className="muted";msg.textContent="جارٍ تحميل بيانات العاملين...";}
 const {data,error}=await db.from("workers").select("id,worker_code,full_name,department,job_title,phone,email,daily_rate,user_id").order("worker_code");
 if(error){
   if(msg){msg.className="error";msg.textContent="تعذر تحميل البيانات: "+error.message;}
   return;
 }
 workers=data||[];
 renderWorkers();fillWorkerSelect();fillAdminDocWorker();fillNotifyWorker();initMonthSelectors();
 await loadMonthlyAttendance(); await loadMonthlySummary(); await loadStats();
 if(msg){msg.className="success";msg.textContent=`تم تحميل بيانات ${workers.length} عامل.`;}
}
function renderWorkers(){
 const q=(document.getElementById("search")?.value||"").toLowerCase();
 const rows=workers.filter(w=>[(w.full_name||""),(w.worker_code||""),(w.phone||""),(w.email||"")].some(v=>v.toLowerCase().includes(q)));
 document.getElementById("workersBody").innerHTML=rows.length?rows.map(w=>`<tr><td>${esc(w.worker_code)}</td><td><button class="link-name" onclick="showWorkerDays('${esc(w.id)}')"><b>${esc(w.full_name)}</b></button></td><td>${esc(w.department||"")}</td><td>${esc(w.job_title||"")}</td><td>${esc(w.phone||"")}</td><td><b>${fmtMoney(w.daily_rate)}</b> جنيه</td><td><button class="small" onclick="editWorkerName('${esc(w.id)}','${esc(w.full_name||"")}')">✏️ تعديل الاسم</button> <button class="small" onclick="editWorkerRate('${esc(w.id)}','${esc(w.full_name||"")}',${Number(w.daily_rate||0)})">💰 تعديل اليومية</button></td><td><button class="small danger" onclick="deleteWorker('${esc(w.id)}','${esc(w.full_name||"")}')">🗑️ حذف</button></td></tr>`).join(""):"<tr><td colspan='8'>لا توجد نتائج</td></tr>";
}
async function editWorkerName(id,currentName){
 const worker=workers.find(w=>w.id===id);
 const newName=prompt("اكتب الاسم الجديد:",currentName||"");
 if(newName===null)return;
 const name=newName.trim();
 if(!name){alert("الاسم لا يمكن أن يكون فارغًا.");return}
 if(name===currentName)return;
 const {error}=await db.from("workers").update({full_name:name}).eq("id",id);
 if(error){alert("تعذر تعديل الاسم: "+error.message);return}
 if(worker)worker.full_name=name;
 renderWorkers();fillWorkerSelect();fillAdminDocWorker();loadMonthlyAttendance();loadMonthlySummary();
 alert("تم تعديل الاسم بنجاح.");
}
async function editWorkerRate(id,name,current){
 const raw=prompt(`اليومية الحالية لـ ${name}: ${current} جنيه\nاكتب قيمة اليومية الجديدة:`,String(current));
 if(raw===null)return;
 const rate=Number(String(raw).replace(/,/g,"."));
 if(!Number.isFinite(rate)||rate<0){alert("اكتب قيمة يومية صحيحة.");return}
 const {error}=await db.from("workers").update({daily_rate:rate}).eq("id",id);
 if(error){alert("تعذر تعديل اليومية: "+error.message);return}
 const worker=workers.find(w=>w.id===id);
 if(worker)worker.daily_rate=rate;
 renderWorkers();
 await loadMonthlySummary();
 if(window.currentWorkerId===id) await loadWorker();
 alert(`تم تعديل يومية ${name} إلى ${fmtMoney(rate)} جنيه.`);
}
async function deleteWorker(id,name){
 if(!confirm(`هل أنت متأكد من حذف العامل «${name}»؟\nسيتم حذف سجلاته المرتبطة حسب إعدادات قاعدة البيانات.`))return;
 const {error}=await db.from("workers").delete().eq("id",id);
 if(error){alert("تعذر حذف العامل: "+error.message);return;}
 workers=workers.filter(w=>w.id!==id);
 renderWorkers();fillWorkerSelect();fillAdminDocWorker();fillNotifyWorker();loadMonthlyAttendance();loadMonthlySummary();loadStats();
 alert("تم حذف العامل بنجاح.");
}
function fillAdminDocWorker(){const s=document.getElementById("adminDocWorker");if(s)s.innerHTML='<option value="">اختر الاسم...</option>'+workers.map(w=>`<option value="${w.id}">${esc(w.worker_code)} — ${esc(w.full_name)}</option>`).join("");}
function fillWorkerSelect(){
 const options=workers.map(w=>`<option value="${esc(w.id)}">${esc(w.worker_code)} — ${esc(w.full_name)}</option>`).join("");
 const ws=document.getElementById("workerSelect");
 if(ws)ws.innerHTML=options;
 const s=document.getElementById("adminAttendanceWorker");
 if(s){
   const previous=s.value;
   s.innerHTML=`<option value="">اختر اسم العامل...</option>${options}`;
   if(previous && workers.some(w=>w.id===previous)) s.value=previous;
 }
}
function monthName(m){return new Date(2000,m-1,1).toLocaleDateString("ar-EG",{month:"long"});}
function initMonthSelectors(){const now=new Date(),m=now.getMonth()+1,y=now.getFullYear();["adminMonth","myMonth"].forEach(id=>{const s=document.getElementById(id);if(s&&!s.options.length)s.innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===m?"selected":""}>${monthName(i+1)}</option>`).join("")});["adminYear","myYear"].forEach(id=>{const s=document.getElementById(id);if(s&&!s.options.length)s.innerHTML=Array.from({length:5},(_,i)=>{const yy=y-2+i;return `<option value="${yy}" ${yy===y?"selected":""}>${yy}</option>`}).join("")})}
async function addWorker(){
 const msg=document.getElementById("addMsg");
 const row={worker_code:document.getElementById("code").value.trim(),full_name:document.getElementById("name").value.trim(),department:document.getElementById("department").value.trim(),job_title:document.getElementById("job").value.trim(),phone:document.getElementById("phone").value.trim(),email:document.getElementById("workerEmail").value.trim(),daily_rate:Number(document.getElementById("rate").value)||176};
 if(!row.worker_code||!row.full_name){msg.className="error";msg.textContent="الكود والاسم مطلوبان.";return}
 const {error}=await db.from("workers").insert(row);
 if(error){msg.className="error";msg.textContent="لم تتم الإضافة: "+error.message;return}
 msg.className="success";msg.textContent="تمت إضافة الاسم.";document.getElementById("code").value="";document.getElementById("name").value="";document.getElementById("phone").value="";document.getElementById("workerEmail").value="";loadAdmin();
}
async function saveAttendance(){
 const msg=document.getElementById("attMsg");
 const row={worker_id:document.getElementById("workerSelect").value,attendance_date:document.getElementById("attDate").value||new Date().toISOString().slice(0,10),attendance_status:document.getElementById("attStatus").value,notes:document.getElementById("attNotes").value.trim()};
 const {error}=await db.from("attendance").upsert(row,{onConflict:"worker_id,attendance_date"});
 if(error){msg.className="error";msg.textContent="لم يتم الحفظ: "+error.message;return}
 msg.className="success";msg.textContent="تم حفظ الحضور.";loadAttendance();loadStats();
}
async function loadAttendance(){await loadMonthlyAttendance();}
function daysInMonth(year,month){return new Date(year,month,0).getDate();}
async function getMonthAttendance(workerId,year,month){const from=`${year}-${String(month).padStart(2,"0")}-01`,to=`${year}-${String(month).padStart(2,"0")}-${String(daysInMonth(year,month)).padStart(2,"0")}`;return await db.from("attendance").select("id,attendance_date,attendance_status,notes").eq("worker_id",workerId).gte("attendance_date",from).lte("attendance_date",to).order("attendance_date");}
function statusOptions(selected){return ["","حضور","إجازة"].map(x=>`<option value="${x}" ${x===selected?"selected":""}>${x||"—"}</option>`).join("");}
async function loadMonthlyAttendance(){
 const wid=document.getElementById("adminAttendanceWorker")?.value,month=Number(document.getElementById("adminMonth")?.value),year=Number(document.getElementById("adminYear")?.value),box=document.getElementById("monthlyEditor");
 if(!box||!month||!year)return;if(!wid){box.innerHTML="<p class=\"muted\">اختر اسم العامل أولًا لعرض بيانات الحضور.</p>";return;}
 const {data,error}=await getMonthAttendance(wid,year,month);if(error){box.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;}
 const map=Object.fromEntries((data||[]).map(a=>[a.attendance_date,a])),days=daysInMonth(year,month);
 let head='',statusRow='',notesRow='';
 for(let d=1;d<=days;d++){const date=`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`,a=map[date];head+=`<th>${d}</th>`;statusRow+=`<td><select data-date="${date}" class="day-status">${statusOptions(a?.attendance_status||"")}</select></td>`;notesRow+=`<td><input data-note="${date}" class="day-note" value="${esc(a?.notes||"")}" placeholder="—"></td>`;}
 box.innerHTML=`<div class="horizontal-attendance"><div class="scroll"><table class="month-table horizontal-days"><thead><tr><th>البيان</th>${head}</tr></thead><tbody><tr><th>الحالة</th>${statusRow}</tr><tr><th>الملاحظات</th>${notesRow}</tr></tbody></table></div></div><button onclick="saveMonthlyAttendance()">💾 حفظ كل أيام الشهر</button>`;
}
async function saveMonthlyAttendance(){const wid=document.getElementById("adminAttendanceWorker").value,year=Number(document.getElementById("adminYear").value),month=Number(document.getElementById("adminMonth").value),rows=[...document.querySelectorAll(".day-status")].map(x=>({worker_id:wid,attendance_date:x.dataset.date,attendance_status:x.value,notes:document.querySelector(`[data-note="${x.dataset.date}"]`)?.value.trim()||""})),msg=document.getElementById("monthlyMsg");msg.textContent="جارٍ الحفظ...";const {error}=await db.from("attendance").upsert(rows,{onConflict:"worker_id,attendance_date"});if(error){msg.className="error";msg.textContent="تعذر الحفظ: "+error.message;return}msg.className="success";msg.textContent=`تم حفظ شهر ${monthName(month)} ${year}.`;loadMonthlySummary();loadStats();}
async function loadMonthlySummary(){
 const box=document.getElementById("monthlySummary"),month=Number(document.getElementById("adminMonth")?.value),year=Number(document.getElementById("adminYear")?.value);if(!box||!month||!year)return;
 const from=`${year}-${String(month).padStart(2,"0")}-01`,to=`${year}-${String(month).padStart(2,"0")}-${String(daysInMonth(year,month)).padStart(2,"0")}`;
 const r=await db.from("attendance").select("worker_id,attendance_status").gte("attendance_date",from).lte("attendance_date",to);if(r.error){box.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return}
 const by={};(r.data||[]).forEach(a=>{by[a.worker_id]??={حضور:0,إجازة:0};if(a.attendance_status in by[a.worker_id])by[a.worker_id][a.attendance_status]++;});
 box.innerHTML='<div class="scroll"><table class="month-table"><thead><tr><th>الكود</th><th>الاسم</th><th>حضور</th><th>إجازة</th><th>المستحق</th></tr></thead><tbody>'+workers.map(w=>{const x=by[w.id]||{حضور:0,إجازة:0};return `<tr><td>${esc(w.worker_code)}</td><td><button class="link-name" onclick="showWorkerDays('${esc(w.id)}')"><b>${esc(w.full_name)}</b></button></td><td>${x.حضور}</td><td>${x.إجازة}</td><td>${(x.حضور*Number(w.daily_rate||0)).toFixed(2)} جنيه</td></tr>`}).join('')+'</tbody></table></div>';
}
async function loadStats(){
 const today=new Date().toLocaleDateString("en-CA");const {data}=await db.from("attendance").select("attendance_date,attendance_status");const a=data||[];
 const cw=document.getElementById("countWorkers"),cp=document.getElementById("countPresent"),ca=document.getElementById("countAllPresent");
 if(cw)cw.textContent=workers.length;if(cp)cp.textContent=a.filter(x=>x.attendance_date===today&&x.attendance_status==="حضور").length;if(ca)ca.textContent=a.filter(x=>x.attendance_status==="حضور").length;
}
async function loadWorker(){
 const {data:{user}}=await db.auth.getUser();
 const {data:w}=await db.from("workers").select("id,worker_code,full_name,department,job_title,daily_rate").eq("user_id",user.id).maybeSingle();
 if(!w){alert("الحساب غير مربوط بعامل.");return}
 window.currentWorkerId=w.id;
 document.getElementById("myName").textContent=w.full_name||"—";document.getElementById("myCode").textContent=w.worker_code||"—";document.getElementById("myDept").textContent=w.department||"—";document.getElementById("myJob").textContent=w.job_title||"—";
 const {data:a}=await db.from("attendance").select("attendance_date,attendance_status,notes").eq("worker_id",w.id).order("attendance_date",{ascending:true});
 const rows=a||[],p=rows.filter(x=>x.attendance_status==="حضور").length;
 document.getElementById("myPresent").textContent=p;document.getElementById("mySalary").textContent=(p*(Number(w.daily_rate)||0)).toFixed(2);
 initMonthSelectors();
 const am=document.getElementById("myAttMonth"),ay=document.getElementById("myAttYear");
 if(am&&!am.options.length) am.innerHTML=document.getElementById("myMonth").innerHTML;
 if(ay&&!ay.options.length) ay.innerHTML=document.getElementById("myYear").innerHTML;
 if(am) am.value=String(new Date().getMonth()+1); if(ay) ay.value=String(new Date().getFullYear());
 loadMyAttendanceTable();loadMyPayslip();loadMyDocuments();loadMyNotifications();loadProfilePhoto();
}


async function loadMyAttendanceTable(){
 const box=document.getElementById("myAttendance");if(!box||!window.currentWorkerId)return;const month=Number(document.getElementById("myAttMonth")?.value)||new Date().getMonth()+1,year=Number(document.getElementById("myAttYear")?.value)||new Date().getFullYear();
 const r=await getMonthAttendance(window.currentWorkerId,year,month);if(r.error){box.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return;}
 const map=Object.fromEntries((r.data||[]).map(x=>[x.attendance_date,x]));let present=0,leave=0,daysHead='',statusRow='',notesRow='';
 for(let d=1;d<=daysInMonth(year,month);d++){const date=`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`,a=map[date],status=a?.attendance_status||"";if(status==="حضور")present++;else if(status==="إجازة")leave++;daysHead+=`<th>${d}</th>`;statusRow+=`<td><b>${esc(status||"—")}</b></td>`;notesRow+=`<td>${esc(a?.notes||"—")}</td>`;}
 box.innerHTML=`<div class="summary-cards"><div class="stat"><span>حضور</span><b>${present}</b></div><div class="stat"><span>إجازة</span><b>${leave}</b></div><div class="stat"><span>الأيام المستحقة</span><b>${present}</b></div></div><h4>📋 سجلي — ${monthName(month)} ${year}</h4><div class="scroll"><table class="month-table horizontal-days"><thead><tr><th>البيان</th>${daysHead}</tr></thead><tbody><tr><th>الحالة</th>${statusRow}</tr><tr><th>الملاحظات</th>${notesRow}</tr></tbody></table></div>`;
}
function fmtMoney(v){return Number(v||0).toFixed(2)+" جنيه";}
async function loadMyPayslip(){
 const month=Number(document.getElementById("myMonth").value),year=Number(document.getElementById("myYear").value),box=document.getElementById("myPayslip");if(!window.currentWorkerId)return;
 const {data:w}=await db.from("workers").select("worker_code,full_name,department,job_title,daily_rate").eq("id",window.currentWorkerId).maybeSingle(),r=await getMonthAttendance(window.currentWorkerId,year,month);if(r.error){box.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;return}
 const c={حضور:0,إجازة:0};(r.data||[]).forEach(x=>{if(x.attendance_status in c)c[x.attendance_status]++;});const total=c.حضور*Number(w?.daily_rate||0),map=Object.fromEntries((r.data||[]).map(x=>[x.attendance_date,x]));let dayHeaders='',dayDates='',dayStatus='';
 for(let d=1;d<=daysInMonth(year,month);d++){const date=`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`,a=map[date],st=a?.attendance_status||"",cls=st==="حضور"?"status-present":st==="إجازة"?"status-leave":"";dayHeaders+=`<th>${d}</th>`;dayDates+=`<td>${String(d).padStart(2,"0")}/${String(month).padStart(2,"0")}</td>`;dayStatus+=`<td class="${cls}">${esc(st||"—")}</td>`}
 box.innerHTML=`<div class="salary-slip" id="salarySlip"><div class="salary-head"><div><div class="print-only">شركة مصر للطيران للخدمات الجوية — العمالة المعاونة (المتابعة المركزية)</div><h2>💳 مفردات المرتب الشهرية</h2><div style="opacity:.85;margin-top:5px">كشف استحقاقات شهري</div></div><div>${monthName(month)} ${year}</div></div><div class="salary-info"><div class="salary-chip"><span>اسم العامل</span><b>${esc(w?.full_name)}</b></div><div class="salary-chip"><span>الكود</span><b>${esc(w?.worker_code)}</b></div><div class="salary-chip"><span>الإدارة</span><b>${esc(w?.department||"—")}</b></div><div class="salary-chip"><span>القسم</span><b>${esc(w?.job_title||"—")}</b></div><div class="salary-chip"><span>قيمة اليومية</span><b>${fmtMoney(w?.daily_rate)}</b></div></div><div class="salary-summary"><div class="salary-stat"><span>حضور</span><b>${c.حضور}</b></div><div class="salary-stat"><span>إجازة</span><b>${c.إجازة}</b></div><div class="salary-stat"><span>الأيام المستحقة</span><b>${c.حضور}</b></div></div><div class="salary-total"><span>إجمالي المستحق</span><span>${fmtMoney(total)}</span></div><div class="salary-days-title"><h3 style="margin:0">📅 تفاصيل الشهر بالعرض</h3><span class="muted">اسحب يمينًا ويسارًا لرؤية الأيام</span></div><div class="salary-days-wrap"><table class="salary-days"><thead><tr><th>البيان</th>${dayHeaders}</tr></thead><tbody><tr><th>التاريخ</th>${dayDates}</tr><tr><th>الحالة</th>${dayStatus}</tr></tbody></table></div></div><div class="no-print"><button onclick="printPayslip()">🖨️ طباعة مفردات المرتب</button></div>`
}
function printPayslip(){document.body.classList.add("printing-payslip");window.setTimeout(()=>window.print(),50);window.addEventListener("afterprint",()=>document.body.classList.remove("printing-payslip"),{once:true});}
async function uploadIdCardSide(type,inputId,msgId){
 const input=document.getElementById(inputId),msg=document.getElementById(msgId); msg.className="";msg.textContent="";
 const f=input?.files?.[0]; if(!f){msg.className="error";msg.textContent="اختر صورة أولًا.";return}
 if(f.size>10*1024*1024){msg.className="error";msg.textContent="حجم الملف يجب ألا يتجاوز 10 ميجابايت.";return}
 if(!(f.type.startsWith("image/")||f.type==="application/pdf")){msg.className="error";msg.textContent="المسموح صور أو PDF فقط.";return}
 const {data:{user},error:userErr}=await db.auth.getUser(); if(userErr||!user){msg.className="error";msg.textContent="انتهت الجلسة، سجل الدخول مرة أخرى.";return}
 const {data:worker,error:wErr}=await db.from("workers").select("id").eq("user_id",user.id).maybeSingle(); if(wErr||!worker){msg.className="error";msg.textContent="تعذر العثور على حساب العامل.";return}
 const {data:oldDocs}=await db.from("worker_documents").select("id,file_path").eq("worker_id",worker.id).eq("document_type",type);
 if(oldDocs?.length){const paths=oldDocs.map(x=>x.file_path).filter(Boolean);if(paths.length)await db.storage.from("worker-documents").remove(paths);await db.from("worker_documents").delete().in("id",oldDocs.map(x=>x.id));}
 const ext=(f.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";
 const path=v5DocumentPath(user.id,type,f.name);msg.textContent="جارٍ الرفع...";
 const {error:upErr}=await db.storage.from("worker-documents").upload(path,f,{contentType:f.type,upsert:false});
 if(upErr){msg.className="error";msg.textContent="تعذر رفع الملف: "+upErr.message;return}
 const {error:dbErr}=await db.from("worker_documents").insert({worker_id:worker.id,document_type:type,file_path:path,file_name:f.name,mime_type:f.type,status:"pending"});
 if(dbErr){await db.storage.from("worker-documents").remove([path]);msg.className="error";msg.textContent="تم رفع الملف لكن تعذر تسجيله: "+dbErr.message;return}
 input.value="";msg.className="success";msg.textContent="تم رفع هذا الوجه بنجاح.";loadMyDocuments();
}
async function uploadMyDocument(){
  const msg=document.getElementById("docMsg"), file=document.getElementById("docFile"), typeEl=document.getElementById("docType");
  msg.className=""; msg.textContent="";
  const f=file.files?.[0], type=typeEl?.value;
  const allowed=["national_id","introduction_letter","personal_photo","access_permit","other"];
  if(!allowed.includes(type)){msg.className="error";msg.textContent="اختر نوع مستند صحيح.";return}
  if(!f){msg.className="error";msg.textContent="اختر ملفًا أولًا.";return}
  if(f.size>10*1024*1024){msg.className="error";msg.textContent="حجم الملف يجب ألا يتجاوز 10 ميجابايت.";return}
  if(!(f.type.startsWith("image/")||f.type==="application/pdf")){msg.className="error";msg.textContent="المسموح صور أو PDF فقط.";return}
  const {data:{user},error:userErr}=await db.auth.getUser();
  if(userErr||!user){msg.className="error";msg.textContent="انتهت الجلسة، سجل الدخول مرة أخرى.";return}
  const {data:worker,error:wErr}=await db.from("workers").select("id").eq("user_id",user.id).maybeSingle();
  if(wErr||!worker){msg.className="error";msg.textContent="تعذر العثور على حساب العامل المرتبط بهذا الدخول.";return}
  window.currentWorkerId=worker.id;

  // Remove previous document of the same type so the latest upload is the active one.
  const {data:oldDocs}=await db.from("worker_documents").select("id,file_path").eq("worker_id",worker.id).eq("document_type",type);
  if(oldDocs?.length){
    const paths=oldDocs.map(x=>x.file_path).filter(Boolean);
    if(paths.length) await db.storage.from("worker-documents").remove(paths);
    const {error:delErr}=await db.from("worker_documents").delete().in("id",oldDocs.map(x=>x.id));
    if(delErr){msg.className="error";msg.textContent="تعذر تجهيز المستند السابق للاستبدال: "+delErr.message;return}
  }

  const ext=(f.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";
  const path=v5DocumentPath(user.id,type,f.name);
  msg.textContent="جارٍ رفع المستند...";
  const {error:upErr}=await db.storage.from("worker-documents").upload(path,f,{contentType:f.type,upsert:false});
  if(upErr){
    msg.className="error";
    msg.textContent="تعذر رفع الملف: "+upErr.message+" — تأكد أن جلسة الدخول ما زالت فعالة.";
    return;
  }

  const {error:dbErr}=await db.from("worker_documents").insert({
    worker_id:worker.id,document_type:type,file_path:path,file_name:f.name,mime_type:f.type,status:"pending"
  });
  if(dbErr){
    await db.storage.from("worker-documents").remove([path]);
    msg.className="error";
    msg.textContent="تم رفع الملف لكن تعذر تسجيله: "+dbErr.message;
    return;
  }
  file.value="";
  msg.className="success";
  msg.textContent="تم رفع المستند بنجاح.";
  await loadMyDocuments();
}
const documentLabels={national_id:"بطاقة الرقم القومي",national_id_front:"بطاقة الرقم القومي — الوجه الأمامي",national_id_back:"بطاقة الرقم القومي — الوجه الخلفي",introduction_letter:"وثيقة التعارف",personal_photo:"صورة شخصية",access_permit:"تصريح الدخول",other:"مستند آخر","بطاقة الرقم القومي":"بطاقة الرقم القومي","وثيقة التعارف":"وثيقة التعارف","صورة شخصية":"صورة شخصية","تصريح الدخول":"تصريح الدخول","مستند آخر":"مستند آخر"};
function documentLabel(v){return documentLabels[v]||v||"مستند";}
async function resizeProfileImage(file){
  return await new Promise((resolve,reject)=>{
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload=()=>{
      try{
        const size=300, canvas=document.createElement("canvas"); canvas.width=size; canvas.height=size;
        const ctx=canvas.getContext("2d");
        const scale=Math.max(size/img.width,size/img.height), w=img.width*scale, h=img.height*scale;
        ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
        canvas.toBlob(blob=>{URL.revokeObjectURL(url); blob?resolve(new File([blob],"profile.jpg",{type:"image/jpeg"})):reject(new Error("تعذر تجهيز الصورة"));},"image/jpeg",0.88);
      }catch(e){URL.revokeObjectURL(url);reject(e)}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("الصورة غير صالحة"))}; img.src=url;
  });
}
async function uploadProfilePhoto(){
  const input=document.getElementById("profilePhotoFile"),msg=document.getElementById("profilePhotoMsg");
  const file=input?.files?.[0]; if(!file)return; msg.className="muted photo-msg"; msg.textContent="جارٍ تجهيز ورفع الصورة...";
  if(file.size>2*1024*1024){msg.className="error photo-msg";msg.textContent="حجم الصورة يجب ألا يتجاوز 2 ميجابايت.";input.value="";return}
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){msg.className="error photo-msg";msg.textContent="المسموح JPG أو PNG أو WebP فقط.";input.value="";return}
  try{
    const {data:{user},error:userErr}=await db.auth.getUser(); if(userErr||!user)throw new Error("انتهت الجلسة، سجل الدخول مرة أخرى.");
    const {data:worker,error:wErr}=await db.from("workers").select("id").eq("user_id",user.id).maybeSingle(); if(wErr||!worker)throw new Error("تعذر العثور على حساب العامل.");
    window.currentWorkerId=worker.id;
    const prepared=await resizeProfileImage(file);
    const {data:oldDocs}=await db.from("worker_documents").select("id,file_path").eq("worker_id",worker.id).eq("document_type","personal_photo");
    if(oldDocs?.length){const paths=oldDocs.map(x=>x.file_path).filter(Boolean);if(paths.length)await db.storage.from("worker-documents").remove(paths);await db.from("worker_documents").delete().in("id",oldDocs.map(x=>x.id));}
    const path=`${user.id}/personal_photo/صورة_شخصية-${Date.now()}.jpg`;
    const {error:upErr}=await db.storage.from("worker-documents").upload(path,prepared,{contentType:"image/jpeg",upsert:false}); if(upErr)throw upErr;
    const {error:dbErr}=await db.from("worker_documents").insert({worker_id:worker.id,document_type:"personal_photo",file_path:path,file_name:"profile.jpg",mime_type:"image/jpeg",status:"pending"});
    if(dbErr){await db.storage.from("worker-documents").remove([path]);throw dbErr}
    input.value="";msg.className="success photo-msg";msg.textContent="تم حفظ صورتك بنجاح."; await loadProfilePhoto();
  }catch(e){msg.className="error photo-msg";msg.textContent="تعذر حفظ الصورة: "+(e.message||e)}
}
async function loadProfilePhoto(){
  const img=document.getElementById("myProfilePhoto"),ph=document.getElementById("profilePhotoPlaceholder"); if(!img||!window.currentWorkerId)return;
  const {data,error}=await db.from("worker_documents").select("file_path").eq("worker_id",window.currentWorkerId).eq("document_type","personal_photo").order("uploaded_at",{ascending:false}).limit(1).maybeSingle();
  if(error||!data?.file_path){img.removeAttribute("src");img.style.display="none";ph.style.display="flex";return}
  const {data:signed,error:sErr}=await db.storage.from("worker-documents").createSignedUrl(data.file_path,3600);
  if(sErr||!signed?.signedUrl){img.removeAttribute("src");img.style.display="none";ph.style.display="flex";return}
  img.src=signed.signedUrl;img.style.display="block";ph.style.display="none";
}
async function deleteProfilePhoto(){
  const msg=document.getElementById("profilePhotoMsg"); if(!window.currentWorkerId)return;
  if(!confirm("هل تريد حذف صورتك الشخصية؟"))return; msg.className="muted photo-msg";msg.textContent="جارٍ حذف الصورة...";
  const {data,error}=await db.from("worker_documents").select("id,file_path").eq("worker_id",window.currentWorkerId).eq("document_type","personal_photo");
  if(error){msg.className="error photo-msg";msg.textContent=error.message;return}
  if(data?.length){const paths=data.map(x=>x.file_path).filter(Boolean);if(paths.length)await db.storage.from("worker-documents").remove(paths);const {error:delErr}=await db.from("worker_documents").delete().in("id",data.map(x=>x.id));if(delErr){msg.className="error photo-msg";msg.textContent="تعذر حذف الصورة: "+delErr.message;return}}
  await loadProfilePhoto(); msg.className="success photo-msg";msg.textContent="تم حذف الصورة.";
}
async function loadMyDocuments(){
  const box=document.getElementById("myDocumentsList"); if(!box)return;
  const {data,error}=await db.from("worker_documents").select("id,document_type,file_path,file_name,uploaded_at,status,notes").eq("worker_id",window.currentWorkerId).order("uploaded_at",{ascending:false});
  if(error){box.innerHTML=`<p class="error">${esc(error.message)}</p>`;return}
  if(!data?.length){box.innerHTML="<p class='muted'>لم ترفع أي مستندات حتى الآن.</p>";return}
  box.innerHTML=data.map(d=>`<div class="doc-row"><b>${esc(documentLabel(d.document_type))}</b><div class="muted">${esc(d.file_name||"")}</div><div class="muted">تاريخ الرفع: ${d.uploaded_at?new Date(d.uploaded_at).toLocaleString("ar-EG"):"—"}</div><div class="doc-status ${d.status==="مكتمل"?"status-ok":d.status==="مرفوض"?"status-reject":"status-pending"}">الحالة: ${esc(d.status||"قيد المراجعة")}</div>${d.notes?`<div class="muted">ملاحظة: ${esc(d.notes)}</div>`:""}<div class="doc-actions"><button onclick="openMyDocument('${esc(d.file_path)}')">👁️ عرض</button><button class="danger" onclick="deleteMyDocument('${esc(d.id)}','${esc(d.file_path)}')">🗑️ حذف</button></div></div>`).join("");
}
async function openMyDocument(path){
  try{
    if(!path){throw new Error("مسار المستند غير موجود.");}
    const auth=await db.auth.getUser();
    if(auth.error||!auth.data?.user) throw new Error("انتهت جلسة الدخول.");
    const {data,error}=await db.storage.from("worker-documents").createSignedUrl(path,900);
    if(error||!data?.signedUrl) throw new Error(error?.message||"تعذر إنشاء رابط آمن للمستند.");
    const w=window.open(data.signedUrl,"_blank","noopener");
    if(!w) window.location.href=data.signedUrl;
  }catch(e){alert("تعذر فتح المرفق: "+(e.message||e));}
}
async function deleteMyDocument(id,path){
  if(!confirm("هل تريد حذف هذا المستند؟"))return;
  await db.storage.from("worker-documents").remove([path]);
  const {error}=await db.from("worker_documents").delete().eq("id",id);
  if(error){alert("تعذر حذف السجل: "+error.message);return}
  loadMyDocuments();
}

async function loadAdminDocuments(){
  const box=document.getElementById("adminDocumentsList"), wid=document.getElementById("adminDocWorker").value;
  if(!wid){box.innerHTML="<p class='muted'>اختر عاملًا.</p>";return}
  const {data,error}=await db.from("worker_documents").select("id,document_type,file_path,file_name,uploaded_at,status,notes").eq("worker_id",wid).order("uploaded_at",{ascending:false});
  if(error){box.innerHTML=`<p class="error">${esc(error.message)}</p>`;return}
  if(!data?.length){box.innerHTML="<p class='muted'>لا توجد مستندات مرفوعة لهذا الاسم.</p>";return}
  box.innerHTML=data.map(d=>`<div class="doc-row"><b>${esc(documentLabel(d.document_type))}</b><div class="muted">${esc(d.file_name||"")}</div><div class="muted">تاريخ الرفع: ${d.uploaded_at?new Date(d.uploaded_at).toLocaleString("ar-EG"):"—"}</div><div class="doc-status ${d.status==="مكتمل"?"status-ok":d.status==="مرفوض"?"status-reject":"status-pending"}">الحالة: ${esc(d.status||"قيد المراجعة")}</div>${d.notes?`<div class="muted">ملاحظة: ${esc(d.notes)}</div>`:""}<div class="doc-actions"><button onclick="openAdminDocument('${esc(d.file_path)}')">👁️ عرض</button><select id="st-${esc(d.id)}" style="width:auto;margin:0"><option ${d.status==="قيد المراجعة"?"selected":""}>قيد المراجعة</option><option ${d.status==="مكتمل"?"selected":""}>مكتمل</option><option ${d.status==="مرفوض"?"selected":""}>مرفوض</option></select><button onclick="reviewDocument('${esc(d.id)}')">💾 تحديث الحالة</button></div></div>`).join("");
}
async function openAdminDocument(path){
  const {data,error}=await db.storage.from("worker-documents").createSignedUrl(path,300);
  if(error){alert("تعذر فتح المستند: "+error.message);return}
  window.open(data.signedUrl,"_blank","noopener");
}
async function reviewDocument(id){
  const status=document.getElementById("st-"+id).value;
  const {error}=await db.from("worker_documents").update({status}).eq("id",id);
  if(error){alert("تعذر تحديث الحالة: "+error.message);return}
  loadAdminDocuments();
}
function fillNotifyWorker(){const s=document.getElementById("notifyWorker");if(s)s.innerHTML='<option value="">اختر العامل المستهدف...</option>'+workers.map(w=>`<option value="${esc(w.id)}">${esc(w.worker_code)} — ${esc(w.full_name)}</option>`).join("");}
async function sendTargetedNotification(){
 const workerId=document.getElementById("notifyWorker")?.value; const message=document.getElementById("notifyMessage")?.value.trim(); const msg=document.getElementById("notifyMsg");
 if(!workerId||!message){msg.className="error";msg.textContent="اختر العامل واكتب التنبيه.";return;}
 msg.className="muted";msg.textContent="جارٍ إرسال التنبيه...";
 const {error}=await db.from("notifications").insert({recipient_worker_id:workerId,message});
 if(error){msg.className="error";msg.textContent="تعذر إرسال التنبيه: "+error.message;return;}
 document.getElementById("notifyMessage").value=""; msg.className="success";msg.textContent="تم إرسال التنبيه للعامل المحدد فقط."; loadAdminNotifications();
}
async function loadAdminNotifications(){
 const box=document.getElementById("adminNotificationsList"); if(!box)return;
 const {data,error}=await db.from("notifications").select("id,message,created_at,read_at,recipient_worker_id,workers(full_name,worker_code)").order("created_at",{ascending:false}).limit(30);
 if(error){box.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;}
 box.innerHTML=data?.length?data.map(n=>`<div class="card" style="margin:8px 0;padding:12px"><b>👤 ${esc(n.workers?.full_name||"—")}</b><div>${esc(n.message)}</div><small class="muted">${new Date(n.created_at).toLocaleString("ar-EG")}${n.read_at?" — تمت القراءة":" — جديد"}</small></div>`).join(""):"<p class='muted'>لا توجد تنبيهات.</p>";
}
async function loadMyNotifications(){
 const box=document.getElementById("myNotifications"); if(!box||!window.currentWorkerId)return;
 const {data,error}=await db.from("notifications").select("id,message,created_at,read_at").eq("recipient_worker_id",window.currentWorkerId).order("created_at",{ascending:false}).limit(20);
 if(error){box.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;}
 if(!data?.length){box.innerHTML="<p class='muted'>لا توجد تنبيهات موجهة لك.</p>";return;}
 box.innerHTML=data.map(n=>`<div class="notification-item" style="padding:12px;margin:8px 0;border-radius:12px;background:${n.read_at?'#f3f6f8':'#fff4c7'};border:1px solid #f0d47a"><b>${n.read_at?'🔔':'🆕'}</b> ${esc(n.message)}<div class="muted" style="margin-top:5px">${new Date(n.created_at).toLocaleString("ar-EG")}</div>${!n.read_at?`<button style="width:auto;margin-top:8px" onclick="markNotificationRead('${esc(n.id)}')">✓ تم الاطلاع</button>`:""}</div>`).join("");
}
async function markNotificationRead(id){const {error}=await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id);if(error){alert("تعذر تحديث التنبيه: "+error.message);return;}loadMyNotifications();}

function showForgot(){
 document.getElementById("login").classList.add("hidden");
 document.getElementById("forgot").classList.remove("hidden");
 document.getElementById("newPassword").classList.add("hidden");
    setContactWhatsapp(true);
 document.getElementById("resetEmail").value=document.getElementById("email").value||"";
 document.getElementById("resetMsg").textContent="";
}
function showLogin(){
 document.getElementById("forgot").classList.add("hidden");
 document.getElementById("newPassword").classList.add("hidden");
 document.getElementById("login").classList.remove("hidden");
}
function showPasswordRecovery(){
 document.getElementById("login").classList.add("hidden");
 document.getElementById("forgot").classList.add("hidden");
 document.getElementById("dashboard").classList.add("hidden");
 document.getElementById("workerPage").classList.add("hidden");
 document.getElementById("newPassword").classList.remove("hidden");
 document.getElementById("newPass").value="";
 document.getElementById("newPass2").value="";
 document.getElementById("newPassMsg").textContent="";
}
async function sendReset(){
 const email=document.getElementById("resetEmail").value.trim();
 const msg=document.getElementById("resetMsg");
 if(!email){msg.className="error";msg.textContent="اكتب البريد الإلكتروني أولًا.";return;}
 msg.className="";msg.textContent="جارٍ إرسال رابط إعادة التعيين...";
 try{
   const redirectTo=window.location.href.split("#")[0].split("?")[0];
   const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo});
   if(error) throw error;
   msg.className="success";
   msg.textContent="تم إرسال رابط إعادة تعيين كلمة المرور. افتح الرابط من نفس الجهاز والمتصفح.";
 }catch(e){
   msg.className="error";
   msg.textContent="تعذر إرسال الرابط: "+(e?.message||"حدث خطأ غير معروف");
 }
}
async function updatePassword(){
 const p=document.getElementById("newPass").value;
 const p2=document.getElementById("newPass2").value;
 const msg=document.getElementById("newPassMsg");
 if(p.length<6){msg.className="error";msg.textContent="كلمة المرور يجب أن تكون 6 أحرف على الأقل.";return;}
 if(p!==p2){msg.className="error";msg.textContent="كلمتا المرور غير متطابقتين.";return;}
 msg.className="";msg.textContent="جارٍ حفظ كلمة المرور...";
 try{
   const {data:{session}}=await db.auth.getSession();
   if(!session){
     throw new Error("انتهت جلسة إعادة التعيين. اطلب رابطًا جديدًا من «نسيت كلمة المرور».");
   }
   const {error}=await db.auth.updateUser({password:p});
   if(error) throw error;
   msg.className="success";
   msg.textContent="تم حفظ كلمة المرور الجديدة بنجاح. سيتم تحويلك لتسجيل الدخول...";
   await db.auth.signOut();
   setTimeout(()=>showLogin(),1200);
 }catch(e){
   msg.className="error";
   msg.textContent="تعذر حفظ كلمة المرور: "+(e?.message||"حدث خطأ غير معروف");
 }
}


async function showWorkerDays(workerId){
 const w=workers.find(x=>x.id===workerId);if(!w)return;const month=Number(document.getElementById("adminMonth")?.value)||new Date().getMonth()+1,year=Number(document.getElementById("adminYear")?.value)||new Date().getFullYear();const r=await getMonthAttendance(workerId,year,month);if(r.error){alert("تعذر تحميل أيام الحضور: "+r.error.message);return}
 const map=Object.fromEntries((r.data||[]).map(x=>[x.attendance_date,x])),counts={حضور:0,إجازة:0};let head='',statusRow='',notesRow='';
 for(let d=1;d<=daysInMonth(year,month);d++){const date=`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`,a=map[date],status=a?.attendance_status||"";if(status in counts)counts[status]++;head+=`<th>${d}</th>`;statusRow+=`<td>${esc(status||"—")}</td>`;notesRow+=`<td>${esc(a?.notes||"—")}</td>`}
 let m=document.getElementById("workerDaysModal");if(!m){m=document.createElement("div");m.id="workerDaysModal";m.className="modal-overlay";document.body.appendChild(m)}m.innerHTML=`<div class="modal-card" dir="rtl"><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button><h2>📅 ${esc(w.full_name)}</h2><p>${monthName(month)} ${year}</p><div class="grid"><div class="stat"><span>حضور</span><b>${counts.حضور}</b></div><div class="stat"><span>إجازة</span><b>${counts.إجازة}</b></div></div><h3>📋 تفاصيل الأيام بالعرض</h3><div class="scroll"><table class="month-table horizontal-days"><thead><tr><th>البيان</th>${head}</tr></thead><tbody><tr><th>الحالة</th>${statusRow}</tr><tr><th>الملاحظات</th>${notesRow}</tr></tbody></table></div></div>`;
}

function setContactWhatsapp(visible){
  const box=document.getElementById("contactWhatsapp");
  if(!box)return;
  box.classList.toggle("show",!!visible);
  if(!visible) document.getElementById("contactWaPop")?.classList.remove("show");
}
function toggleContactWa(){
  const pop=document.getElementById("contactWaPop");
  const number=document.getElementById("contactWaNumber");
  if(pop){
    const opening=!pop.classList.contains("show");
    pop.classList.toggle("show");
    if(number) number.style.display=opening ? "block" : "none";
  }
}

async function restoreAppSession(session){
  if(!session?.user)return false;
  if(restoringSession)return true;
  restoringSession=true;
  try{
    document.getElementById("login").classList.add("hidden");
    document.getElementById("forgot").classList.add("hidden");
    document.getElementById("newPassword").classList.add("hidden");

    const {data:role,error:roleError}=await db.from("user_roles").select("role").eq("user_id",session.user.id).maybeSingle();
    if(roleError){
      console.error("تعذر قراءة صلاحية المستخدم:",roleError);
      document.getElementById("login").classList.remove("hidden");
      document.getElementById("loginMsg").className="error";
      document.getElementById("loginMsg").textContent="تعذر تحميل صلاحيات الحساب: "+roleError.message;
      return false;
    }

    if(role?.role==="admin"){
      document.getElementById("workerPage").classList.add("hidden");
      document.getElementById("dashboard").classList.remove("hidden");
      await loadAdmin();
    }else{
      document.getElementById("dashboard").classList.add("hidden");
      document.getElementById("workerPage").classList.remove("hidden");
      await loadWorker();
    }
    // زر التواصل يظهر فقط بعد الدخول الناجح، ولا يظهر في شاشة تسجيل الدخول.
    setContactWhatsapp(true);
    appBooted=true;
    return true;
  }catch(e){
    console.error("خطأ أثناء استعادة الجلسة:",e);
    document.getElementById("loginMsg").className="error";
    document.getElementById("loginMsg").textContent="حدث خطأ أثناء استعادة الجلسة: "+(e?.message||"خطأ غير معروف");
    return false;
  }finally{
    restoringSession=false;
  }
}

async function logout(){
  setContactWhatsapp(false);
  await db.auth.signOut();
  appBooted=false;
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("workerPage").classList.add("hidden");
  document.getElementById("forgot").classList.add("hidden");
  document.getElementById("newPassword").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
  document.getElementById("loginMsg").textContent="تم تسجيل الخروج.";
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
document.getElementById("attDate").value=new Date().toISOString().slice(0,10);
initMonthSelectors();

// مستمع واحد فقط لتغييرات المصادقة، لمنع التنافس بين INITIAL_SESSION و getSession.
db.auth.onAuthStateChange((event,session)=>{
  if(event==="PASSWORD_RECOVERY"){
    setTimeout(showPasswordRecovery,0);
    return;
  }
  if(session && (event==="SIGNED_IN" || event==="TOKEN_REFRESHED" || event==="INITIAL_SESSION")){
    setTimeout(()=>restoreAppSession(session),0);
    return;
  }
  if(event==="SIGNED_OUT"){
    setContactWhatsapp(false);
    appBooted=false;
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("workerPage").classList.add("hidden");
    document.getElementById("login").classList.remove("hidden");
  }
});

// استعادة الجلسة عند فتح/تحديث الصفحة. getSession يعيد الجلسة من التخزين
// ويمكنه تحديثها عند الحاجة، وهو ما يمنع ظهور شاشة الدخول بعد Refresh.
(async function bootAuth(){
  try{
    const {data,error}=await db.auth.getSession();
    if(error) throw error;
    const hash=window.location.hash||"";
    if(hash.includes("access_token=") || hash.includes("type=recovery")){
      setTimeout(()=>showPasswordRecovery(),300);
      return;
    }
    if(data.session){
      await restoreAppSession(data.session);
    }else{
      document.getElementById("login").classList.remove("hidden");
      setContactWhatsapp(false);
      document.getElementById("dashboard").classList.add("hidden");
      document.getElementById("workerPage").classList.add("hidden");
      setContactWhatsapp(false);
    }
  }catch(e){
    console.error("تعذر استعادة الجلسة:",e);
    document.getElementById("loginMsg").className="error";
    document.getElementById("loginMsg").textContent="تعذر استعادة جلسة الدخول. حاول تسجيل الدخول مرة أخرى.";
  }
})();
