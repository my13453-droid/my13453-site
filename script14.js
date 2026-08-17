
(function(){
  const badTexts=[
    'قاعدة البيانات غير متاحة',
    'مستنداتي المرفوعة',
    'افتح الخدمة لعرض ملفاتك',
    'يمكنك استخدام الاختصارات من الصفحة الرئيسية',
    'أهلًا بك في مركز خدمات العامل',
    'الرئيسية الذكية'
  ];
  function clean(){
    document.querySelectorAll('body *').forEach(el=>{
      if(el.children.length===0){
        const t=(el.textContent||'').trim();
        if(badTexts.some(x=>t===x || t.includes(x))){
          if(!el.closest('#v12DocsOverlay')) el.remove();
        }
      }
    });
    document.querySelectorAll('.v9-mydocs-tile,.v10-docs-tile,.personal-docs-service').forEach(e=>e.remove());
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(clean,250));
  else setTimeout(clean,250);
  window.addEventListener('load',()=>setTimeout(clean,700));
})();
