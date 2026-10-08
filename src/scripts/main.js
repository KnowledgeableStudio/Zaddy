import { PRODUCTS, SHIPPING } from '../data/site.js';

/* ============================================================
   Catalog — prices resolved here, never from storage
   ============================================================ */
const catalog = new Map(PRODUCTS.map((p) => [p.id, p]));

const thumbs = (() => {
  try {
    return JSON.parse(document.getElementById('product-thumbs')?.textContent || '{}');
  } catch {
    return {};
  }
})();

const money = (n) => `$${n.toFixed(2)}`;

/* ============================================================
   Toasts
   ============================================================ */
const toastRegion = document.getElementById('toast-region');
function showToast(message) {
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
   Cart state — stores {id, qty} only
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

const persist = () => localStorage.setItem('cart', JSON.stringify(cart));
const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);
const subtotal = () => cart.reduce((sum, l) => sum + catalog.get(l.id).price * l.qty, 0);

/* ============================================================
   Drawer
   ============================================================ */
const drawer = document.getElementById('cart-drawer');
const backdrop = document.getElementById('cart-backdrop');
const cartView = document.getElementById('cart-view');
const checkoutView = document.getElementById('checkout-view');
const cartFoot = document.getElementById('cart-foot');
const checkoutFoot = document.getElementById('checkout-foot');
const cartTitle = document.getElementById('cart-title');
let lastFocused = null;
let inCheckout = false;

function setCheckoutMode(on) {
  inCheckout = on;
  cartTitle.textContent = on ? 'Checkout' : 'Your Cart';
  cartView.hidden = on;
  checkoutView.hidden = !on;
  cartFoot.hidden = on;
  checkoutFoot.hidden = !on;
}

function openDrawer() {
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
  setTimeout(() => {
    drawer.hidden = true;
    backdrop.hidden = true;
    setCheckoutMode(false);
  }, 400);
  if (lastFocused?.focus) lastFocused.focus();
}

// Simple focus trap
drawer.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const focusables = drawer.querySelectorAll(
    'button:not([disabled]), input, select, a[href], [tabindex]:not([tabindex="-1"])'
  );
  const list = [...focusables].filter((el) => el.offsetParent !== null);
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
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !drawer.hidden) closeDrawer();
});
backdrop.addEventListener('click', closeDrawer);
document.getElementById('cart-close').addEventListener('click', closeDrawer);
document.getElementById('cart-open').addEventListener('click', openDrawer);

/* ============================================================
   Cart rendering
   ============================================================ */
const itemsEl = document.getElementById('cart-items');
const emptyEl = document.getElementById('cart-empty');
const coItemsEl = document.getElementById('checkout-items');

function renderCart() {
  itemsEl.innerHTML = '';
  coItemsEl.innerHTML = '';

  const count = cartCount();
  document.getElementById('cart-count').textContent = count;
  emptyEl.hidden = cart.length > 0;
  document.getElementById('to-checkout').disabled = cart.length === 0;
  cartFoot.style.display = cart.length === 0 ? 'none' : '';

  for (const [i, line] of cart.entries()) {
    const p = catalog.get(line.id);
    const li = document.createElement('div');
    li.className = 'cart-item';

    const img = document.createElement('img');
    img.src = thumbs[p.id] || '';
    img.alt = '';
    img.width = 52;
    img.height = 52;
    img.loading = 'lazy';

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

    li.append(img, info, qty, remove);
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
  document.getElementById('cart-subtotal').textContent = money(sub);
  document.getElementById('cart-total').textContent = money(total);
  document.getElementById('checkout-subtotal').textContent = money(sub);
  document.getElementById('checkout-total').textContent = money(total);
}

function changeQty(index, delta) {
  const line = cart[index];
  if (!line) return;
  line.qty += delta;
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
  const existing = cart.find((l) => l.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, qty: 1 });
  persist();
  renderCart();
  openDrawer();
}

document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
  btn.addEventListener('click', () => {
    addToCart(btn.getAttribute('data-add-to-cart'));
    showToast(`${catalog.get(btn.getAttribute('data-add-to-cart')).name} added to cart`);
  });
});

document.getElementById('to-checkout').addEventListener('click', () => {
  setCheckoutMode(true);
  renderCart();
  renderPayPal();
});
document.getElementById('back-to-cart').addEventListener('click', () => setCheckoutMode(false));

function clearCart() {
  cart = [];
  localStorage.removeItem('cart');
  renderCart();
  setCheckoutMode(false);
}
document.getElementById('cart-clear').addEventListener('click', () => {
  clearCart();
  showToast('Cart cleared');
});
document.getElementById('cart-clear-2').addEventListener('click', () => {
  clearCart();
  showToast('Cart cleared');
});

document.querySelectorAll('[data-notify]').forEach((btn) => {
  btn.addEventListener('click', () => showToast('New drops coming soon 🔥'));
});

/* ============================================================
   Form validation
   ============================================================ */
const fieldIds = ['co-name', 'co-email', 'co-address', 'co-city', 'co-state', 'co-zip', 'co-country'];

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
  });
});

/* ============================================================
   PayPal
   ============================================================ */
function renderPayPal() {
  const container = document.getElementById('paypal-button-container');
  container.innerHTML = '';
  if (cart.length === 0 || typeof paypal === 'undefined') return;

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
          showToast(`Payment completed! Thank you, ${details.payer.name.given_name}.`);
          clearCart();
          closeDrawer();
        }),
      onError: (err) => {
        console.error('PayPal error:', err);
        showToast('Payment failed. Please try again.');
      },
    })
    .render('#paypal-button-container');
}

/* ============================================================
   Nav — scrolled state, mobile menu, active section
   ============================================================ */
const nav = document.getElementById('site-nav');
const progressBar = document.getElementById('scroll-progress');
const onScroll = () => {
  nav.classList.toggle('scrolled', window.scrollY > 24);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
menuToggle.addEventListener('click', () => {
  const open = mobileMenu.hidden;
  mobileMenu.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
});
mobileMenu.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    mobileMenu.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  })
);

// Active section highlight
const sections = ['music', 'story', 'store', 'contact'].map((id) => document.getElementById(id));
const navAnchors = nav.querySelectorAll('.nav-links a');
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const link = nav.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
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

/* ============================================================
   Scroll reveals
   ============================================================ */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ============================================================
   Video lightbox — lite YouTube embed, iframe injected on demand
   ============================================================ */
const videoModal = document.getElementById('video-modal');
const videoFrame = document.getElementById('video-frame');
const videoTitle = document.getElementById('video-title');
let videoTrigger = null;

function openVideo(id, title) {
  videoTrigger = document.activeElement;
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
}

document.querySelectorAll('[data-video]').forEach((btn) => {
  btn.addEventListener('click', () => openVideo(btn.dataset.video, btn.dataset.videoTitle || 'Video'));
});
document.querySelectorAll('[data-video-close]').forEach((el) => el.addEventListener('click', closeVideo));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && videoModal && !videoModal.hidden) closeVideo();
});

/* ============================================================
   Ambient particles — floating dust motes (replaces matrix rain)
   ============================================================ */
const particleState = { enabled: true, raf: 0 };

function initParticles() {
  const canvas = document.getElementById('particles');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    particleState.enabled = false;
    return;
  }
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let w, h, motes;

  function resize() {
    w = canvas.width = window.innerWidth * DPR;
    h = canvas.height = window.innerHeight * DPR;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const count = Math.min(46, Math.floor(window.innerWidth / 28));
    motes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.6 + 0.4) * DPR,
      vx: (Math.random() - 0.5) * 0.12 * DPR,
      vy: (Math.random() * -0.18 - 0.05) * DPR,
      a: Math.random() * 0.5 + 0.15,
      tw: Math.random() * Math.PI * 2,
    }));
  }

  function draw() {
    if (!particleState.enabled) return;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.x += m.vx;
      m.y += m.vy;
      m.tw += 0.015;
      if (m.y < -8) {
        m.y = h + 8;
        m.x = Math.random() * w;
      }
      if (m.x < -8) m.x = w + 8;
      if (m.x > w + 8) m.x = -8;
      const alpha = m.a * (0.55 + 0.45 * Math.sin(m.tw));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(140, 240, 175, ${alpha})`;
      ctx.fill();
    }
    particleState.raf = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}

/* ============================================================
   Init
   ============================================================ */
initParticles();
renderCart();
