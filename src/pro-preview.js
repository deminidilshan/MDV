// pro-preview.js — Interactive dashboard-quality preview enhancements

let observer = null;
let counterObserver = null;

/**
 * Enhance the preview container with Pro features:
 * - Scroll-triggered animations
 * - Counter animations for numbers
 * - Copy buttons on code blocks
 * - Language badges on code blocks
 */
export function enhanceProPreview(container) {
  if (!container) return;

  // Add pro-preview class
  container.classList.add('pro-preview');

  // 1. Add scroll animations to block elements
  addScrollAnimations(container);

  // 2. Enhance code blocks
  enhanceCodeBlocks(container);

  // 3. Animate counters
  animateCounters(container);

  // 4. Add hover effects to images (lightbox prep)
  enhanceImages(container);
}

function addScrollAnimations(container) {
  // Clean up previous observer
  if (observer) observer.disconnect();

  const animatable = container.querySelectorAll(
    'h1, h2, h3, h4, h5, h6, p, pre, blockquote, table, ul, ol, img, hr'
  );

  animatable.forEach(el => {
    el.classList.add('pro-animate');
  });

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  animatable.forEach(el => observer.observe(el));
}

function enhanceCodeBlocks(container) {
  const preBlocks = container.querySelectorAll('pre');

  preBlocks.forEach(pre => {
    const codeEl = pre.querySelector('code');
    if (!codeEl) return;

    // Detect language from class
    const langClass = Array.from(codeEl.classList).find(c => c.startsWith('language-') || c.startsWith('hljs '));
    const lang = langClass
      ? langClass.replace('language-', '').replace('hljs ', '')
      : null;

    // Add language badge
    if (lang && lang !== 'undefined') {
      const badge = document.createElement('span');
      badge.className = 'code-lang-badge';
      badge.textContent = lang;
      pre.style.position = 'relative';
      pre.appendChild(badge);
    }

    // Add copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋';
    copyBtn.title = 'Copy code';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        copyBtn.innerHTML = '✓';
        copyBtn.style.color = 'var(--accent)';
        setTimeout(() => {
          copyBtn.innerHTML = '📋';
          copyBtn.style.color = '';
        }, 1500);
      });
    });
    pre.style.position = 'relative';

    // Position copy button (move badge if both exist)
    if (lang && lang !== 'undefined') {
      copyBtn.style.right = '70px';
    }
    pre.appendChild(copyBtn);
  });
}

function animateCounters(container) {
  if (counterObserver) counterObserver.disconnect();

  // Find standalone numbers in text nodes (e.g. "100+", "$500", "50%")
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip code blocks and pre
        if (node.parentElement.closest('pre, code')) return NodeFilter.FILTER_REJECT;
        // Only process if has a number
        if (/\d{2,}/.test(node.textContent)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_REJECT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    // Match numbers with optional prefix/suffix ($100, 50%, 1000+, etc.)
    const regex = /([$ ]?)(\d{2,}(?:\.\d+)?)([ %+kKmMbB]*)/g;
    let match;
    const parts = [];
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const prefix = match[1];
      const num = parseFloat(match[2]);
      const suffix = match[3];
      const span = document.createElement('span');
      span.className = 'counter-animate';
      span.dataset.target = num;
      span.dataset.prefix = prefix;
      span.dataset.suffix = suffix;
      span.dataset.decimals = match[2].includes('.') ? match[2].split('.')[1].length : 0;
      span.textContent = prefix + '0' + suffix;
      parts.push(span);
      lastIndex = regex.lastIndex;
    }

    if (parts.length > 0) {
      if (lastIndex < text.length) {
        parts.push(document.createTextNode(text.slice(lastIndex)));
      }
      const fragment = document.createDocumentFragment();
      parts.forEach(p => fragment.appendChild(p));
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  });

  // Animate counters on scroll
  const counters = container.querySelectorAll('.counter-animate');
  counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          animateNumber(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach(el => counterObserver.observe(el));
}

function animateNumber(el) {
  const target = parseFloat(el.dataset.target);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const decimals = parseInt(el.dataset.decimals || '0');
  const duration = 1200;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;
    el.textContent = prefix + current.toFixed(decimals) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function enhanceImages(container) {
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    img.addEventListener('click', () => {
      // Simple lightbox
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        cursor: zoom-out; animation: fadeIn 0.3s ease;
      `;
      const bigImg = document.createElement('img');
      bigImg.src = img.src;
      bigImg.style.cssText = `
        max-width: 90vw; max-height: 90vh;
        border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      overlay.appendChild(bigImg);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });
}

/**
 * Cleanup observers
 */
export function cleanupProPreview(container) {
  if (observer) { observer.disconnect(); observer = null; }
  if (counterObserver) { counterObserver.disconnect(); counterObserver = null; }
  if (container) container.classList.remove('pro-preview');
}
