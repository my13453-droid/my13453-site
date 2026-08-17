
(function(){
  let personalDocsCard = null;
  let initialized = false;

  function detachPersonalDocs(){
    if(initialized) return;
    personalDocsCard = document.getElementById('workerPersonalDocumentsCard');
    if(personalDocsCard){
      personalDocsCard.remove();
      initialized = true;
    }
  }

  function openPersonalDocs(){
    detachPersonalDocs();
    if(!personalDocsCard){
      if(typeof openModal==='function'){
        openModal('📁 مستنداتي','<div class="card"><p class="error">تعذر تجهيز فولدر المستندات حاليًا.</p></div>');
      }
      return;
    }

    if(typeof openModal!=='function'){
      return;
    }

    openModal(
      '📁 مستنداتي',
      '<div id="personalDocsMount"></div>'
    );

    const mount = document.getElementById('personalDocsMount');
    if(mount){
      mount.appendChild(personalDocsCard);
    }
  }

  function patch(){
    detachPersonalDocs();
    const original = window.openWorkerService;
    if(!original || original.__v7PersonalDocsPatched) return;

    const wrapped = async function(kind){
      if(kind === 'mydocs'){
        return openPersonalDocs();
      }
      return original.apply(this, arguments);
    };
    wrapped.__v7PersonalDocsPatched = true;
    window.openWorkerService = wrapped;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(patch,300));
  }else{
    setTimeout(patch,300);
  }
  window.addEventListener('load',()=>setTimeout(patch,700));
})();
