/* Mobile nav toggle and smooth scroll + FAQ accordion */
(function(){
  const nav = document.getElementById('primary-nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  const faqButtons = Array.from(document.querySelectorAll('.faq__q'));

  // Mobile nav
  function setNavOpen(open){
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(!!open));
  }
  toggle.addEventListener('click', ()=>{
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    setNavOpen(!expanded);
  });

  // Close nav on link click (mobile)
  nav.addEventListener('click', (e)=>{
    const a = e.target.closest('a[href^="#"]');
    if(!a) return;
    setNavOpen(false);
  });

  // Respect reduced motion
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function smoothScrollTo(el){
    if(!el) return;
    const behavior = reduced ? 'auto' : 'smooth';
    el.scrollIntoView({behavior,block:'start'});
  }

  links.forEach(link=>{
    const href = link.getAttribute('href');
    if(!href || href === '#') return;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if(!target) return;
    link.addEventListener('click', (e)=>{
      e.preventDefault();
      smoothScrollTo(target);
      // move focus for accessibility
      target.setAttribute('tabindex','-1');
      target.focus({preventScroll:true});
      setTimeout(()=>target.removeAttribute('tabindex'), 1000);
    });
  });

  // FAQ accordion
  faqButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const panel = btn.nextElementSibling;
      if(!panel) return;
      if(expanded){
        panel.hidden = true;
      } else {
        panel.hidden = false;
        // reveal animation (simple)
        if(!reduced){
          panel.style.opacity = 0; panel.style.transform = 'translateY(-4px)';
          requestAnimationFrame(()=>{ panel.style.transition = 'opacity .28s ease, transform .28s ease'; panel.style.opacity=1; panel.style.transform='none'; });
          setTimeout(()=>{ panel.style.transition=''; panel.style.opacity=''; panel.style.transform=''; },320);
        }
      }
    });
  });

  // Close nav if user resizes to desktop
  window.addEventListener('resize', ()=>{
    if(window.innerWidth >= 720){ setNavOpen(false); }
  });
})();
