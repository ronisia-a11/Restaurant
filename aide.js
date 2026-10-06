const items = $$('details'), champ = $('#q');
function filtrer() {
  const q = champ.value.trim().toLowerCase(); let n = 0;
  items.forEach(d => { const ok = d.textContent.toLowerCase().includes(q); d.hidden = !ok; if (ok) n++; if (q && ok) d.open = true; });
  $('#aucun').hidden = n > 0;
}
champ.addEventListener('input', filtrer);
$('#tout').addEventListener('click', e => {
  const ouvrir = e.target.dataset.ouvert !== '1';
  items.forEach(d => d.open = ouvrir); e.target.dataset.ouvert = ouvrir ? '1' : '0';
  e.target.textContent = ouvrir ? 'Tout replier' : 'Tout déplier';
});
