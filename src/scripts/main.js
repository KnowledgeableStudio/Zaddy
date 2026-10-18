import { PRODUCTS, SHIPPING, PAYPAL_CLIENT_ID } from '../data/site.js';
import { suspendSoundtrack, resumeSoundtrack } from './soundtrack.js';

/* ============================================================
   Catalog — prices resolved here, never from storage
   ============================================================ */
const catalog = new Map(PRODUCTS.map((p) => [p.id, p]));
const money = (n) => `$${n.toFixed(2)}`;
const MAX_QTY = 20;
const fieldIds = ['co-name', 'co-email', 'co-address', 'co-city', 'co-state', 'co-zip', 'co-country'];

/* ============================================================
   Cart state — stores {id, qty} only; survives client-side
   navigation because this module is never re-evaluated
   ============================================================ */
let cart = [];
try {
  const saved = JSON.parse(localStorage.getItem('cart') || '[]');
  if (Array.isArray(saved)) {
    cart = saved.filter((l) => catalog.has(l?.id) && Number.isInteger(l?.qty) && l.qty > 0);
  }
} catch {
  cart = [];
}

const persist = () => { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch { /* Shopping remains available without storage. */ } };
const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);
const subtotal = () => cart.reduce((sum, l) => sum + catalog.get(l.id).price * l.qty, 0);

/* ============================================================
   PayPal — SDK is deferred until the first checkout, and the
   loaded module survives page swaps
   ============================================================ */
let paypalPromise = null;
function loadPayPal() {
  if (!paypalPromise) {
    paypalPromise = new Promise((resolve, reject) => {
      if (window.paypal) return resolve();
      const s = document.createElement('script');
      s.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&enable-funding=venmo,card&disable-funding=credit`;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return paypalPromise;
}

let paypalRenderToken = 0;

/* ============================================================
   Toasts — the live region is rebuilt per page, so it is
   re-queried on every call
   ============================================================ */
function showToast(message) {
  const toastRegion = document.getElementById('toast-region');
  if (!toastRegion) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const dot = document.createElement('span');
  dot.className = 'dot';
  const text = document.createElement('span');
  text.textContent = message;
  el.append(dot, text);
  toastRegion.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

/* ============================================================
   Page init — runs on first load and after every client-router
   navigation; everything DOM-bound lives inside so it always
   binds to the CURRENT document
   ============================================================ */
let teardown = null;

function initMain() {
  const controller = new AbortController();
  const { signal } = controller;
  const observers = [];
  const timers = new Set();

  const thumbs = (() => {
    try {
      return JSON.parse(document.getElementById('product-thumbs')?.textContent || '{}');
    } catch {
      return {};
    }
  })();

  /* ---------------- Drawer ---------------- */
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  const cartView = document.getElementById('cart-view');
  const checkoutView = document.getElementById('checkout-view');
  const cartFoot = document.getElementById('cart-foot');
  const checkoutFoot = document.getElementById('checkout-foot');
  const cartTitle = document.getElementById('cart-title');
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const coItemsEl = document.getElementById('checkout-items');
  if (!drawer || !backdrop || !cartView || !checkoutView || !cartFoot || !checkoutFoot || !cartTitle || !itemsEl || !emptyEl || !coItemsEl) {
    return () => {};
  }
  let lastFocused = null;
  let inCheckout = false;
  let drawerCloseTimer = 0;

  function setCheckoutMode(on) {
    inCheckout = on;
    cartTitle.textContent = on ? 'Checkout' : 'Your Cart';
    cartView.hidden = on;
    checkoutView.hidden = !on;
    cartFoot.hidden = on;
    checkoutFoot.hidden = !on;
  }

  function openDrawer() {
    clearTimeout(drawerCloseTimer);
    lastFocused = document.activeElement;
    drawer.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add('show');
      backdrop.classList.add('show');
    });
    document.body.style.overflow = 'hidden';
    renderCart();
    document.getElementById('cart-close').focus();
  }

  function closeDrawer() {
    drawer.classList.remove('show');
    backdrop.classList.remove('show');
    document.body.style.overflow = '';
    drawerCloseTimer = setTimeout(() => {
      drawer.hidden = true;
      backdrop.hidden = true;
      setCheckoutMode(false);
    }, 400);
    timers.add(drawerCloseTimer);
    if (lastFocused?.focus) lastFocused.focus();
  }

  // Simple focus trap
  drawer.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = drawer.querySelectorAll(
      'button:not([disabled]), input, select, a[href], [tabindex]:not([tabindex="-1"])'
    );
    const list = [...focusables].filter((el) => el.getClientRects().length > 0 && !el.disabled);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, { signal });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!viewer.hidden) closeViewer();
    else if (!drawer.hidden) closeDrawer();
    else if (!mobileMenu.hidden) {
      mobileMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    }
  }, { signal });
  backdrop.addEventListener('click', closeDrawer, { signal });
  document.getElementById('cart-close').addEventListener('click', closeDrawer, { signal });
  document.getElementById('cart-open').addEventListener('click', openDrawer, { signal });

  /* ---------------- Cart rendering ---------------- */
  function renderCart() {
    itemsEl.innerHTML = '';
    coItemsEl.innerHTML = '';

    const count = cartCount();
    const badge = document.getElementById('cart-count');
    badge.textContent = count;
    badge.hidden = count === 0;
    document
      .getElementById('cart-open')
      .setAttribute('aria-label', `Open cart${count ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`);
    emptyEl.hidden = cart.length > 0;
    document.getElementById('to-checkout').disabled = cart.length === 0;
    cartFoot.style.display = cart.length === 0 ? 'none' : '';

    for (const [i, line] of cart.entries()) {
      const p = catalog.get(line.id);
      const li = document.createElement('div');
      li.className = 'cart-item';

      // thumbs JSON only ships on pages that render the Store —
      // skip the img entirely when the map isn't available
      const img = document.createElement('img');
      if (thumbs[p.id]) {
        img.src = thumbs[p.id];
        img.alt = '';
        img.width = 52;
        img.height = 52;
        img.loading = 'lazy';
      }

      const info = document.createElement('div');
      info.className = 'item-info';
      const name = document.createElement('p');
      name.className = 'item-name';
      name.textContent = p.name;
      const price = document.createElement('p');
      price.className = 'item-price';
      price.textContent = money(p.price);
      info.append(name, price);

      const qty = document.createElement('div');
      qty.className = 'qty';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.setAttribute('aria-label', `Decrease quantity of ${p.name}`);
      minus.addEventListener('click', () => changeQty(i, -1));
      const qtyVal = document.createElement('span');
      qtyVal.textContent = line.qty;
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', `Increase quantity of ${p.name}`);
      plus.addEventListener('click', () => changeQty(i, 1));
      qty.append(minus, qtyVal, plus);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'item-remove';
      remove.setAttribute('aria-label', `Remove ${p.name} from cart`);
      remove.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
      remove.addEventListener('click', () => removeLine(i));

      if (img.hasAttribute('src')) li.append(img);
      li.append(info, qty, remove);
      itemsEl.appendChild(li);

      // Checkout summary line
      const row = document.createElement('div');
      row.className = 'line';
      const label = document.createElement('span');
      label.textContent = p.name;
      const qtyNote = document.createElement('span');
      qtyNote.className = 'qty-note';
      qtyNote.textContent = ` × ${line.qty}`;
      label.appendChild(qtyNote);
      const amount = document.createElement('span');
      amount.textContent = money(p.price * line.qty);
      row.append(label, amount);
      coItemsEl.appendChild(row);
    }

    const sub = subtotal();
    const total = sub + SHIPPING;
    const ship = money(SHIPPING);
    document.getElementById('cart-subtotal').textContent = money(sub);
    document.querySelectorAll('.js-shipping').forEach((el) => (el.textContent = ship));
    document.getElementById('cart-total').textContent = money(total);
    document.getElementById('checkout-subtotal').textContent = money(sub);
    document.getElementById('checkout-total').textContent = money(total);
  }

  function changeQty(index, delta) {
    const line = cart[index];
    if (!line) return;
    line.qty = Math.min(line.qty + delta, MAX_QTY);
    if (line.qty <= 0) cart.splice(index, 1);
    persist();
    renderCart();
    if (inCheckout) renderPayPal();
  }

  function removeLine(index) {
    const removed = cart.splice(index, 1)[0];
    persist();
    renderCart();
    if (inCheckout) renderPayPal();
    showToast(`${catalog.get(removed.id).name} removed`);
  }

  function addToCart(id) {
    if (!catalog.has(id)) return;
    const existing = cart.find((l) => l.id === id);
    if (existing) existing.qty = Math.min(existing.qty + 1, MAX_QTY);
    else cart.push({ id, qty: 1 });
    persist();
    renderCart();
    openDrawer();
  }

  document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-add-to-cart');
      addToCart(id);
      showToast(`${catalog.get(id)?.name || 'Item'} added to cart`);
    }, { signal });
  });

  document.getElementById('to-checkout').addEventListener('click', () => {
    setCheckoutMode(true);
    renderCart();
    renderPayPal();
  }, { signal });
  document.getElementById('back-to-cart').addEventListener('click', () => setCheckoutMode(false), { signal });

  function clearCart() {
    cart = [];
    localStorage.removeItem('cart');
    renderCart();
    setCheckoutMode(false);
  }
  document.getElementById('cart-clear').addEventListener('click', () => {
    clearCart();
    showToast('Cart cleared');
  }, { signal });
  document.getElementById('cart-clear-2').addEventListener('click', () => {
    clearCart();
    showToast('Cart cleared');
  }, { signal });

  document.querySelectorAll('[data-notify]').forEach((btn) => {
    btn.addEventListener('click', () => showToast('New drops coming soon 🔥'), { signal });
  });

  /* ---------------- Form validation ---------------- */
  function validateForm() {
    let valid = true;
    let firstBad = null;
    for (const id of fieldIds) {
      const el = document.getElementById(id);
      let ok = el.value.trim().length > 0;
      if (ok && el.type === 'email') ok = /^\S+@\S+\.\S+$/.test(el.value);
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok) {
        valid = false;
        firstBad ||= el;
      }
    }
    firstBad?.focus();
    return valid;
  }

  fieldIds.forEach((id) => {
    document.getElementById(id).addEventListener('input', (e) => {
      if (e.target.value.trim()) e.target.removeAttribute('aria-invalid');
    }, { signal });
  });

  /* ---------------- PayPal buttons ---------------- */
  async function renderPayPal() {
    const container = document.getElementById('paypal-button-container');
    container.innerHTML = '';
    if (cart.length === 0) return;
    const token = ++paypalRenderToken;

    try {
      await loadPayPal();
    } catch {
      showToast('Payment system failed to load. Check your connection.');
      return;
    }
    // a newer render or cart change superseded this call
    if (token !== paypalRenderToken || cart.length === 0 || typeof paypal === 'undefined') return;

    paypal
      .Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
        createOrder: (data, actions) => {
          if (!validateForm()) {
            showToast('Please fill in all required fields correctly.');
            return actions.reject();
          }
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: (subtotal() + SHIPPING).toFixed(2),
                  breakdown: {
                    item_total: { value: subtotal().toFixed(2), currency_code: 'USD' },
                    shipping: { value: SHIPPING.toFixed(2), currency_code: 'USD' },
                  },
                },
                items: cart.map((l) => {
                  const p = catalog.get(l.id);
                  return {
                    name: p.name,
                    unit_amount: { value: p.price.toFixed(2), currency_code: 'USD' },
                    quantity: String(l.qty),
                  };
                }),
                shipping: {
                  name: { full_name: document.getElementById('co-name').value },
                  address: {
                    address_line_1: document.getElementById('co-address').value,
                    admin_area_2: document.getElementById('co-city').value,
                    admin_area_1: document.getElementById('co-state').value,
                    postal_code: document.getElementById('co-zip').value,
                    country_code: document.getElementById('co-country').value,
                  },
                },
              },
            ],
          });
        },
        onApprove: (data, actions) =>
          actions.order.capture().then((details) => {
            const name = details?.payer?.name?.given_name;
            showToast(`Payment completed${name ? ` — thank you, ${name}` : ''}! Order ${details?.id || ''}`.trim());
            clearCart();
            closeDrawer();
          }),
        onError: (err) => {
          console.error('PayPal error:', err);
          showToast('Payment failed. Please try again.');
        },
      })
      .render('#paypal-button-container')
      .catch(() => showToast('Payment buttons failed to render. Please retry.'));
  }

  /* ---------------- Nav — scrolled state, mobile menu, active section ---------------- */
  const nav = document.getElementById('site-nav');
  const progressBar = document.getElementById('scroll-progress');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', onScroll, { passive: true, signal });
  onScroll();

  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  // Keep the original controls accessible without covering merchandise or cart actions.
  const experienceBreakpoint = window.matchMedia('(max-width: 859px)');
  const experienceControls = ['motion-toggle', 'music-toggle'].map((id) => document.getElementById(id)).filter(Boolean);
  const placeExperienceControls = () => {
    const host = document.getElementById(experienceBreakpoint.matches ? 'mobile-experience' : 'nav-experience');
    if (host) experienceControls.forEach((control) => host.appendChild(control));
  };
  placeExperienceControls();
  experienceBreakpoint.addEventListener('change', placeExperienceControls, { signal });
  menuToggle.addEventListener('click', () => {
    const open = mobileMenu.hidden;
    mobileMenu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }, { signal });
  mobileMenu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      mobileMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    }, { signal })
  );

  document.addEventListener('pointerdown', (event) => {
    if (!mobileMenu.hidden && !nav.contains(event.target)) {
      mobileMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    }
  }, { signal });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 860 && !mobileMenu.hidden) {
      mobileMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    }
  }, { passive: true, signal });

  // Active section highlight
  const sections = ['music', 'story', 'store', 'contact'].map((id) => document.getElementById(id));
  const navAnchors = nav.querySelectorAll('.nav-links a');
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // matches both anchor links ("/#story") and page links ("/story")
        const link = nav.querySelector(
          `.nav-links a[href$="#${entry.target.id}"], .nav-links a[href="/${entry.target.id}"]`
        );
        if (!link) return;
        if (entry.isIntersecting) {
          navAnchors.forEach((a) => {
            a.classList.remove('active');
            a.removeAttribute('aria-current');
          });
          link.classList.add('active');
          link.setAttribute('aria-current', 'true');
        }
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach((s) => s && sectionObserver.observe(s));
  observers.push(sectionObserver);

  /* ---------------- Video lightbox — lite YouTube embed ---------------- */
  const videoModal = document.getElementById('video-modal');
  const videoFrame = document.getElementById('video-frame');
  const videoTitle = document.getElementById('video-title');
  let videoTrigger = null;

  function openVideo(id, title) {
    videoTrigger = document.activeElement;
    suspendSoundtrack();
    videoTitle.textContent = title;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = `${title} — music video`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    videoFrame.appendChild(iframe);
    videoModal.hidden = false;
    document.body.style.overflow = 'hidden';
    videoModal.querySelector('.video-shell-head .btn')?.focus();
  }

  function closeVideo() {
    videoModal.hidden = true;
    videoFrame.innerHTML = '';
    document.body.style.overflow = '';
    videoTrigger?.focus?.();
    resumeSoundtrack();
  }

  videoModal?.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...videoModal.querySelectorAll('button, iframe, [href]')]
      .filter((el) => el.getClientRects().length > 0 && !el.disabled);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }, { signal });

  // Events inside the cross-origin player do not bubble to this document.
  // Catch focus when Tab returns to the host page outside the open dialog.
  document.addEventListener('focusin', (event) => {
    if (videoModal && !videoModal.hidden && !videoModal.contains(event.target)) {
      videoModal.querySelector('.video-shell-head .btn')?.focus();
    }
  }, { signal });

  document.querySelectorAll('[data-video]').forEach((btn) => {
    btn.addEventListener('click', () => openVideo(btn.dataset.video, btn.dataset.videoTitle || 'Video'), { signal });
  });
  document.querySelectorAll('[data-video-close]').forEach((el) => el.addEventListener('click', closeVideo, { signal }));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal && !videoModal.hidden) closeVideo();
  }, { signal });

  /* ---------------- Image viewer — lightbox gallery ---------------- */
  const viewer = document.getElementById('img-viewer');
  const viewerImg = document.getElementById('viewer-img');
  const viewerCaption = document.getElementById('viewer-caption');
  const viewerCount = viewer.querySelector('.viewer-count');
  const viewerPrev = viewer.querySelector('[data-viewer-prev]');
  const viewerNext = viewer.querySelector('[data-viewer-next]');
  const viewerClose = viewer.querySelector('.viewer-close');
  let viewerItems = [];
  let viewerIdx = 0;
  let viewerTrigger = null;
  let viewerCloseTimer = 0;

  function renderViewer() {
    const btn = viewerItems[viewerIdx];
    viewerImg.src = btn.dataset.viewerSrc;
    viewerImg.alt = btn.dataset.viewerAlt || '';
    viewerCaption.textContent = btn.dataset.viewerAlt || '';
    const multi = viewerItems.length > 1;
    viewerPrev.hidden = viewerNext.hidden = !multi;
    viewerCount.hidden = !multi;
    viewerCount.textContent = `${viewerIdx + 1} / ${viewerItems.length}`;
    if (multi) {
      for (const step of [-1, 1]) {
        const next = viewerItems[(viewerIdx + step + viewerItems.length) % viewerItems.length];
        if (next?.dataset.viewerSrc) new Image().src = next.dataset.viewerSrc;
      }
    }
  }

  function openViewer(trigger) {
    clearTimeout(viewerCloseTimer);
    viewerItems = [...document.querySelectorAll(`[data-viewer-group="${trigger.dataset.viewerGroup}"]`)];
    viewerIdx = Math.max(viewerItems.indexOf(trigger), 0);
    viewerTrigger = trigger;
    renderViewer();
    viewer.hidden = false;
    requestAnimationFrame(() => viewer.classList.add('show'));
    document.body.style.overflow = 'hidden';
    viewerClose.focus();
  }

  function closeViewer() {
    viewer.classList.remove('show');
    document.body.style.overflow = '';
    viewerCloseTimer = setTimeout(() => {
      viewer.hidden = true;
      viewerImg.removeAttribute('src');
    }, 300);
    timers.add(viewerCloseTimer);
    viewerTrigger?.focus();
  }

  function stepViewer(delta) {
    if (viewerItems.length < 2) return;
    viewerIdx = (viewerIdx + delta + viewerItems.length) % viewerItems.length;
    renderViewer();
  }

  document.querySelectorAll('[data-viewer-group]').forEach((btn) => {
    btn.addEventListener('click', () => openViewer(btn), { signal });
  });
  viewerPrev.addEventListener('click', () => stepViewer(-1), { signal });
  viewerNext.addEventListener('click', () => stepViewer(1), { signal });
  viewer.querySelectorAll('[data-viewer-close]').forEach((el) => {
    el.addEventListener('click', closeViewer, { signal });
  });

  // simple focus trap — Tab cycles through the visible controls
  viewer.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...viewer.querySelectorAll('button')].filter((el) => el.getClientRects().length > 0 && !el.disabled);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, { signal });

  window.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.key === 'ArrowLeft') stepViewer(-1);
    else if (e.key === 'ArrowRight') stepViewer(1);
  }, { signal });

  // horizontal swipe navigates; small drags snap back harmlessly
  let viewerDrag = null;
  viewerImg.addEventListener('pointerdown', (e) => {
    viewerDrag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    viewerImg.setPointerCapture(e.pointerId);
  }, { signal });
  viewerImg.addEventListener('pointerup', (e) => {
    if (!viewerDrag) return;
    const dx = e.clientX - viewerDrag.x;
    const dy = e.clientY - viewerDrag.y;
    viewerDrag = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) stepViewer(dx < 0 ? 1 : -1);
  }, { signal });
  viewerImg.addEventListener('pointercancel', () => (viewerDrag = null), { signal });

  /* ---------------- Init ---------------- */
  renderCart();

  return () => {
    controller.abort();
    observers.forEach((observer) => observer.disconnect());
    timers.forEach((timer) => clearTimeout(timer));
    document.body.style.overflow = '';
  };
}

function boot() {
  teardown?.();
  teardown = initMain();
}

boot();
document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', () => {
  teardown?.();
  teardown = null;
});
