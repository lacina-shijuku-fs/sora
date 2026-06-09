/* ==========================================================
   そらHP — main.js
   - スクロールスパイ（IntersectionObserver）
   - SPサイドバー トグル
   - フォーム ハンドリング（デモ）
   ========================================================== */

(function(){
  'use strict';

  // -------- スクロールスパイ --------
  const sections = document.querySelectorAll('[data-spy-target]');
  const navLinks = document.querySelectorAll('.side-group a[data-spy]');
  const linkMap = {};
  navLinks.forEach(a => {
    const id = a.getAttribute('data-spy');
    if (id) linkMap[id] = a;
  });

  if (sections.length && Object.keys(linkMap).length){
    let currentId = null;
    // 各セクションの可視率を保存
    const visibility = new Map();

    const setActive = (id) => {
      if (id === currentId) return;
      currentId = id;
      navLinks.forEach(a => a.classList.remove('is-current'));
      const link = linkMap[id];
      if (link){
        link.classList.add('is-current');
        // 親<details>を開く
        const group = link.closest('details.side-group');
        if (group && !group.open) group.open = true;
      }
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        visibility.set(e.target.id, e.intersectionRatio);
      });
      // 最も画面中央寄り（可視率が最大）のセクションを採用
      let topId = null;
      let topRatio = 0;
      visibility.forEach((ratio, id) => {
        if (ratio > topRatio){
          topRatio = ratio;
          topId = id;
        }
      });
      if (topId && topRatio > 0) setActive(topId);
    }, {
      // 画面の上下にマージン: 上から30%入った所〜下から40%手前 が「現在地」
      rootMargin: '-30% 0px -40% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    });

    sections.forEach(s => io.observe(s));

    // 初期状態：一番上のセクションを active に
    requestAnimationFrame(() => {
      const first = sections[0];
      if (first) setActive(first.id);
    });
  }

  // -------- SPサイドバー トグル --------
  const sideNav = document.querySelector('.side-nav');
  const spBtn = document.getElementById('sp-menu-btn');
  const spOverlay = document.getElementById('sp-overlay');

  const closeSideNav = () => {
    sideNav?.classList.remove('open');
    spOverlay?.classList.remove('show');
    spOverlay?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  const openSideNav = () => {
    sideNav?.classList.add('open');
    spOverlay?.classList.add('show');
    spOverlay?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  spBtn?.addEventListener('click', openSideNav);
  spOverlay?.addEventListener('click', closeSideNav);
  document.getElementById('side-close-btn')?.addEventListener('click', closeSideNav);

  // SPでサイドナビのリンクをタップしたら閉じる
  document.querySelectorAll('.side-nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 960px)').matches){
        closeSideNav();
      }
    });
  });

  // Escでサイドナビを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSideNav();
  });

  // リサイズ時にPC幅になったら閉じる（クリーンアップ）
  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 960px)').matches){
      closeSideNav();
    }
  });

  // -------- スムーズスクロール（ヘッダー無いがhash対応） --------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // URLハッシュも更新（履歴汚さず）
      history.replaceState(null, '', href);
    });
  });

  // -------- お問い合わせフォーム --------
  const form = document.getElementById('contact-form');
  const overlay = document.getElementById('form-overlay');

  if (form && overlay) {
    const showState = (state) => {
      overlay.querySelectorAll('.form-state').forEach(el => el.classList.remove('active'));
      overlay.querySelector(`[data-state="${state}"]`)?.classList.add('active');
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
    };

    const hideOverlay = () => {
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.querySelectorAll('.form-state').forEach(el => el.classList.remove('active'));
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      showState('sending');
      try {
        await fetch(form.action, {
          method: 'POST',
          mode: 'no-cors',
          body: new FormData(form)
        });
        showState('success');
        form.reset();
      } catch {
        showState('error');
      }
    });

    document.getElementById('form-reset')?.addEventListener('click', hideOverlay);
    document.getElementById('form-retry')?.addEventListener('click', hideOverlay);
  }
})();
