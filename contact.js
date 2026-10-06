const form = $('#formContact');
const msg = form.message, cpt = $('#compteur');
msg.addEventListener('input', () => { cpt.textContent = msg.value.length + ' / 1000'; });
const regles = {
  nom: v => v.trim().length >= 2 || 'Entrez votre nom.',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Entrez une adresse email valide.',
  sujet: v => !!v || 'Choisissez un sujet.',
  message: v => v.trim().length >= 10 || 'Votre message doit faire au moins 10 caractères.'
};
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!DD.valider(form, regles)) return;
  const btn = $('.valider', form); btn.disabled = true; btn.textContent = 'Envoi…'; $('.alerte', form).hidden = true;
  try {
    const d = await DD.envoyer(form.action, new FormData(form));
    if (d.ok) { $('#formcarte').hidden = true; $('#ok').hidden = false; return; }
    DD.erreurs(form, d.erreurs);
  } catch (x) { DD.erreurs(form, { global: 'Connexion impossible. Vérifiez votre réseau et réessayez.' }); }
  btn.disabled = false; btn.textContent = 'Envoyer';
});
// Horaires : jour actuel en évidence
const j = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Douala' })).getDay();
const li = $(`.horaires-c li[data-j="${j}"]`); if (li) li.classList.add('auj');
