const ETAPES = ['Reçue', 'En préparation', 'Prête', 'En livraison', 'Livrée'];
const INDEX = { en_attente: 0, en_preparation: 1, prete: 2, en_livraison: 3, livree: 4 };
const MESSAGES = {
  en_attente: 'Nous avons bien reçu votre commande.',
  en_preparation: 'Nos cuisiniers préparent vos plats.',
  prete: 'Votre commande est prête, un livreur va la récupérer.',
  en_livraison: 'Votre livreur est en route.',
  livree: 'Votre commande a été livrée. Bon appétit !'
};
let dernier = 0;
function age(m) { return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.floor(m / 60)} h` : `il y a ${Math.floor(m / 1440)} j`; }

function rendre(liste) {
  if (!liste.length) { $('#liste').innerHTML = '<p class="vide">Vous n\'avez pas encore passé de commande. <a href="menus.html">Voir les menus</a></p>'; return; }
  $('#liste').innerHTML = liste.map(o => {
    const i = INDEX[o.statut], annulee = o.statut === 'annulee';
    return `<article class="cmd-s"><header><h2>Commande n° ${o.id}</h2><span>${age(+o.age)}</span></header>
      ${annulee ? '<p class="annulee">Cette commande a été annulée.</p>' : `<ol class="etapes" aria-label="Avancement">${ETAPES.map((t, k) => `<li class="${k < i || i === 4 ? 'fait' : k === i ? 'cours' : ''}">${t}</li>`).join('')}</ol><p style="margin-bottom:16px">${MESSAGES[o.statut]}</p>`}
      <ul class="plats-s">${o.lignes.map(l => `<li>${l.quantite}× ${DD.esc(l.nom_plat)}</li>`).join('')}</ul>
      <p class="pied"><span>Livraison : ${DD.esc(o.adresse || '')}</span><span>${DD.fcfa(o.total)}</span></p></article>`;
  }).join('');
}
async function charger() {
  try {
    const r = await fetch('suivi.php', { credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } });
    const d = await r.json();
    if (r.status === 401 && d.redirect) { location.href = d.redirect; return; }
    rendre(d.commandes || []); dernier = Date.now();
    $('#maj').textContent = 'Mis à jour à l\'instant';
  } catch (e) { $('#maj').textContent = 'Connexion perdue, nouvelle tentative…'; }
}
charger(); setInterval(charger, 15000);
setInterval(() => { if (dernier) { const s = Math.round((Date.now() - dernier) / 1000); $('#maj').textContent = s < 5 ? 'Mis à jour à l\'instant' : `Mis à jour il y a ${s} s`; } }, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) charger(); });
