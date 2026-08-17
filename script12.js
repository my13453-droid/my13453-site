
(function(){
  const labels={
    id_front:'docStatusIdFront',
    id_back:'docStatusIdBack',
    customs_permit:'docStatusCustoms',
    identification_document:'docStatusIntro',
    other:'docStatusOther'
  };

  const folderMap={
    id_front:'الرقم_القومي/أمام',
    id_back:'الرقم_القومي/خلف',
    customs_permit:'التصريح_الجمركي',
    identification_document:'وثيقة_التعارف',
    other:'مستندات_أخرى'
  };

  window.uploadWorkerDocumentV8 = async function(input){
    const file=input.files && input.files[0];
    const type=input.dataset.docType;
    if(!file || !type) return;

    const msg=document.getElementById('workerDocsUploadMessageV8');
    const status=document.getElementById(labels[type]);
    if(msg){msg.className='docs-upload-message';msg.textContent='جاري رفع المستند...';}

    try{
      if(!window.db || !window.currentWorkerId){
        throw new Error('لم يتم التعرف على العامل الحالي.');
      }

      const safeName=file.name.replace(/[^\w\u0600-\u06FF.\- ]/g,'_');
      const workerFolder=String((await db.auth.getUser()).data.user.id);
      const safeType=String(type||'other').replace(/[^a-zA-Z0-9_-]/g,'_');
      const path=`${workerFolder}/documents/${safeType}-${Date.now()}_${safeName}`;

      const up=await db.storage.from('worker-documents').upload(path,file,{upsert:true});
      if(up.error) throw up.error;

      const row={
        worker_id:window.currentWorkerId,
        document_type:type,
        file_name:file.name,
        file_path:path,
        status:'pending'
      };

      const ins=await db.from('worker_documents').insert(row);
      if(ins.error){
        // If the project uses a reduced schema, keep the uploaded file and report the DB issue.
        throw ins.error;
      }

      if(status) status.textContent='تم الرفع ✓';
      if(msg){
        msg.className='docs-upload-message success';
        msg.textContent='تم إرفاق المستند بنجاح وحفظه داخل فولدر مستنداتك الخاص.';
      }
      input.value='';
    }catch(e){
      if(msg){
        msg.className='docs-upload-message error';
        msg.textContent='تعذر إرفاق المستند: '+(e.message||e);
      }
      input.value='';
    }
  };
})();
