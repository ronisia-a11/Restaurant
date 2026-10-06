const H = { 0: [12, 21], 1: [11, 22], 2: [11, 22], 3: [11, 22], 4: [11, 22], 5: [11, 23], 6: [11, 23] };
const TYPES = { table: 'Table à manger', salle: 'Salle de restaurant', nourriture: 'Nourriture' };
const form = $('#formReservation');
const aujourdhui = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' });
form.date.min = aujourdhui;
fetch('auth.php?statut=1', { credentials: 'same-origin' }).then(r => r.json()).then(u => { if (u.nom && !form.nom.value) { form.nom.value = u.nom; recap(); } }).catch(() => {});

const hh = n => String(n).padStart(2, '0') + ':00';
function horaire() {
  if (!form.date.value) return null;
  return H[new Date(form.date.value + 'T00:00').getDay()];
}
function recap() {
  const h = horaire();
  $('#info').textContent = h ? `Nous sommes ouverts de ${h[0]}h à ${h[1]}h ce jour-là.` : 'Choisissez une date pour voir nos horaires.';
  if (h) { form.heure_debut.min = form.heure_fin.min = hh(h[0]); form.heure_debut.max = form.heure_fin.max = hh(h[1]); }
  const t = form.type.value;
  $('#r-nom').textContent = form.nom.value || '—';
  $('#r-type').textContent = TYPES[t] || '—';
  $('#r-date').textContent = form.date.value ? new Date(form.date.value + 'T00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—';
  $('#r-heure').textContent = form.heure_debut.value && form.heure_fin.value ? `${form.heure_debut.value} – ${form.heure_fin.value}` : '—';
  $('#r-pers').textContent = form.personnes.value || '—';
}
form.addEventListener('input', recap);
$$('[data-p]').forEach(b => b.addEventListener('click', () => {
  form.personnes.value = Math.min(30, Math.max(1, (+form.personnes.value || 1) + +b.dataset.p)); recap();
}));

const regles = {
  nom: v => v.trim().length >= 2 || 'Entrez votre nom (2 caractères minimum).',
  date: v => !v ? 'Choisissez une date.' : (v < aujourdhui ? 'Choisissez une date à venir.' : true),
  heure_debut: v => { const h = horaire(); if (!v) return 'Choisissez une heure.'; if (h && v < hh(h[0])) return `Nous ouvrons à ${h[0]}h ce jour-là.`; if (h && v >= hh(h[1])) return `Nous fermons à ${h[1]}h ce jour-là.`; return true; },
  heure_fin: v => { const h = horaire(); if (!v) return 'Choisissez une heure.'; if (v <= form.heure_debut.value) return "L'heure de fin doit suivre l'heure de début."; if (h && v > hh(h[1])) return `Nous fermons à ${h[1]}h ce jour-là.`; return true; },
  personnes: v => (v >= 1 && v <= 30) || 'Entre 1 et 30 personnes.'
};
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!DD.valider(form, regles)) return;
  const btn = $('.valider', form); btn.disabled = true; btn.textContent = 'Envoi…'; $('.alerte', form).hidden = true;
  try {
    const d = await DD.envoyer(form.action, new FormData(form));
    if (d.ok) {
      $('#num').textContent = 'N° ' + d.numero; $('#recap-ok').innerHTML = $('#recap').innerHTML;
      $('#reserver').hidden = true; $('#ok').hidden = false; scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    DD.erreurs(form, d.erreurs);
  } catch (x) { DD.erreurs(form, { global: 'Connexion impossible. Vérifiez votre réseau et réessayez.' }); }
  btn.disabled = false; btn.textContent = 'Valider la réservation';
});
