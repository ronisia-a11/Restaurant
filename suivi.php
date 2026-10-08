<?php
require __DIR__ . '/auth.php';
exiger_connexion('commande', 'suivi.html');
$q = db()->prepare("SELECT id, statut, total, adresse, TIMESTAMPDIFF(MINUTE, cree_le, NOW()) AS age FROM commandes
    WHERE utilisateur_id = ? AND type = 'livraison' ORDER BY id DESC LIMIT 10");
$q->execute([$_SESSION['user_id']]);
$c = $q->fetchAll();
if ($c) {
    $ids = implode(',', array_map('intval', array_column($c, 'id')));
    $par = [];
    foreach (db()->query("SELECT commande_id, nom_plat, quantite FROM commande_lignes WHERE commande_id IN ($ids) ORDER BY id")->fetchAll() as $l) $par[$l['commande_id']][] = $l;
    foreach ($c as &$o) $o['lignes'] = $par[$o['id']] ?? [];
}
json_out(['ok' => true, 'commandes' => $c]);
