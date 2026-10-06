let plats = [], cat = 'Tous', q = '';
const grille = $('#grille');
fetch('menus.php').then(r => r.json()).then(d => { plats = d.plats; filtres(); rendre(); barre(); })
  .catch(() => { grille.innerHTML = '<p class="vide">Le menu est momentanément indisponible. Réessayez dans un instant.</p>'; });

function filtres() {
  const cats = ['Tous', ...new Set(plats.map(p => p.categorie))];
  $('#filtres').innerHTML = cats.map(c => `<button class="${c === cat ? 'actif' : ''}" data-c="${DD.esc(c)}">${DD.esc(c)}</button>`).join('');
}
function rendre() {
  const p = DD.lire();
  const liste = plats.filter(x => (cat === 'Tous' || x.categorie === cat) && (x.nom + ' ' + (x.description || '')).toLowerCase().includes(q));
  $('#vide').hidden = liste.length > 0;
  grille.innerHTML = liste.map(x => {
    const n = p[x.id] || 0;
    return `<article class="menu-item" data-id="${x.id}">
      <div class="photo" style="background-image:url('${DD.esc(x.image_url || '')}')"></div>
      <div class="txt"><h3>${DD.esc(x.nom)}</h3><p>${DD.esc(x.description)}</p>
      <div class="ligne"><span class="prix">${DD.fcfa(x.prix)}</span>
      ${n ? `<span class="pas"><button data-d="-1" aria-label="Retirer un ${DD.esc(x.nom)}">−</button><b>${n}</b><button data-d="1" aria-label="Ajouter un ${DD.esc(x.nom)}">+</button></span>`
          : `<button class="btn btn-or ajout" data-d="1">Ajouter</button>`}</div></div></article>`;
  }).join('');
}
function barre() {
  const p = DD.lire(); let total = 0, n = 0;
  plats.forEach(x => { if (p[x.id]) { total += x.prix * p[x.id]; n += p[x.id]; } });
  $('#barre').hidden = !n;
  $('#barre-txt').textContent = `${n} plat${n > 1 ? 's' : ''} · ${DD.fcfa(total)}`;
}
grille.addEventListener('click', e => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  const id = b.closest('.menu-item').dataset.id, d = +b.dataset.d;
  DD.ajuster(id, d);
  if (d > 0) DD.toast('Ajouté à votre commande');
  rendre(); barre();
});
$('#filtres').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  cat = b.dataset.c; filtres(); rendre();
});
$('#recherche').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); rendre(); });
