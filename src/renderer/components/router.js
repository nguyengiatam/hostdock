// Router
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.page');

  function navigate(pageName) {
    // Update nav
    navLinks.forEach(n => {
      if (n.dataset.page === pageName) {
        n.className = 'nav-link flex items-center space-x-3 text-primary bg-surface-container border-l-4 border-primary px-4 py-3 ml-0 active:scale-[0.98] transition-transform';
      } else {
        n.className = 'nav-link flex items-center space-x-3 text-on-surface-variant px-4 py-3 hover:bg-surface-container-low hover:text-primary transition-all active:scale-[0.98]';
      }
    });
    // Update pages
    pages.forEach(p => p.classList.add('hidden'));
    const active = document.getElementById(`page-${pageName}`);
    if (active) active.classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('page:load', { detail: pageName }));
  }

  navLinks.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  navigate('hosts');

  document.getElementById('global-search').addEventListener('input', (e) => {
    if (document.getElementById('page-hosts').classList.contains('hidden')) navigate('hosts');
    if (window.hostsPage) hostsPage.search(e.target.value);
  });
});

function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
}

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideModal();
});

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed top-12 right-4 bg-primary text-on-primary px-5 py-2.5 rounded-md font-label text-xs tracking-widest uppercase shadow-lg z-50';
  t.style.cssText = 'transform:translateX(120%);transition:transform 0.3s ease';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.style.transform = 'translateX(0)');
  setTimeout(() => { t.style.transform = 'translateX(120%)'; }, 2000);
  setTimeout(() => t.remove(), 2300);
}
