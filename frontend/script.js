/* Monginis Catalog — vanilla JS */
(() => {
  const API_BASE_URL = 'https://monginis-digital-catlog-1.onrender.com';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    shopInfo: null,
    categories: [],
    adminCakes: [],
  };

  const DEFAULT_SHOP_INFO = {
    address: 'Monginis Cake Shop, Beed Bypass, Near Nishant Park Hotel, CSN',
    phone: '9613661155',
    email: 'kaizenservice1@gmail.com',
    openingHours: 'Daily 10:00 AM – 9:00 PM',
    whatsappNumber: '919613661155',
    instagramUrl: '',
    facebookUrl: '',
    googleMapsUrl: 'https://maps.app.goo.gl/WbYHNrevSWsr88Fx5?g_st=ac',
    googleMapsEmbedUrl: '',
  };

  const jsonFetch = async (path, opts = {}) => {
    const url = `${API_BASE_URL}${path}`;
    let res;
    try {
      res = await fetch(url, {
        ...opts,
        credentials: 'include',
        headers: {
          ...(opts.headers || {}),
        },
      });
    } catch (err) {
      throw new Error(`Network error while calling ${path}. Check backend deployment and CORS.`);
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const message = (data && data.message) ? data.message : `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  };

  const authedFetch = (path, opts = {}) => {
    const token = localStorage.getItem('monginis_admin_token');
    return jsonFetch(path, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
  };

  const setYear = () => {
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  };

  const setBottomNavActive = () => {
    const page = document.body.dataset.page;
    const map = {
      home: 'home',
      catalog: 'catalog',
      contact: 'contact',
      about: 'about',
      details: 'catalog',
      'admin-login': null,
      'admin-dashboard': null,
    };
    const active = map[page] ?? null;
    if (!active) return;
    $$('.bottom-nav .bn').forEach(a => {
      a.classList.toggle('is-active', a.dataset.nav === active);
    });
  };

  const initBurgerMenu = () => {
    const btn = $('.burger');
    const menu = $('#mobileMenu');
    if (!btn || !menu) return;

    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

    const openMenu = () => {
      menu.hidden = false;
      if (isMobile()) {
        requestAnimationFrame(() => {
          menu.classList.add('is-open');
        });
      } else {
        menu.classList.add('is-open');
      }
      btn.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');

      if (!isMobile()) {
        menu.hidden = true;
        return;
      }

      const onEnd = () => {
        menu.hidden = true;
      };

      menu.addEventListener('transitionend', onEnd, { once: true });
      setTimeout(() => {
        if (!menu.hidden && !menu.classList.contains('is-open')) {
          menu.hidden = true;
        }
      }, 350);
    };

    btn.addEventListener('click', () => {
      const open = menu.hidden || !menu.classList.contains('is-open');
      if (open) {
        openMenu();
      } else {
        closeMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (menu.hidden) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('#mobileMenu') || target.closest('.burger')) return;
      closeMenu();
    });
  };

  const safeUrl = (maybeUrl) => {
    if (!maybeUrl || typeof maybeUrl !== 'string') return null;
    try {
      const url = new URL(maybeUrl);
      return url.toString();
    } catch {
      return null;
    }
  };

  const getCakePrimaryImageUrl = (cake) => {
    if (!cake) return null;

    // New schema: images: [{ url, publicId, ... }]
    const first = Array.isArray(cake.images) ? cake.images[0] : null;
    if (first) {
      if (typeof first === 'string') return safeUrl(first);
      if (typeof first === 'object') {
        return safeUrl(first.url) || safeUrl(first.secure_url) || safeUrl(first.secureUrl);
      }
    }

    // Legacy schema: imageUrl
    return safeUrl(cake.imageUrl) || safeUrl(cake.thumbnailUrl) || safeUrl(cake.image);
  };

  const normalizePaged = (data) => {
    if (Array.isArray(data)) {
      return { items: data, page: 1, limit: data.length, total: data.length, totalPages: 1 };
    }
    return data || { items: [], page: 1, limit: 0, total: 0, totalPages: 1 };
  };

  const matchCategorySlug = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return 'all';
    if (raw.toLowerCase() === 'all') return 'all';
    const direct = state.categories.find((c) => c.slug === raw);
    if (direct) return direct.slug;
    const byName = state.categories.find((c) => c.name.toLowerCase() === raw.toLowerCase());
    return byName ? byName.slug : raw;
  };

  const compressImageFile = (file, opts = {}) => new Promise((resolve) => {
    const maxSize = Number(opts.maxSize || 1600);
    const quality = Number(opts.quality || 0.8);
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return resolve(file);
      }
      ctx.drawImage(img, 0, 0, width, height);

      const finish = (blob, mime, ext) => {
        URL.revokeObjectURL(url);
        if (!blob) return resolve(file);
        const name = file.name.replace(/\.[^/.]+$/, `.${ext}`);
        resolve(new File([blob], name, { type: mime }));
      };

      canvas.toBlob((blob) => {
        if (blob) return finish(blob, 'image/webp', 'webp');
        canvas.toBlob((fallback) => finish(fallback, 'image/jpeg', 'jpg'), 'image/jpeg', quality);
      }, 'image/webp', quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });

  const getShopLink = (info, type) => {
    if (!info) return '#';
    if (type === 'phone') return `tel:${String(info.phone || '').replace(/\s+/g, '')}`;
    if (type === 'email') return `mailto:${String(info.email || '')}`;
    if (type === 'maps') return safeUrl(info.googleMapsUrl) || safeUrl(info.googleMapsEmbedUrl) || '#';
    return '#';
  };

  const renderFooterContacts = (info) => {
    $$('.footer-meta').forEach((meta) => {
      let strip = meta.querySelector('.footer-contact');
      if (!strip) {
        strip = document.createElement('div');
        strip.className = 'footer-contact';
        meta.prepend(strip);
      }

      strip.innerHTML = `
        <a class="footer-contact-link" href="${escapeAttr(getShopLink(info, 'phone'))}"><i class="fa-solid fa-phone"></i><span>${escapeHtml(info.phone || DEFAULT_SHOP_INFO.phone)}</span></a>
        <a class="footer-contact-link" href="${escapeAttr(getShopLink(info, 'email'))}"><i class="fa-solid fa-envelope"></i><span>${escapeHtml(info.email || DEFAULT_SHOP_INFO.email)}</span></a>
        <a class="footer-contact-link" href="${escapeAttr(getShopLink(info, 'maps'))}" target="_blank" rel="noreferrer"><i class="fa-solid fa-map-location-dot"></i><span>Open in Maps</span></a>
      `;
    });
  };

  const normalizeShopInfo = (info) => ({
    ...DEFAULT_SHOP_INFO,
    ...(info || {}),
  });

  const makeWhatsAppLink = ({ whatsappNumber, message }) => {
    const digits = String(whatsappNumber || '').replace(/\D/g, '');
    const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
    const text = message ? `?text=${encodeURIComponent(message)}` : '';
    return `${base}${text}`;
  };

  const loadShopInfo = async () => {
    if (state.shopInfo) return state.shopInfo;
    try {
      const info = normalizeShopInfo(await jsonFetch('/api/shop-info'));
      state.shopInfo = info;
      return info;
    } catch {
      state.shopInfo = normalizeShopInfo();
      return state.shopInfo;
    }
  };

  const applyShopInfoToCommonUI = async () => {
    const info = await loadShopInfo();

    const footerAddr = $('#footerAddress');
    if (footerAddr) footerAddr.textContent = info.address || 'Monginis';

    renderFooterContacts(info);

    // Quick contact (home)
    const phoneEls = $$('[data-field="phone"]');
    phoneEls.forEach(el => el.textContent = info.phone || DEFAULT_SHOP_INFO.phone);

    const emailEls = $$('[data-field="email"]');
    emailEls.forEach(el => el.textContent = info.email || DEFAULT_SHOP_INFO.email);

    const addrEls = $$('[data-field="address"]');
    addrEls.forEach(el => el.textContent = info.address || 'Monginis');

    const hoursEls = $$('[data-field="openingHours"]');
    hoursEls.forEach(el => el.textContent = info.openingHours || 'Daily');

    const phoneA = $('#contactPhone') || $('#quickPhone');
    if (phoneA && info.phone) {
      const tel = `tel:${String(info.phone).replace(/\s+/g, '')}`;
      phoneA.setAttribute('href', tel);
    }

    const emailA = $('#contactEmail') || $('#quickEmail');
    if (emailA && info.email) emailA.setAttribute('href', `mailto:${info.email}`);

    const quickLocation = $('#quickLocation');
    if (quickLocation) quickLocation.setAttribute('href', getShopLink(info, 'maps'));

    const contactMaps = $('#contactMaps');
    if (contactMaps) {
      contactMaps.setAttribute('href', getShopLink(info, 'maps'));
      contactMaps.setAttribute('target', '_blank');
      contactMaps.setAttribute('rel', 'noreferrer');
    }

    const igLinks = $$('[data-social="ig"]');
    igLinks.forEach(el => el.setAttribute('href', safeUrl(info.instagramUrl) || '#'));

    const fbLinks = $$('[data-social="fb"]');
    fbLinks.forEach(el => el.setAttribute('href', safeUrl(info.facebookUrl) || '#'));

    const waLinks = $$('[data-social="wa"]');
    waLinks.forEach(el => el.setAttribute('href', makeWhatsAppLink({ whatsappNumber: info.whatsappNumber, message: 'Hi Monginis! I want to inquire about a cake.' })));

    const emailLinks = $$('[data-contact-link="email"]');
    emailLinks.forEach(el => el.setAttribute('href', `mailto:${info.email || DEFAULT_SHOP_INFO.email}`));

    const phoneLinks = $$('[data-contact-link="phone"]');
    phoneLinks.forEach(el => el.setAttribute('href', `tel:${String(info.phone || DEFAULT_SHOP_INFO.phone).replace(/\s+/g, '')}`));

    const mapsLinks = $$('[data-contact-link="maps"]');
    mapsLinks.forEach(el => el.setAttribute('href', getShopLink(info, 'maps')));

    const waFloat = $('#waFloat');
    if (waFloat) waFloat.setAttribute('href', makeWhatsAppLink({ whatsappNumber: info.whatsappNumber, message: 'Hi Monginis! I want to inquire about a cake.' }));
  };

  const cakeCard = (cake) => {
    const img = getCakePrimaryImageUrl(cake);
    const title = cake.name || 'Cake';
    const desc = cake.description || '';

    const el = document.createElement('div');
    el.className = 'cake-card';
    el.setAttribute('data-cake-id', String(cake._id || ''));
    el.innerHTML = `
      ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(title)}" loading="lazy" />` : `<div class="cake-image" aria-hidden="true"></div>`}
      <div class="cake-info">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(desc || ' ')}</p>
        <div class="actions">
          <button class="like-btn" type="button" aria-label="Like"><i class="fa-regular fa-heart"></i></button>
          <button class="dislike-btn" type="button" aria-label="Dislike"><i class="fa-regular fa-thumbs-down"></i></button>
        </div>
      </div>
    `;

    // Click card to open details (but don't hijack like/dislike clicks)
    el.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.actions')) return;
      if (cake?._id) {
        location.href = `cake-details.html?id=${encodeURIComponent(cake._id)}`;
      }
    });
    return el;
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const escapeAttr = (s) => escapeHtml(s);

  const wireCakeActionDelegation = (root) => {
    root.addEventListener('click', async (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const card = target.closest('.cake-card');
      if (!card) return;
      const cakeId = card.getAttribute('data-cake-id');
      if (!cakeId) return;

      const likeBtn = target.closest('button.like-btn');
      const dislikeBtn = target.closest('button.dislike-btn');
      if (!likeBtn && !dislikeBtn) return;

      try {
        if (likeBtn) {
          await jsonFetch('/api/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cakeId }),
          });
        }

        if (dislikeBtn) {
          await jsonFetch('/api/dislike', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cakeId }),
          });
        }
      } catch (err) {
        console.warn(err);
      }
    });
  };

  const loadCategories = async () => {
    if (state.categories.length) return state.categories;
    try {
      const cats = await jsonFetch('/api/categories');
      state.categories = Array.isArray(cats) ? cats : [];
      return state.categories;
    } catch {
      state.categories = [];
      return state.categories;
    }
  };

  const initHome = async () => {
    await applyShopInfoToCommonUI();

    const homeInput = $('#homeCategoryInput');
    const homeList = $('#homeCategoryList');
    const homeClear = $('#homeClearFilter');
    const homeCats = await loadCategories();

    if (homeList) {
      homeList.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = 'All';
      homeList.appendChild(optAll);
      homeCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        homeList.appendChild(opt);
      });
    }

    const loadFeatured = async (categorySlug) => {
      const query = categorySlug && categorySlug !== 'all'
        ? `?category=${encodeURIComponent(categorySlug)}&limit=12`
        : '?limit=12';
      const cakes = await jsonFetch(`/api/cakes${query}`);
      return Array.isArray(cakes) ? cakes : [];
    };

    // Featured
    const slider = $('#featuredSlider');
    const skel = $('#featuredSkeleton');
    if (slider) {
      try {
        const cakes = await loadFeatured('all');
        slider.innerHTML = '';
        (cakes || []).slice(0, 10).forEach(c => {
          const el = cakeCard(c);
          el.style.minWidth = '260px';
          el.style.scrollSnapAlign = 'start';
          slider.appendChild(el);
        });
        wireCakeActionDelegation(slider);
      } catch {
        if (skel) skel.style.display = 'none';
      }
    }

    if (homeInput) {
      homeInput.addEventListener('change', async () => {
        const slug = matchCategorySlug(homeInput.value);
        if (!slider) return;
        slider.innerHTML = '';
        const cakes = await loadFeatured(slug);
        (cakes || []).slice(0, 10).forEach(c => {
          const el = cakeCard(c);
          el.style.minWidth = '260px';
          el.style.scrollSnapAlign = 'start';
          slider.appendChild(el);
        });
        wireCakeActionDelegation(slider);
      });
    }

    if (homeClear) {
      homeClear.addEventListener('click', async () => {
        if (homeInput) homeInput.value = '';
        if (!slider) return;
        slider.innerHTML = '';
        const cakes = await loadFeatured('all');
        (cakes || []).slice(0, 10).forEach(c => {
          const el = cakeCard(c);
          el.style.minWidth = '260px';
          el.style.scrollSnapAlign = 'start';
          slider.appendChild(el);
        });
        wireCakeActionDelegation(slider);
      });
    }

    // Categories preview
    const catsRoot = $('#homeCategories');
    if (catsRoot) {
      catsRoot.innerHTML = '';
      const top = homeCats.slice(0, 6);
      if (!top.length) {
        catsRoot.innerHTML = `
          <div class="chip-tile" style="grid-column:1/-1">
            <span>Categories will appear here</span>
            <i class="fa-solid fa-sparkles" style="color:var(--pink)"></i>
          </div>
        `;
      } else {
        top.forEach(cat => {
          const a = document.createElement('a');
          a.className = 'chip-tile';
          a.href = `catalog.html?category=${encodeURIComponent(cat.slug)}`;
          a.innerHTML = `<span>${escapeHtml(cat.name)}</span><i class="fa-solid fa-arrow-right" style="color:var(--pink)"></i>`;
          catsRoot.appendChild(a);
        });
      }
    }

    // Most loved
    const lovedRoot = $('#homeLoved');
    if (lovedRoot) {
      try {
        const cakes = await jsonFetch('/api/cakes?sort=mostLoved&limit=6');
        lovedRoot.innerHTML = '';
        (cakes || []).slice(0, 6).forEach(c => lovedRoot.appendChild(cakeCard(c)));
        wireCakeActionDelegation(lovedRoot);
      } catch {
        lovedRoot.innerHTML = '';
      }
    }
  };

  const initCatalog = async () => {
    await applyShopInfoToCommonUI();

    const chips = $('#categoryChips');
    const grid = $('#catalogGrid');
    const empty = $('#catalogEmpty');
    const catInput = $('#catalogCategoryInput');
    const catList = $('#catalogCategoryList');
    const clearBtn = $('#catalogClearFilter');
    const pagination = $('#catalogPagination');
    const prevBtn = $('#catalogPrev');
    const nextBtn = $('#catalogNext');
    const pageInfo = $('#catalogPageInfo');
    if (!grid) return;

    wireCakeActionDelegation(grid);

    const url = new URL(location.href);
    const initialCategory = url.searchParams.get('category');

    const setActiveChip = (slug) => {
      if (!chips) return;
      $$('.chip', chips).forEach(b => b.classList.toggle('active', b.dataset.category === slug));
    };

    const renderCakes = (cakes) => {
      grid.innerHTML = '';
      const items = Array.isArray(cakes) ? cakes : [];
      if (!items.length) {
        if (empty) empty.hidden = false;
        if (pagination) pagination.hidden = true;
        return;
      }
      if (empty) empty.hidden = true;
      items.forEach(c => grid.appendChild(cakeCard(c)));
    };

    const updatePagination = (page, totalPages, limit) => {
      if (!pagination || !pageInfo || !prevBtn || !nextBtn) return;
      pagination.hidden = totalPages <= 1;
      const perPage = Number(limit || 12);
      pageInfo.textContent = `Page ${page} of ${totalPages} • ${perPage} per page`;
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= totalPages;
    };

    const loadCakes = async (categorySlug, page) => {
      const query = new URLSearchParams();
      if (categorySlug && categorySlug !== 'all') query.set('category', categorySlug);
      query.set('page', String(page));
      query.set('limit', '12');
      const out = normalizePaged(await jsonFetch(`/api/cakes?${query.toString()}`));
      renderCakes(out.items || []);
      updatePagination(out.page || 1, out.totalPages || 1, out.limit || 12);
      return out;
    };

    let currentPage = 1;
    let currentCategory = initialCategory || 'all';

    if (chips) {
      const cats = await loadCategories();
      cats.forEach(cat => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.dataset.category = cat.slug;
        b.textContent = cat.name;
        chips.appendChild(b);
      });

      chips.addEventListener('click', async (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const chip = t.closest('button.chip');
        if (!chip) return;
        const slug = chip.dataset.category;
        setActiveChip(slug);
        currentCategory = slug || 'all';
        currentPage = 1;
        if (catInput) {
          const cat = state.categories.find(c => c.slug === slug);
          catInput.value = slug === 'all' ? '' : (cat?.name || slug || '');
        }
        await loadCakes(currentCategory, currentPage);
      });
    }

    if (catList) {
      catList.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = 'All';
      catList.appendChild(optAll);
      state.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        catList.appendChild(opt);
      });
    }

    if (catInput) {
      catInput.addEventListener('change', async () => {
        const slug = matchCategorySlug(catInput.value);
        setActiveChip(slug);
        currentCategory = slug || 'all';
        currentPage = 1;
        await loadCakes(currentCategory, currentPage);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (catInput) catInput.value = '';
        setActiveChip('all');
        currentCategory = 'all';
        currentPage = 1;
        await loadCakes(currentCategory, currentPage);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        if (currentPage <= 1) return;
        currentPage -= 1;
        await loadCakes(currentCategory, currentPage);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        currentPage += 1;
        await loadCakes(currentCategory, currentPage);
      });
    }

    if (initialCategory) {
      setActiveChip(initialCategory);
      currentCategory = initialCategory;
      if (catInput) {
        const cat = state.categories.find(c => c.slug === initialCategory);
        catInput.value = cat?.name || initialCategory;
      }
      await loadCakes(currentCategory, currentPage);
    } else {
      setActiveChip('all');
      await loadCakes('all', currentPage);
    }
  };

  const initDetails = async () => {
    await applyShopInfoToCommonUI();

    const root = $('#detailsRoot');
    const similar = $('#similarGrid');
    if (!root) return;

    if (similar) wireCakeActionDelegation(similar);

    const params = new URL(location.href).searchParams;
    const id = params.get('id');
    if (!id) {
      root.innerHTML = `<div class="panel"><h1 class="h1">Cake not found</h1><p class="muted">Missing cake id.</p><a class="btn primary" href="catalog.html">Back</a></div>`;
      return;
    }

    try {
      const cake = await jsonFetch(`/api/cakes/${encodeURIComponent(id)}`);
      document.title = `${cake.name || 'Cake'} — Monginis`;

      const img = getCakePrimaryImageUrl(cake);

      root.innerHTML = `
        <div class="details">
          <div class="detail-media-wrap">
            <div class="detail-badge-row">
              <span class="detail-badge"><i class="fa-solid fa-sparkles"></i> Premium Cake</span>
              <span class="detail-badge"><i class="fa-solid fa-cake-candles"></i> Inquiry Ready</span>
            </div>
            <div class="media detail-media">
              ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(cake.name || 'Cake')}" loading="eager" />` : ''}
            </div>
          </div>
          <div class="body">
            <div class="detail-card detail-intro">
              <div class="detail-kicker">Monginis Signature Collection</div>
              <h1 class="title">${escapeHtml(cake.name || 'Cake')}</h1>
              ${cake.description ? `<p class="sub">${escapeHtml(cake.description)}</p>` : `<p class="sub">Premium Monginis creation.</p>`}
              <div class="detail-actions">
                <button class="pill-btn" type="button" data-detail-like><i class="fa-regular fa-heart"></i> Like</button>
                <button class="pill-btn" type="button" data-detail-dislike><i class="fa-regular fa-thumbs-down"></i> Dislike</button>
              </div>
            </div>

            <div class="detail-form">
              <div class="detail-kicker">WhatsApp Inquiry</div>
              <div class="field">
                <label for="weightInput">Enter weight (Kg)</label>
                <input type="number" id="weightInput" class="input" placeholder="Enter weight (Kg)" min="0.5" step="0.5">
                <div class="muted tiny">Enter weight as per your requirement (e.g. 0.5 Kg, 1 Kg, 2 Kg)</div>
              </div>

              <div class="inquiry-note">
                <i class="fa-solid fa-comment-dots"></i>
                <span>Send your requirement on WhatsApp and we will coordinate your cake order.</span>
              </div>

              <div class="buttons detail-buttons">
                <a class="btn ghost" href="catalog.html"><i class="fa-solid fa-arrow-left"></i> Back</a>
                <button class="btn primary detail-wa-btn" type="button" data-detail-wa><i class="fa-brands fa-whatsapp"></i> Inquire on WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      `;

      const waBtn = $('[data-detail-wa]', root);
      const likeBtn = $('[data-detail-like]', root);
      const dislikeBtn = $('[data-detail-dislike]', root);

      const weightInput = $('#weightInput', root);

      if (waBtn) {
        waBtn.addEventListener('click', () => {
          const raw = weightInput instanceof HTMLInputElement ? weightInput.value : '';
          const entered = Number(raw);
          if (!raw || !Number.isFinite(entered) || entered <= 0) {
            alert('Please enter required cake weight');
            return;
          }

          const message = [
            'Hello, I want to order a cake:',
            '',
            `Name: ${cake.name || 'Cake'}`,
            `Weight: ${entered} Kg`,
            `Image: ${img || getCakePrimaryImageUrl(cake) || ''}`,
          ].join('\n');

          const link = `https://wa.me/919613661155?text=${encodeURIComponent(message)}`;
          window.open(link, '_blank', 'noreferrer');
        });
      }

      if (likeBtn) {
        likeBtn.addEventListener('click', async () => {
          try {
            await jsonFetch('/api/like', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cakeId: cake._id }),
            });
          } catch (err) {
            console.warn(err);
          }
        });
      }

      if (dislikeBtn) {
        dislikeBtn.addEventListener('click', async () => {
          try {
            await jsonFetch('/api/dislike', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cakeId: cake._id }),
            });
          } catch (err) {
            console.warn(err);
          }
        });
      }

      // Similar cakes
      if (similar) {
        const list = await jsonFetch(`/api/cakes?category=${encodeURIComponent(cake.categorySlug || cake.category?.slug || '')}`);
        similar.innerHTML = '';
        (Array.isArray(list) ? list : []).filter(c => c._id !== cake._id).slice(0, 6).forEach(c => similar.appendChild(cakeCard(c)));
      }

    } catch (err) {
      root.innerHTML = `<div class="panel"><h1 class="h1">Cake not found</h1><p class="muted">${escapeHtml(err.message || 'Please try again.')}</p><a class="btn primary" href="catalog.html">Back</a></div>`;
    }
  };

  const initContact = async () => {
    await applyShopInfoToCommonUI();

    const info = await loadShopInfo();
    const mapWrap = $('#mapWrap');
    if (mapWrap) {
      const embed = safeUrl(info.googleMapsEmbedUrl);
      const canEmbed = Boolean(embed && String(info.googleMapsEmbedUrl || '').includes('/maps/embed'));
      if (canEmbed) {
        mapWrap.innerHTML = `<iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${escapeAttr(embed)}" title="Google Maps"></iframe>`;
      } else {
        mapWrap.innerHTML = `
          <div class="empty">
            <h2 class="h2">Find us on the map</h2>
            <p class="muted">Use the button below to open the shop location in Google Maps.</p>
          </div>
        `;
      }
    }
  };

  const initAbout = async () => {
    await applyShopInfoToCommonUI();
  };

  // Admin
  const initAdminLogin = async () => {
    setYear();
    const form = $('#adminLoginForm');
    const msg = $('#adminMsg');
    const btn = $('#adminLoginBtn');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = String($('#adminEmail')?.value || '').trim();
      const password = String($('#adminPassword')?.value || '');

      if (!email || !password) {
        if (msg) msg.textContent = 'Enter email and password.';
        return;
      }

      if (btn) btn.disabled = true;
      if (msg) msg.textContent = 'Signing in…';

      try {
        const out = await jsonFetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('monginis_admin_token', out.token);
        location.href = 'admin-dashboard.html';
      } catch (err) {
        if (msg) msg.textContent = err.message || 'Login failed.';
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  };

  const initAdminDashboard = async () => {
    setYear();

    const token = localStorage.getItem('monginis_admin_token');
    if (!token) {
      location.href = 'admin-login.html';
      return;
    }

    const logoutBtn = $('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('monginis_admin_token');
        location.href = 'admin-login.html';
      });
    }

    const toast = (t) => {
      const el = $('#adminToast');
      if (!el) return;
      el.textContent = t;
      el.hidden = false;
      setTimeout(() => { el.hidden = true; }, 1600);
    };

    const fetchAllCakes = async () => {
      const items = [];
      let page = 1;
      let totalPages = 1;
      do {
        const out = normalizePaged(await authedFetch(`/api/cakes?limit=100&page=${page}`));
        items.push(...(out.items || []));
        totalPages = Number(out.totalPages || 1);
        page += 1;
      } while (page <= totalPages);
      return items;
    };

    const filterState = { search: '', categoryId: '' };

    const applyCakeFilters = () => {
      const search = filterState.search.trim().toLowerCase();
      const categoryId = filterState.categoryId;
      let list = [...state.adminCakes];
      if (categoryId) {
        list = list.filter(c => String(c.category?._id || c.category || '') === categoryId);
      }
      if (search) {
        list = list.filter(c => String(c.name || '').toLowerCase().includes(search));
      }
      renderCakes(list);
    };

    const refreshAll = async () => {
      const [cats, cakes, info] = await Promise.all([
        authedFetch('/api/categories'),
        fetchAllCakes(),
        authedFetch('/api/shop-info'),
      ]);
      state.categories = Array.isArray(cats) ? cats : [];
      state.shopInfo = info;
      state.adminCakes = Array.isArray(cakes) ? cakes : [];
      renderCategories();
      renderShopInfo(info);
      renderAnalytics(state.adminCakes);
      fillCategorySelects();
      applyCakeFilters();
    };

    const catList = $('#catList');
    const cakeList = $('#cakeList');

    const fillCategorySelects = () => {
      const selects = $$('.categorySelect');
      selects.forEach(sel => {
        const current = sel.value;
        const wantsAll = sel.dataset.allOption === '1' || sel.id === 'adminCakeCategory';
        sel.innerHTML = wantsAll
          ? '<option value="">All categories</option>'
          : '<option value="">Select category</option>';
        state.categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat._id;
          opt.textContent = cat.name;
          sel.appendChild(opt);
        });
        if (current) sel.value = current;
      });
    };


    const renderCategories = () => {
      if (!catList) return;
      catList.innerHTML = '';
      if (!state.categories.length) {
        catList.innerHTML = `<div class="row"><div class="row-head"><div class="row-title">No categories</div></div><small>Create one below.</small></div>`;
        return;
      }

      state.categories.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
          <div class="row-head">
            <div>
              <div class="row-title">${escapeHtml(cat.name)}</div>
              <small>${escapeHtml(cat.slug)}</small>
            </div>
            <div class="admin-actions">
              <button class="btn ghost" type="button" data-cat-edit="${escapeAttr(cat._id)}"><i class="fa-solid fa-pen"></i> Edit</button>
              <button class="btn danger" type="button" data-cat-del="${escapeAttr(cat._id)}"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </div>
          <div class="details-block" hidden data-cat-form="${escapeAttr(cat._id)}">
            <div class="field"><label>Category name</label><input class="input" value="${escapeAttr(cat.name)}" data-cat-name /></div>
            <button class="btn primary" type="button" data-cat-save="${escapeAttr(cat._id)}"><i class="fa-solid fa-check"></i> Save</button>
          </div>
        `;
        catList.appendChild(row);
      });
    };

    const renderCakes = (cakes) => {
      if (!cakeList) return;
      const list = Array.isArray(cakes) ? cakes : [];
      cakeList.innerHTML = '';
      if (!list.length) {
        cakeList.innerHTML = `<div class="row"><div class="row-head"><div class="row-title">No cakes yet</div></div><small>Upload images and create a cake.</small></div>`;
        return;
      }

      list.forEach(cake => {
        const row = document.createElement('div');
        row.className = 'row';
        const legacyImg = getCakePrimaryImageUrl(cake);
        const imgCount = Array.isArray(cake.images) ? cake.images.length : (legacyImg ? 1 : 0);
        row.innerHTML = `
          <div class="row-head">
            <div>
              <div class="row-title">${escapeHtml(cake.name || 'Cake')}</div>
              <small>${escapeHtml(cake.categoryName || 'Category')} • ${imgCount} image(s)</small>
            </div>
            <div class="admin-actions">
              <button class="btn ghost" type="button" data-cake-toggle="${escapeAttr(cake._id)}"><i class="fa-solid fa-gear"></i> Manage</button>
              <button class="btn danger" type="button" data-cake-del="${escapeAttr(cake._id)}"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </div>
          <div class="details-block" hidden data-cake-panel="${escapeAttr(cake._id)}">
            <div class="grid two">
              <div class="field"><label>Name</label><input class="input" value="${escapeAttr(cake.name || '')}" data-cake-name /></div>
              <div class="field"><label>Category</label>
                <select class="input categorySelect" data-cake-cat>
                  <option value="">Select category</option>
                </select>
              </div>
            </div>
            <div class="field"><label>Description</label><textarea class="input" rows="3" data-cake-desc>${escapeHtml(cake.description || '')}</textarea></div>

            <div>
              <div class="muted" style="font-weight:900;margin-bottom:8px;">Images</div>
              <div class="img-strip" data-img-strip>
                ${(
                  (Array.isArray(cake.images) && cake.images.length)
                    ? cake.images
                    : (legacyImg ? [{ url: legacyImg, publicId: cake.imagePublicId || 'legacy' }] : [])
                ).map(im => `
                  <div class="img-chip">
                    <img src="${escapeAttr(im.url)}" alt="" loading="lazy" />
                    ${im.publicId && im.publicId !== 'legacy'
                      ? `<button type="button" aria-label="Delete image" data-img-del="${escapeAttr(im.publicId)}"><i class="fa-solid fa-xmark"></i></button>`
                      : ``
                    }
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="grid two">
              <div class="field"><label>Upload more images</label><input class="input" type="file" accept="image/*" multiple data-cake-files /></div>
              <div class="field"><label>&nbsp;</label><button class="btn primary" type="button" data-cake-upload><i class="fa-solid fa-cloud-arrow-up"></i> Upload</button></div>
            </div>

            <button class="btn primary" type="button" data-cake-save><i class="fa-solid fa-check"></i> Save changes</button>
            <div class="count-row">
              <span><i class="fa-solid fa-heart" style="color:#e91e63"></i> ${cake.likes ?? 0}</span>
              <span><i class="fa-solid fa-thumbs-down" style="color:#7c4dff"></i> ${cake.dislikes ?? 0}</span>
            </div>
          </div>
        `;
        cakeList.appendChild(row);

        // Set category select after render
        const sel = $('[data-cake-cat]', row);
        if (sel && cake.category) sel.value = typeof cake.category === 'string' ? cake.category : cake.category._id;
      });

      fillCategorySelects();

      // Set selects to current values
      list.forEach((cake, idx) => {
        const row = cakeList.children[idx];
        const sel = row ? row.querySelector('[data-cake-cat]') : null;
        if (sel) {
          const cid = (typeof cake.category === 'string') ? cake.category : cake.category?._id;
          if (cid) sel.value = cid;
        }
      });
    };

    const renderShopInfo = (info) => {
      $('#shopAddress').value = info.address || '';
      $('#shopPhone').value = info.phone || '';
      $('#shopEmail').value = info.email || '';
      $('#shopHours').value = info.openingHours || '';
      $('#shopWhatsapp').value = info.whatsappNumber || '';
      $('#shopInstagram').value = info.instagramUrl || '';
      $('#shopFacebook').value = info.facebookUrl || '';
      $('#shopMaps').value = info.googleMapsUrl || info.googleMapsEmbedUrl || '';
    };

    const renderAnalytics = (cakes) => {
      const list = Array.isArray(cakes) ? cakes : [];
      const totalLikes = list.reduce((sum, c) => sum + (Number(c.likes) || 0), 0);
      const totalDislikes = list.reduce((sum, c) => sum + (Number(c.dislikes) || 0), 0);
      $('#anaLikes').textContent = String(totalLikes);
      $('#anaDislikes').textContent = String(totalDislikes);
      const top = [...list].sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0)).slice(0, 5);
      const box = $('#anaTop');
      box.innerHTML = '';
      top.forEach(c => {
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `<div class="row-head"><div class="row-title">${escapeHtml(c.name || 'Cake')}</div><small>${Number(c.likes) || 0} likes</small></div>`;
        box.appendChild(div);
      });
      if (!top.length) box.innerHTML = `<div class="row"><div class="row-head"><div class="row-title">No data yet</div></div><small>Likes/dislikes appear once customers interact.</small></div>`;
    };

    // Category create
    const catCreateForm = $('#catCreateForm');
    if (catCreateForm) {
      catCreateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = String($('#newCatName').value || '').trim();
        if (!name) return;
        await authedFetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        $('#newCatName').value = '';
        toast('Category created');
        await refreshAll();
      });
    }

    // Cake create
    const cakeCreateForm = $('#cakeCreateForm');
    let pendingUpload = [];

    const uploadImages = async (files, categoryId) => {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('images', f));
      if (categoryId) fd.append('categoryId', categoryId);
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.message || 'Upload failed');
      return out.images;
    };

    if (cakeCreateForm) {
      const uploadBtn = $('#createUploadBtn');
      const filesInput = $('#createCakeFiles');
      const uploadedLabel = $('#createUploadedLabel');

      if (uploadBtn && filesInput) {
        uploadBtn.addEventListener('click', async () => {
          if (!filesInput.files || !filesInput.files.length) {
            toast('Pick images first');
            return;
          }
          uploadBtn.disabled = true;
          uploadBtn.textContent = 'Uploading…';
          try {
            const categoryId = String($('#createCakeCategory')?.value || '').trim();
            pendingUpload = await uploadImages(filesInput.files, categoryId);
            if (uploadedLabel) uploadedLabel.textContent = `${pendingUpload.length} image(s) uploaded`;
            toast('Images uploaded');
          } catch (err) {
            toast(err.message || 'Upload failed');
          } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';
          }
        });
      }

      cakeCreateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = String($('#createCakeName').value || '').trim();
        const categoryId = String($('#createCakeCategory').value || '').trim();
        const description = String($('#createCakeDesc').value || '').trim();

        if (!name || !categoryId) {
          toast('Name and category required');
          return;
        }

        await authedFetch('/api/cakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, categoryId, description, images: pendingUpload }),
        });

        pendingUpload = [];
        if (uploadedLabel) uploadedLabel.textContent = 'No uploads yet';
        $('#createCakeName').value = '';
        $('#createCakeDesc').value = '';
        if (filesInput) filesInput.value = '';

        toast('Cake created');
        await refreshAll();
      });
    }

    const adminSearch = $('#adminCakeSearch');
    const adminCategory = $('#adminCakeCategory');
    if (adminSearch) {
      adminSearch.addEventListener('input', () => {
        filterState.search = String(adminSearch.value || '');
        applyCakeFilters();
      });
    }
    if (adminCategory) {
      adminCategory.addEventListener('change', () => {
        filterState.categoryId = String(adminCategory.value || '');
        applyCakeFilters();
      });
    }

    const bulkForm = $('#bulkUploadForm');
    if (bulkForm) {
      const bulkCategory = $('#bulkCategory');
      const bulkFiles = $('#bulkFiles');
      const bulkHint = $('#bulkFilesHint');
      const bulkBtn = $('#bulkUploadBtn');
      const bulkProgress = $('#bulkProgress');
      const bulkStatus = $('#bulkStatus');
      const bulkCounts = $('#bulkCounts');
      const bulkPercent = $('#bulkPercent');
      const bulkFailed = $('#bulkFailed');
      const bulkUploaded = $('#bulkUploaded');
      const bulkBarFill = $('#bulkBarFill');
      const bulkResults = $('#bulkResults');
      const bulkGrid = $('#bulkGrid');
      const bulkSummary = $('#bulkSummary');

      const updateBulkUI = (state) => {
        if (bulkCounts) {
          bulkCounts.textContent = `Uploading ${state.uploaded} / ${state.total} images...`;
        }
        if (bulkPercent) bulkPercent.textContent = `${Math.round(state.percent)}%`;
        if (bulkFailed) bulkFailed.textContent = `Failed: ${state.failed}`;
        if (bulkUploaded) bulkUploaded.textContent = `Uploaded: ${state.uploaded}`;
        if (bulkBarFill) bulkBarFill.style.width = `${Math.max(0, Math.min(100, state.percent))}%`;
        const bar = bulkBarFill?.parentElement;
        if (bar) bar.setAttribute('aria-valuenow', String(Math.round(state.percent)));
      };

      const bulkCard = (cake) => {
        const img = getCakePrimaryImageUrl(cake);
        const el = document.createElement('div');
        el.className = 'card bulk-card';
        el.innerHTML = `
          <div class="card-media">
            ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(cake.name || 'Cake')}" loading="lazy" />` : ''}
          </div>
          <div class="card-body">
            <div class="card-title">${escapeHtml(cake.name || 'Cake')}</div>
            <div class="card-meta">
              <span class="pill">${escapeHtml(cake.categoryName || 'Category')}</span>
            </div>
            <div class="count-row">
              <span><i class="fa-solid fa-heart" style="color:#e91e63"></i> ${cake.likes ?? 0}</span>
              <span><i class="fa-solid fa-thumbs-down" style="color:#7c4dff"></i> ${cake.dislikes ?? 0}</span>
            </div>
            <div class="action-row">
              <span class="action like" aria-hidden="true"><i class="fa-regular fa-heart"></i></span>
              <span class="action dislike" aria-hidden="true"><i class="fa-regular fa-thumbs-down"></i></span>
              ${img ? `<a class="action download" href="${escapeAttr(img)}" download target="_blank" rel="noreferrer" aria-label="Download"><i class="fa-solid fa-download"></i></a>` : '<span class="action download" aria-hidden="true"></span>'}
              <span class="action" aria-hidden="true"><i class="fa-solid fa-cake-candles"></i></span>
            </div>
          </div>
        `;
        return el;
      };

      const uploadBulkBatch = (files, categoryId, onProgress) => new Promise((resolve, reject) => {
        const fd = new FormData();
        if (categoryId) fd.append('categoryId', categoryId);
        files.forEach((file) => fd.append('images', file));

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/cakes/bulk`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable || !onProgress) return;
          onProgress((e.loaded / e.total) * 100);
        };

        xhr.onload = () => {
          let out = null;
          try {
            out = JSON.parse(xhr.responseText || '{}');
          } catch {
            return reject(new Error('Upload failed'));
          }
          if (xhr.status >= 200 && xhr.status < 300) return resolve(out);
          return reject(new Error(out.message || 'Upload failed'));
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(fd);
      });

      if (bulkFiles && bulkHint) {
        bulkFiles.addEventListener('change', () => {
          const count = bulkFiles.files ? bulkFiles.files.length : 0;
          bulkHint.textContent = count ? `${count} image(s) selected` : 'No files selected';
        });
      }

      bulkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = String(bulkCategory?.value || '').trim();
        const files = bulkFiles?.files ? Array.from(bulkFiles.files) : [];
        if (!categoryId) {
          toast('Select a category');
          return;
        }
        if (!files.length) {
          toast('Pick images first');
          return;
        }
        if (files.length > 30) {
          toast('Select up to 30 images');
          return;
        }

        if (bulkBtn) bulkBtn.disabled = true;
        if (bulkProgress) bulkProgress.hidden = false;
        if (bulkResults) bulkResults.hidden = true;
        if (bulkGrid) bulkGrid.innerHTML = '';
        if (bulkSummary) bulkSummary.textContent = 'Uploading...';

        const stats = { total: files.length, uploaded: 0, failed: 0, percent: 0 };
        updateBulkUI(stats);

        try {
          if (bulkStatus) bulkStatus.textContent = 'Optimizing images…';
          const optimized = [];
          for (let i = 0; i < files.length; i += 1) {
            if (bulkStatus) bulkStatus.textContent = `Optimizing ${i + 1} / ${files.length} images…`;
            // Keep memory steady: process sequentially
            // eslint-disable-next-line no-await-in-loop
            const out = await compressImageFile(files[i], { maxSize: 1600, quality: 0.8 });
            optimized.push(out);
          }

          const batchSize = 6;
          const created = [];
          for (let i = 0; i < optimized.length; i += batchSize) {
            const batch = optimized.slice(i, i + batchSize);
            const basePercent = (stats.uploaded / stats.total) * 100;
            const batchWeight = (batch.length / stats.total) * 100;
            if (bulkStatus) bulkStatus.textContent = 'Uploading...';

            // eslint-disable-next-line no-await-in-loop
            const result = await uploadBulkBatch(batch, categoryId, (pct) => {
              stats.percent = basePercent + (pct / 100) * batchWeight;
              updateBulkUI(stats);
            });

            const newCreated = Array.isArray(result.created) ? result.created : [];
            const newFailed = Array.isArray(result.failed) ? result.failed.length : 0;
            created.push(...newCreated);
            stats.uploaded += newCreated.length;
            stats.failed += newFailed;
            stats.percent = (stats.uploaded / stats.total) * 100;
            updateBulkUI(stats);
          }

          if (bulkStatus) bulkStatus.textContent = 'Upload complete';
          if (bulkCounts) bulkCounts.textContent = `Uploaded ${stats.uploaded} / ${stats.total} images.`;
          if (bulkSummary) bulkSummary.textContent = `Created ${created.length} cakes, ${stats.failed} failed.`;
          if (bulkResults) bulkResults.hidden = false;
          if (bulkGrid) created.forEach(cake => bulkGrid.appendChild(bulkCard(cake)));
          toast('Bulk upload complete');
          await refreshAll();
        } catch (err) {
          if (bulkStatus) bulkStatus.textContent = 'Upload failed';
          toast(err.message || 'Bulk upload failed');
        } finally {
          if (bulkBtn) bulkBtn.disabled = false;
        }
      });
    }

    // Shop info save
    const shopForm = $('#shopForm');
    if (shopForm) {
      shopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          address: $('#shopAddress').value,
          phone: $('#shopPhone').value,
          email: $('#shopEmail').value,
          openingHours: $('#shopHours').value,
          whatsappNumber: $('#shopWhatsapp').value,
          instagramUrl: $('#shopInstagram').value,
          facebookUrl: $('#shopFacebook').value,
          googleMapsUrl: $('#shopMaps').value,
          googleMapsEmbedUrl: $('#shopMaps').value,
        };
        await authedFetch('/api/shop-info', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast('Shop info updated');
        await refreshAll();
      });
    }

    // Delegation: categories and cakes
    document.addEventListener('click', async (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const catEdit = t.closest('[data-cat-edit]');
      const catDel = t.closest('[data-cat-del]');
      const catSave = t.closest('[data-cat-save]');

      if (catEdit) {
        const id = catEdit.getAttribute('data-cat-edit');
        const block = document.querySelector(`[data-cat-form="${CSS.escape(id)}"]`);
        if (block) block.hidden = !block.hidden;
      }

      if (catDel) {
        const id = catDel.getAttribute('data-cat-del');
        if (!confirm('Delete this category?')) return;
        await authedFetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
        toast('Category deleted');
        await refreshAll();
      }

      if (catSave) {
        const id = catSave.getAttribute('data-cat-save');
        const block = document.querySelector(`[data-cat-form="${CSS.escape(id)}"]`);
        const name = block ? String(block.querySelector('[data-cat-name]')?.value || '').trim() : '';
        if (!name) return;
        await authedFetch(`/api/categories/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        toast('Category updated');
        await refreshAll();
      }


      const cakeToggle = t.closest('[data-cake-toggle]');
      const cakeDel = t.closest('[data-cake-del]');

      if (cakeToggle) {
        const id = cakeToggle.getAttribute('data-cake-toggle');
        const panel = document.querySelector(`[data-cake-panel="${CSS.escape(id)}"]`);
        if (panel) panel.hidden = !panel.hidden;
      }

      if (cakeDel) {
        const id = cakeDel.getAttribute('data-cake-del');
        if (!confirm('Delete this cake and all its images?')) return;
        await authedFetch(`/api/cakes/${encodeURIComponent(id)}`, { method: 'DELETE' });
        toast('Cake deleted');
        await refreshAll();
      }

      const cakeSave = t.closest('[data-cake-save]');
      const cakeUpload = t.closest('[data-cake-upload]');

      if (cakeSave || cakeUpload) {
        const panel = t.closest('[data-cake-panel]');
        const cakeId = panel ? panel.getAttribute('data-cake-panel') : null;
        if (!panel || !cakeId) return;

        if (cakeUpload) {
          const input = panel.querySelector('[data-cake-files]');
          if (!input?.files || !input.files.length) {
            toast('Pick images first');
            return;
          }
          cakeUpload.disabled = true;
          cakeUpload.textContent = 'Uploading…';
          try {
            const categoryId = String(panel.querySelector('[data-cake-cat]')?.value || '').trim();
            const uploaded = await uploadImages(input.files, categoryId);
            // Save uploaded images into cake
            await authedFetch(`/api/cakes/${encodeURIComponent(cakeId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appendImages: uploaded }),
            });
            toast('Images added');
            await refreshAll();
          } catch (err) {
            toast(err.message || 'Upload failed');
          } finally {
            cakeUpload.disabled = false;
            cakeUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload';
          }
        }

        if (cakeSave) {
          const name = String(panel.querySelector('[data-cake-name]')?.value || '').trim();
          const categoryId = String(panel.querySelector('[data-cake-cat]')?.value || '').trim();
          const description = String(panel.querySelector('[data-cake-desc]')?.value || '').trim();

          await authedFetch(`/api/cakes/${encodeURIComponent(cakeId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, categoryId, description }),
          });
          toast('Cake updated');
          await refreshAll();
        }
      }

      const imgDel = t.closest('[data-img-del]');
      if (imgDel) {
        const panel = t.closest('[data-cake-panel]');
        const cakeId = panel ? panel.getAttribute('data-cake-panel') : null;
        const publicId = imgDel.getAttribute('data-img-del');
        if (!cakeId || !publicId) return;
        if (!confirm('Delete this image?')) return;
        await authedFetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cakeId, publicId }),
        });
        toast('Image deleted');
        await refreshAll();
      }
    });

    try {
      await refreshAll();
    } catch (err) {
      console.warn(err);
      localStorage.removeItem('monginis_admin_token');
      location.href = 'admin-login.html';
    }
  };

  const boot = async () => {
    document.body.classList.add('is-loaded');
    setYear();
    setBottomNavActive();
    initBurgerMenu();

    const page = document.body.dataset.page;
    try {
      if (page === 'home') await initHome();
      if (page === 'catalog') await initCatalog();
      if (page === 'details') await initDetails();
      if (page === 'contact') await initContact();
      if (page === 'about') await initAbout();
      if (page === 'admin-login') await initAdminLogin();
      if (page === 'admin-dashboard') await initAdminDashboard();
    } catch (err) {
      console.warn(err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
