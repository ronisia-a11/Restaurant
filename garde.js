// Redirige vers l'inscription si le visiteur n'est pas connecté.
// La vraie protection reste côté serveur (exiger_connexion() dans les scripts PHP).
(function () {
  const racine = document.documentElement;
  racine.style.visibility = 'hidden';
  const page = location.pathname.split('/').pop() || 'index.html';
  const raison = page === 'livraison.html' ? 'commande' : 'reservation';
  const reveler = () => { racine.style.visibility = ''; };
  setTimeout(reveler, 4000);
  fetch('auth.php?statut=1', { credentials: 'same-origin' })
    .then(r => r.json())
    .then(d => {
      if (d.connecte) return reveler();
      location.replace('inscription.html?raison=' + raison + '&redirect=' + encodeURIComponent(page));
    })
    .catch(reveler);
})();
