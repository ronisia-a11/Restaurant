const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fcfa = n => Number(n).toLocaleString('fr-FR') + ' FCFA';
const STATUTS = { en_attente: 'Nouvelle', en_preparation: 'En préparation', prete: 'Prête', en_livraison: 'En livraison', livree: 'Livrée', servie: 'Servie', annulee: 'Annulée' };
const ROLES = { admin: 'Administrateur', cuisinier: 'Cuisinier', livreur: 'Livreur', serveur: 'Serveur' };
const TYPES = { table: 'Table', salle: 'Salle', nourriture: 'Nourriture' };
const TABS = {
  admin: [['apercu', 'Aperçu'], ['commandes', 'Commandes'], ['cuisine', 'Cuisine'], ['livraisons', 'Livraisons'], ['salle', 'Salle'], ['plats', 'Plats'], ['reservations', 'Réservations'], ['messages', 'Messages'], ['personnel', 'Personnel']],
  cuisinier: [['cartes', 'Commandes'], ['afaire', 'Plats à faire']],
  livreur: [['livraisons', 'Livraisons']],
  serveur: [['salle', 'Salle']]
};
const S = { csrf: '', role: '', nom: '', d: null, onglet: '', panier: {}, table: '', note: '', filtre: '', edPlat: null, edPerso: null, vus: null };
let minuteur, audio;

const chip = s => `<span class="chip s-${s}">${STATUTS[s] || s}</span>`;
const age = m => m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h`;
const titre = o => o.type === 'sur_place' ? 'Table ' + o.table_numero : 'Livraison · ' + esc(o.nom_personne);
const court = o => o.type === 'sur_place' ? 'T' + o.table_numero : '#' + o.id;
const enCuisine = o => ['en_attente', 'en_preparation'].includes(o.statut);
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2400); }
function bip() { try { audio = audio || new AudioContext(); const o = audio.createOscillator(), g = audio.createGain(); o.connect(g); g.connect(audio.destination); o.frequency.value = 880; g.gain.value = .15; o.start(); o.stop(audio.currentTime + .3); } catch (e) { } }

async function api(action, corps) {
  const r = await fetch('dashboard_api.php?action=' + action, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF': S.csrf }, body: JSON.stringify(corps || {}) });
  const d = await r.json().catch(() => ({ ok: false, erreurs: { global: 'Réponse invalide du serveur.' } }));
  if (r.status === 401 && action !== 'login') afficherLogin();
  return d;
}
const msgErreur = r => Object.values(r.erreurs || {}).join(' ') || 'Erreur.';

/* ---------- Connexion ---------- */
function afficherLogin() { clearInterval(minuteur); $('#app').hidden = true; $('#connexion').hidden = false; $('#formLogin').nom.focus(); }
$('#oeil').addEventListener('click', e => {
  const i = $('#formLogin').mot_de_passe, v = i.type === 'password';
  i.type = v ? 'text' : 'password'; e.target.textContent = v ? 'Masquer' : 'Afficher'; e.target.setAttribute('aria-pressed', v);
});
$('#formLogin').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, b = $('#entrer'), a = $('#alerteLogin'); a.hidden = true;
  if (!f.nom.value.trim() || !f.mot_de_passe.value) { a.textContent = 'Entrez votre nom et votre mot de passe.'; a.hidden = false; return; }
  b.disabled = true; b.textContent = 'Connexion…';
  const r = await api('login', { nom: f.nom.value, mot_de_passe: f.mot_de_passe.value });
  b.disabled = false; b.textContent = 'Entrer';
  if (!r.ok) { a.textContent = msgErreur(r); a.hidden = false; f.mot_de_passe.value = ''; f.mot_de_passe.focus(); return; }
  f.reset(); entrer(r);
});
$('#sortir').addEventListener('click', async () => { await api('logout'); S.vus = null; afficherLogin(); });

function entrer(u) {
  Object.assign(S, { csrf: u.csrf, role: u.role, nom: u.nom, vus: null, panier: {}, edPlat: null, edPerso: null });
  S.onglet = TABS[u.role][0][0];
  $('#connexion').hidden = true; $('#app').hidden = false;
  $('#qui').textContent = `${u.nom} · ${ROLES[u.role]}`;
  $('#onglets').innerHTML = TABS[u.role].map(([k, t]) => `<button role="tab" data-t="${k}">${t}</button>`).join('');
  $('#vue').innerHTML = '<p class="vide">Chargement…</p>';
  charger(false); clearInterval(minuteur); minuteur = setInterval(() => charger(true), 8000);
}
$('#onglets').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { S.onglet = b.dataset.t; render(); } });

async function charger(auto) {
  const r = await api('donnees');
  if (!r.ok) return;
  S.d = r;
  if (['admin', 'cuisinier'].includes(S.role)) {
    const ids = r.commandes.filter(o => o.statut === 'en_attente').map(o => o.id);
    if (S.vus && ids.some(i => !S.vus.has(i))) { bip(); toast('Nouvelle commande reçue'); }
    S.vus = new Set(ids);
  }
  render(auto);
}

/* ---------- Rendu ---------- */
function render(auto) {
  if (!S.d) return;
  const a = document.activeElement;
  if (auto && a && /INPUT|SELECT/.test(a.tagName) && $('#vue').contains(a)) return; // ne pas écraser une saisie
  $$('#onglets button').forEach(b => b.classList.toggle('actif', b.dataset.t === S.onglet));
  $('#vue').innerHTML = (VUES[S.onglet] || (() => ''))();
}

function ligne(l, mode) {
  let b;
  if (l.statut === 'a_faire') b = mode === 'cuisine' ? `<button class="mini" data-act="prete" data-id="${l.id}">Terminé</button>` : '<span class="etat">À cuire</span>';
  else if (l.statut === 'pret') b = mode === 'salle' ? `<button class="mini ok" data-act="servir" data-id="${l.id}">Servi</button>` : '<span class="etat pret">Prêt</span>';
  else b = '<span class="etat">Servi</span>';
  return `<li class="lg"><span><b>${l.quantite}×</b> ${esc(l.nom_plat)}</span>${b}</li>`;
}
function carte(o, mode, extra = '') {
  return `<article class="cmd c-${o.statut}"><header><h3>${titre(o)} <small>#${o.id}</small></h3>${chip(o.statut)}</header>
    <p class="age">${age(o.age)}</p><ul>${o.lignes.map(l => ligne(l, mode)).join('')}</ul>${o.note ? `<p class="note">Note : ${esc(o.note)}</p>` : ''}${extra}</article>`;
}

function vCartes() {
  const L = S.d.commandes.filter(enCuisine).sort((a, b) => b.age - a.age);
  return L.length ? `<div class="grille">${L.map(o => carte(o, 'cuisine', o.statut === 'en_attente' ? `<button class="btn-d" data-act="demarrer" data-id="${o.id}">Commencer la préparation</button>` : '')).join('')}</div>` : '<p class="vide">Aucune commande à préparer.</p>';
}
function vAfaire() {
  const g = {};
  S.d.commandes.filter(enCuisine).sort((a, b) => b.age - a.age).forEach(o => o.lignes.filter(l => l.statut === 'a_faire').forEach(l => {
    (g[l.nom_plat] ??= { total: 0, l: [] }).total += l.quantite; g[l.nom_plat].l.push([o, l]);
  }));
  const k = Object.keys(g);
  return k.length ? `<div class="grille">${k.map(n => `<article class="cmd"><header><h3>${esc(n)}</h3><span class="gros">× ${g[n].total}</span></header>
    <p class="age">Touchez une commande quand le plat est cuit :</p>
    <div class="puces">${g[n].l.map(([o, l]) => `<button class="puce" data-act="prete" data-id="${l.id}">${court(o)} · ×${l.quantite} ✓</button>`).join('')}</div></article>`).join('')}</div>` : '<p class="vide">Rien à cuisiner pour le moment.</p>';
}
function vLivraisons() {
  const L = S.d.commandes.filter(o => o.type === 'livraison' && ['en_attente', 'en_preparation', 'prete', 'en_livraison'].includes(o.statut)).sort((a, b) => b.age - a.age);
  return L.length ? `<div class="grille">${L.map(o => {
    const n = o.lignes.length, pret = o.lignes.filter(l => l.statut !== 'a_faire').length;
    const etat = o.statut === 'prete' ? '<p class="etat-liv ok">✔ Prête, vous pouvez la récupérer</p>' : o.statut === 'en_livraison' ? '<p class="etat-liv">En route vers le client</p>' : `<p class="etat-liv attente">Pas encore prête : ${pret}/${n} plats cuits</p>`;
    const b = o.statut === 'prete' ? `<button class="btn-d" data-act="prendre" data-id="${o.id}">Je la prends</button>` : o.statut === 'en_livraison' ? `<button class="btn-d vert" data-act="livrer" data-id="${o.id}">Marquer comme livrée</button>` : '';
    return `<article class="cmd c-${o.statut}"><header><h3>${esc(o.nom_personne)} <small>#${o.id}</small></h3>${chip(o.statut)}</header>${etat}
      <p>${esc(o.adresse || '')}${o.repere ? ' — ' + esc(o.repere) : ''}</p>
      <p><a href="tel:${esc(o.telephone)}">${esc(o.telephone)}</a> · ${o.paiement === 'mobile_money' ? 'Mobile Money' : 'Espèces'} · <b>${fcfa(o.total)}</b></p>
      <ul>${o.lignes.map(l => ligne(l, 'lecture')).join('')}</ul>${b}</article>`;
  }).join('')}</div>` : '<p class="vide">Aucune livraison en cours.</p>';
}
function vSalle() {
  const plats = (S.d.plats || []).filter(p => +p.disponible), cats = [...new Set(plats.map(p => p.categorie))];
  const n = Object.values(S.panier).reduce((a, b) => a + b, 0), total = plats.reduce((a, p) => a + p.prix * (S.panier[p.id] || 0), 0);
  const form = `<form class="carte-f" data-form="commande"><h2>Nouvelle commande</h2><div class="alerte" hidden></div>
    <label>Numéro de table<input name="table" type="number" min="1" max="50" value="${esc(S.table)}" required></label>
    ${cats.map(c => `<h4>${esc(c)}</h4>${plats.filter(p => p.categorie === c).map(p => `<div class="pl"><span>${esc(p.nom)} <small>${fcfa(p.prix)}</small></span>
      <span class="pas"><button type="button" data-act="pm" data-id="${p.id}" data-d="-1" aria-label="Retirer">−</button><b>${S.panier[p.id] || 0}</b><button type="button" data-act="pm" data-id="${p.id}" data-d="1" aria-label="Ajouter">+</button></span></div>`).join('')}`).join('')}
    <label>Note pour la cuisine<input name="note" maxlength="200" value="${esc(S.note)}"></label>
    <button class="btn-d" ${n ? '' : 'disabled'}>Envoyer en cuisine${n ? ` (${n} plat${n > 1 ? 's' : ''} · ${fcfa(total)})` : ''}</button></form>`;
  const tables = {}, pret = [];
  S.d.commandes.filter(c => c.type === 'sur_place' && !['servie', 'annulee'].includes(c.statut)).forEach(c => {
    (tables[c.table_numero] ??= []).push(c);
    c.lignes.filter(l => l.statut === 'pret').forEach(l => pret.push([c, l]));
  });
  const haut = pret.length ? `<section class="alerte-s"><h3>À servir maintenant</h3>${pret.map(([c, l]) => `<div class="pl"><span><b>Table ${c.table_numero}</b> : ${l.quantite}× ${esc(l.nom_plat)}</span><button class="mini ok" data-act="servir" data-id="${l.id}">Servi</button></div>`).join('')}</section>` : '';
  const liste = Object.keys(tables).sort((a, b) => a - b).map(t => `<article class="cmd"><header><h3>Table ${t}</h3></header>${tables[t].map(c => `<div class="sous">${chip(c.statut)} <small>#${c.id} · ${age(c.age)}</small><ul>${c.lignes.map(l => ligne(l, 'salle')).join('')}</ul></div>`).join('')}</article>`).join('');
  return `<div class="deux-c"><div>${form}</div><div>${haut}<h2>Tables en cours</h2>${liste ? `<div class="grille un">${liste}</div>` : '<p class="vide">Aucune table en cours.</p>'}</div></div>`;
}
function vCommandes() {
  const L = S.d.commandes.filter(o => !S.filtre || o.statut === S.filtre);
  return `<label class="barre-f">Statut<select data-filtre>${['', ...Object.keys(STATUTS)].map(s => `<option value="${s}" ${s === S.filtre ? 'selected' : ''}>${s ? STATUTS[s] : 'Tous'}</option>`).join('')}</select></label>
    <div class="tab"><table><thead><tr><th>N°</th><th>Pour</th><th>Plats</th><th>Total</th><th>Statut</th><th></th></tr></thead><tbody>${L.map(o => `<tr><td>#${o.id}<br><small>${age(o.age)}</small></td><td>${titre(o)}</td>
    <td>${o.lignes.map(l => `${l.quantite}× ${esc(l.nom_plat)}`).join('<br>')}</td><td>${fcfa(o.total)}</td><td>${chip(o.statut)}</td>
    <td>${['livree', 'servie', 'annulee'].includes(o.statut) ? '' : `<button class="mini danger" data-act="annuler" data-id="${o.id}">Annuler</button>`}</td></tr>`).join('') || '<tr><td colspan="6" class="vide">Aucune commande.</td></tr>'}</tbody></table></div>`;
}
function vApercu() {
  const s = S.d.stats, st = [[s.commandes_jour, "Commandes aujourd'hui"], [fcfa(s.ca_jour), "Chiffre d'affaires du jour"], [s.en_cours, 'Commandes en cours'], [s.reservations_jour, "Réservations aujourd'hui"], [s.messages, 'Messages à traiter']];
  return `<div class="stats">${st.map(([v, t]) => `<div class="stat"><b>${v}</b><span>${t}</span></div>`).join('')}</div><h2>Dernières commandes</h2>
    <div class="grille">${S.d.commandes.slice(0, 6).map(o => carte(o, 'lecture')).join('') || '<p class="vide">Aucune commande.</p>'}</div>`;
}
function vPlats() {
  const e = S.edPlat || {};
  return `<form class="carte-f" data-form="plat"><h2>${e.id ? 'Modifier le plat' : 'Ajouter un plat'}</h2><div class="alerte" hidden></div><input type="hidden" name="id" value="${e.id || ''}">
    <label>Nom<input name="nom" value="${esc(e.nom)}" required></label><label>Description<input name="description" value="${esc(e.description)}" maxlength="255"></label>
    <div class="duo"><label>Prix (FCFA)<input name="prix" type="number" min="0" value="${esc(e.prix)}" required></label><label>Catégorie<input name="categorie" list="cats" value="${esc(e.categorie)}" required></label></div>
    <datalist id="cats">${[...new Set(S.d.plats.map(p => p.categorie))].map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <label>Image (lien https)<input name="image_url" value="${esc(e.image_url)}"></label>
    <label class="cb"><input type="checkbox" name="disponible" ${e.id && !+e.disponible ? '' : 'checked'}> Disponible à la commande</label>
    <div class="rang"><button class="btn-d">Enregistrer</button>${e.id ? '<button type="button" class="mini" data-act="plat_annuler">Annuler</button>' : ''}</div></form>
    <div class="tab"><table><thead><tr><th>Plat</th><th>Catégorie</th><th>Prix</th><th>Disponibilité</th><th></th></tr></thead><tbody>${S.d.plats.map(p => `<tr><td>${esc(p.nom)}</td><td>${esc(p.categorie)}</td><td>${fcfa(p.prix)}</td>
    <td><button class="mini ${+p.disponible ? 'ok' : ''}" data-act="plat_toggle" data-id="${p.id}">${+p.disponible ? 'Disponible' : 'Indisponible'}</button></td><td><button class="mini" data-act="plat_edit" data-id="${p.id}">Modifier</button></td></tr>`).join('')}</tbody></table></div>`;
}
function vReservations() {
  const L = S.d.reservations;
  return `<div class="tab"><table><thead><tr><th>Date</th><th>Horaire</th><th>Client</th><th>Type</th><th>Pers.</th><th>Statut</th><th></th></tr></thead><tbody>${L.map(r => `<tr><td>${new Date(r.date + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>${r.debut} – ${r.fin}</td>
    <td>${esc(r.nom)}${r.telephone ? `<br><small><a href="tel:${esc(r.telephone)}">${esc(r.telephone)}</a></small>` : ''}${r.notes ? `<br><small>${esc(r.notes)}</small>` : ''}</td><td>${TYPES[r.type]}</td><td>${r.personnes}</td>
    <td><span class="chip ${r.statut === 'confirmee' ? 's-prete' : r.statut === 'annulee' ? 's-annulee' : 's-en_preparation'}">${{ en_attente: 'En attente', confirmee: 'Confirmée', annulee: 'Annulée' }[r.statut]}</span></td>
    <td>${r.statut !== 'confirmee' ? `<button class="mini ok" data-act="resa" data-statut="confirmee" data-id="${r.id}">Confirmer</button> ` : ''}${r.statut !== 'annulee' ? `<button class="mini danger" data-act="resa" data-statut="annulee" data-id="${r.id}">Annuler</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="vide">Aucune réservation à venir.</td></tr>'}</tbody></table></div>`;
}
function vMessages() {
  const L = S.d.messages;
  return L.length ? `<div class="grille">${L.map(m => `<article class="cmd"><header><h3>${esc(m.nom)}</h3><span class="chip">${esc(m.sujet)}</span></header><a href="mailto:${esc(m.email)}">${esc(m.email)}</a><p class="msg">${esc(m.message)}</p><button class="mini ok" data-act="traite" data-id="${m.id}">Marquer comme traité</button></article>`).join('')}</div>` : '<p class="vide">Aucun message à traiter.</p>';
}
function vPersonnel() {
  const e = S.edPerso || {};
  return `<form class="carte-f" data-form="perso"><h2>${e.id ? 'Modifier le compte' : 'Nouveau compte'}</h2><div class="alerte" hidden></div><input type="hidden" name="id" value="${e.id || ''}">
    <div class="duo"><label>Nom de connexion<input name="nom" value="${esc(e.nom)}" required autocapitalize="none"></label>
    <label>Rôle<select name="role">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${e.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <label>Mot de passe<input name="mot_de_passe" type="password" autocomplete="new-password" placeholder="${e.id ? 'Laisser vide pour ne pas changer' : '6 caractères minimum'}"></label>
    <div class="rang"><button class="btn-d">Enregistrer</button>${e.id ? '<button type="button" class="mini" data-act="perso_annuler">Annuler</button>' : ''}</div></form>
    <div class="tab"><table><thead><tr><th>Nom</th><th>Rôle</th><th>Compte</th><th></th></tr></thead><tbody>${S.d.personnel.map(p => `<tr><td>${esc(p.nom)}</td><td>${ROLES[p.role]}</td>
    <td><button class="mini ${+p.actif ? 'ok' : ''}" data-act="perso_toggle" data-id="${p.id}">${+p.actif ? 'Actif' : 'Désactivé'}</button></td><td><button class="mini" data-act="perso_edit" data-id="${p.id}">Modifier</button></td></tr>`).join('')}</tbody></table></div>`;
}
const VUES = {
  apercu: vApercu, commandes: vCommandes, cartes: vCartes, afaire: vAfaire, cuisine: () => `<h2>Plats à faire</h2>${vAfaire()}<h2 style="margin-top:28px">Commandes en cuisine</h2>${vCartes()}`,
  livraisons: vLivraisons, salle: vSalle, plats: vPlats, reservations: vReservations, messages: vMessages, personnel: vPersonnel
};

/* ---------- Actions ---------- */
const ACTIONS = {
  demarrer: d => ['demarrer', { id: d.id }], prete: d => ['ligne_prete', { ligne_id: d.id }], prendre: d => ['prendre', { id: d.id }], livrer: d => ['livrer', { id: d.id }],
  servir: d => ['servir', { ligne_id: d.id }], annuler: d => ['annuler', { id: d.id }], plat_toggle: d => ['plat_toggle', { id: d.id }],
  resa: d => ['reservation_statut', { id: d.id, statut: d.statut }], traite: d => ['message_traite', { id: d.id }], perso_toggle: d => ['personnel_toggle', { id: d.id }]
};
$('#vue').addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const d = el.dataset, a = d.act;
  if (a === 'pm') { const p = S.panier; p[d.id] = Math.max(0, Math.min(20, (p[d.id] || 0) + +d.d)); if (!p[d.id]) delete p[d.id]; return render(); }
  if (a === 'plat_edit') { S.edPlat = S.d.plats.find(p => p.id == d.id); return render(); }
  if (a === 'plat_annuler') { S.edPlat = null; return render(); }
  if (a === 'perso_edit') { S.edPerso = S.d.personnel.find(p => p.id == d.id); return render(); }
  if (a === 'perso_annuler') { S.edPerso = null; return render(); }
  if (a === 'annuler' && !confirm('Annuler cette commande ?')) return;
  if (!ACTIONS[a]) return;
  el.disabled = true;
  const [action, corps] = ACTIONS[a](d), r = await api(action, corps);
  toast(r.ok ? 'Enregistré' : msgErreur(r));
  await charger(false);
});
$('#vue').addEventListener('input', e => { if (e.target.name === 'table') S.table = e.target.value; if (e.target.name === 'note') S.note = e.target.value; });
$('#vue').addEventListener('change', e => { if (e.target.matches('[data-filtre]')) { S.filtre = e.target.value; render(); } });
$('#vue').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, k = f.dataset.form, fd = new FormData(f); let action, corps;
  if (k === 'commande') { action = 'nouvelle_commande'; corps = { table: fd.get('table'), note: fd.get('note'), lignes: S.panier }; }
  if (k === 'plat') { action = 'plat_sauver'; corps = { ...Object.fromEntries(fd), disponible: fd.has('disponible') ? 1 : 0 }; }
  if (k === 'perso') { action = 'personnel_sauver'; corps = Object.fromEntries(fd); }
  const r = await api(action, corps);
  if (!r.ok) { const a = $('.alerte', f); a.textContent = msgErreur(r); a.hidden = false; return; }
  if (k === 'commande') { S.panier = {}; S.table = ''; S.note = ''; }
  if (k === 'plat') S.edPlat = null;
  if (k === 'perso') S.edPerso = null;
  toast(k === 'commande' ? 'Commande envoyée en cuisine' : 'Enregistré');
  await charger(false);
});

/* ---------- Démarrage ---------- */
api('moi').then(r => r.connecte ? entrer(r) : afficherLogin()).catch(afficherLogin);
