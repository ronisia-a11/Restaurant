// Outils communs : menu mobile, panier (localStorage), envoi au serveur, validation, notifications.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DD = {
  cle: 'dd_panier',
  lire() { try { return JSON.parse(localStorage.getItem(this.cle)) || {}; } catch (e) { return {}; } },
  ecrire(p) { localStorage.setItem(this.cle, JSON.stringify(p)); this.badge(); },
  ajuster(id, d) {
    const p = this.lire(); p[id] = Math.max(0, (p[id] || 0) + d); if (p[id] > 20) p[id] = 20;
    if (!p[id]) delete p[id]; this.ecrire(p); return p[id] || 0;
  },
  vider() { localStorage.removeItem(this.cle); this.badge(); },
  nb() { return Object.values(this.lire()).reduce((a, b) => a + b, 0); },
  fcfa(n) { return Number(n).toLocaleString('fr-FR') + ' FCFA'; },
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(this.t); this.t = setTimeout(() => e.classList.remove('on'), 2200); },
  badge() {
    const a = $('a[href="livraison.html"]'); if (!a) return;
    let b = a.querySelector('.badge'), n = this.nb();
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'badge'; a.appendChild(b); }
    b.textContent = n;
  },
  async envoyer(url, corps, json) {
    const h = { 'X-Requested-With': 'fetch' };
    if (json) { h['Content-Type'] = 'application/json'; corps = JSON.stringify(corps); }
    const r = await fetch(url, { method: 'POST', body: corps, headers: h, credentials: 'same-origin' });
    const d = await r.json();
    if (r.status === 401 && d.redirect) location.href = d.redirect; // pas inscrit : direction inscription
    return d;
  },
  valider(f, regles) {
    let premier = null;
    f.querySelectorAll('input,select,textarea').forEach(el => {
      const r = regles[el.name]; if (!r) return;
      const res = r(el.value, el), ok = res === true;
      el.setAttribute('aria-invalid', !ok);
      const e = el.closest('.champ').querySelector('.err'); if (e) e.textContent = ok ? '' : res;
      if (!ok && !premier) premier = el;
    });
    if (premier) premier.focus();
    return !premier;
  },
  erreurs(f, er) {
    Object.entries(er || {}).forEach(([k, m]) => {
      const el = f.querySelector(`[name="${k}"]`);
      if (el) { el.setAttribute('aria-invalid', 'true'); const x = el.closest('.champ').querySelector('.err'); if (x) x.textContent = m; }
      else { const a = f.querySelector('.alerte'); a.textContent = m; a.hidden = false; }
    });
    const p = f.querySelector('[aria-invalid="true"]'); if (p) p.focus();
  }
};
document.addEventListener('input', e => {
  if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') {
    e.target.removeAttribute('aria-invalid');
    const x = e.target.closest('.champ')?.querySelector('.err'); if (x) x.textContent = '';
  }
});
$('#burger').addEventListener('click', () => {
  const o = $('#liens').classList.toggle('ouvert'); $('#burger').setAttribute('aria-expanded', o);
});
DD.badge();
