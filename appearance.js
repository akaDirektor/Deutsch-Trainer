// Reading size belongs to this device, independently of learning progress.
(()=>{
  const storageKey='deutsch_text_size_v1';
  const sizes=['normal','large','largest'];
  const buttons=[...document.querySelectorAll('[data-text-size]')];
  function apply(size){
    if(!sizes.includes(size))size='normal';
    document.documentElement.dataset.textSize=size;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.textSize===size)));
    return size;
  }
  let saved='normal';
  try{saved=localStorage.getItem(storageKey)||saved}catch{}
  apply(saved);
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const size=apply(button.dataset.textSize);
    try{localStorage.setItem(storageKey,size)}catch{}
  }));
})();
