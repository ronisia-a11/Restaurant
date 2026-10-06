let plats = {}, frais = 1000;
const form = $('#formLivraison');
Promise.all([
  fetch('menus.php').then(r => r.json()),
  fetch('auth.php?statut=1', { credentials: 'same-origin' }).then(r => r.json())
]).then(([m, u]) => {
  m.plats.forEach(p => plats[p.id] = p); frais = m.frais;
  if (u.nom) form.nom_personne.value = u.nom;
  if (u.telephone) form.telephone.value = u.telephone;
  if (u.adresse) form.adresse.value = u.adresse;
  rendre();
}).catch(() => { $('#lignes').innerHTML = '<p class="vide">Impossible de charger votre commande. Réessayez.</p>'; });

function rendre() {
  const p = DD.lire(); let sous = 0, n = 0;
  Object.keys(p).forEach(id => { if (!plats[id]) { delete p[id]; DD.ecrire(p); } });
  const ids = Object.keys(p);
  $('#lignes').innerHTML = ids.length ? ids.map(id => {
    const x = plats[id], st = x.prix * p[id]; sous += st; n += p[id];
    return `<div class="lc" data-id="${id}"><b>${DD.esc(x.nom)}</b>
      <span class="pas"><button type="button" data-d="-1" aria-label="Retirer un ${DD.esc(x.nom)}">−</button><span>${p[id]}</span><button type="button" data-d="1" aria-label="Ajouter un ${DD.esc(x.nom)}">+</button></span>
      <span class="st">${DD.fcfa(st)}</span></div>`;
  }).join('') : '<p class="vide">Votre commande est vide. <a href="menus.html">Choisir des plats</a></p>';
  $('#dl').hidden = !n;
  $('#sous').textContent = DD.fcfa(sous);
  $('#frais').textContent = DD.fcfa(frais);
  $('#total').textContent = DD.fcfa(sous + (n ? frais : 0));
  $('#envoi').disabled = !n;
}
$('#lignes').addEventListener('click', e => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  DD.ajuster(b.closest('.lc').dataset.id, +b.dataset.d); rendre();
});

const regles = {
  nom_personne: v => v.trim().length >= 2 || 'Entrez le nom du destinataire.',
  telephone: v => /^(\+?237)?[26]\d{8}$/.test(v.replace(/[\s.-]/g, '')) || 'Numéro camerounais attendu, ex. 6 77 00 00 00.'
};
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!DD.valider(form, regles)) return;
  const btn = $('#envoi'); btn.disabled = true; btn.textContent = 'Envoi…'; $('.alerte', form).hidden = true;
  const f = Object.fromEntries(new FormData(form));
  try {
    const d = await DD.envoyer('commander.php', { ...f, lignes: DD.lire() }, true);
    if (d.ok) {
      DD.vider(); $('#num').textContent = 'N° ' + d.numero; $('#montant').textContent = DD.fcfa(d.total);
      $('#commande').hidden = true; $('#ok').hidden = false; scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    DD.erreurs(form, d.erreurs);
  } catch (x) { DD.erreurs(form, { global: 'Connexion impossible. Vérifiez votre réseau et réessayez.' }); }
  btn.disabled = false; btn.textContent = 'Commander';
});
