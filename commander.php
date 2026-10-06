<?php
require __DIR__ . '/auth.php';
exiger_connexion('commande', 'livraison.html');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'erreurs' => ['global' => 'Requête invalide.']], 405);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) json_out(['ok' => false, 'erreurs' => ['global' => 'Requête invalide.']], 400);

$nom = trim($in['nom_personne'] ?? '');
$tel = preg_replace('/[\s.\-]/', '', $in['telephone'] ?? '');
$adresse = mb_substr(trim($in['adresse'] ?? ''), 0, 60);
$repere = mb_substr(trim($in['repere'] ?? ''), 0, 150);
$note = mb_substr(trim($in['note'] ?? ''), 0, 200);
$paiement = $in['paiement'] ?? '';

$e = [];
if (mb_strlen($nom) < 2 || mb_strlen($nom) > 80) $e['nom_personne'] = 'Entrez le nom du destinataire.';
if (!preg_match('/^(\+?237)?[26]\d{8}$/', $tel)) $e['telephone'] = 'Numéro camerounais attendu, ex. 6 77 00 00 00.';
if ($adresse === '') $e['adresse'] = 'Choisissez un quartier.';
if (!in_array($paiement, ['especes', 'mobile_money'], true)) $e['paiement'] = 'Choisissez un mode de paiement.';

$lignes = [];
foreach (($in['lignes'] ?? []) as $id => $q) {
    $id = (int) $id; $q = (int) $q;
    if ($id > 0 && $q > 0) $lignes[$id] = min($q, 20);
}
if (!$lignes) $e['global'] = 'Votre panier est vide.';
if ($e) json_out(['ok' => false, 'erreurs' => $e], 422);

// Les prix viennent de la base, jamais du navigateur.
$ids = array_keys($lignes);
$s = db()->prepare('SELECT id, nom, prix FROM plats WHERE disponible = 1 AND id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
$s->execute($ids);
$plats = $s->fetchAll();
if (count($plats) !== count($ids)) json_out(['ok' => false, 'erreurs' => ['global' => 'Un plat n\'est plus disponible. Actualisez votre panier.']], 422);

$sous = 0;
foreach ($plats as $p) $sous += $p['prix'] * $lignes[$p['id']];
$total = $sous + FRAIS_LIVRAISON;

$pdo = db();
$pdo->beginTransaction();
try {
    $pdo->prepare('INSERT INTO commandes (utilisateur_id, nom_personne, telephone, adresse, repere, paiement, note, sous_total, frais, total) VALUES (?,?,?,?,?,?,?,?,?,?)')
        ->execute([$_SESSION['user_id'], $nom, $tel, $adresse, $repere, $paiement, $note, $sous, FRAIS_LIVRAISON, $total]);
    $num = (int) $pdo->lastInsertId();
    $l = $pdo->prepare('INSERT INTO commande_lignes (commande_id, plat_id, nom_plat, prix_unitaire, quantite) VALUES (?,?,?,?,?)');
    foreach ($plats as $p) $l->execute([$num, $p['id'], $p['nom'], $p['prix'], $lignes[$p['id']]]);
    $pdo->commit();
} catch (Throwable $x) {
    $pdo->rollBack();
    throw $x;
}
json_out(['ok' => true, 'numero' => $num, 'total' => $total]);
