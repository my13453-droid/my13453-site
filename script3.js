
/* V7: automatic current month for worker/admin/payslip */
(function(){
  function currentMY(){
    const d=new Date();
    return {m:d.getMonth()+1,y:d.getFullYear()};
  }
  function setCurrentMonthYear(){
    const {m,y}=currentMY();
    ["adminMonth","myMonth"].forEach(id=>{
      const el=document.getElementById(id);
      if(el && [...el.options].some(o=>String(o.value)===String(m))) el.value=String(m);
    });
    ["adminYear","myYear"].forEach(id=>{
      const el=document.getElementById(id);
      if(el && [...el.options].some(o=>String(o.value)===String(y))) el.value=String(y);
    });
  }
  function daysInCurrentMonth(){
    const {m,y}=currentMY();
    return new Date(y,m,0).getDate();
  }
  window.addEventListener("DOMContentLoaded",()=>{
    setTimeout(setCurrentMonthYear,300);
  });
  // Re-apply after existing month selector initialization.
  const oldInit=window.initMonthSelectors;
  if(typeof oldInit==="function"){
    window.initMonthSelectors=function(){
      const r=oldInit.apply(this,arguments);
      setTimeout(setCurrentMonthYear,50);
      return r;
    };
  }
  // Ensure the current month is selected whenever worker/attendance pages open.
  const oldShow=window.showTab;
  if(typeof oldShow==="function"){
    window.showTab=function(id){
      const r=oldShow.apply(this,arguments);
      if(id==="attendance" || id==="workerPage"){
        setTimeout(setCurrentMonthYear,50);
      }
      return r;
    };
  }
  window.getAutomaticCurrentMonth = currentMY;
  window.getAutomaticDaysInCurrentMonth = daysInCurrentMonth;
})();
