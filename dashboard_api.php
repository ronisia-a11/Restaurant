<?php
// API du tableau de bord (admin, cuisinier, livreur, serveur). Répond en JSON.
require __DIR__ . '/auth.php';
header('Cache-Control: no-store');

$action = $_GET['action'] ?? '';
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = [];

const DROITS = [
    'cuisinier' => ['donnees', 'demarrer', 'ligne_prete'],
    'livreur'   => ['donnees', 'prendre', 'livrer'],
    'serveur'   => ['donnees', 'nouvelle_commande', 'servir'],
]; // l'admin a accès à toutes les actions

function ko($msg, $code = 422) { json_out(['ok' => false, 'erreurs' => ['global' => $msg]], $code); }

function liste_commandes($where, $limite = 80) {
    $c = db()->query("SELECT id, type, table_numero, nom_personne, telephone, adresse, repere, paiement, note, total, statut,
        TIMESTAMPDIFF(MINUTE, cree_le, NOW()) AS age FROM commandes WHERE $where ORDER BY id DESC LIMIT " . (int) $limite)->fetchAll();
    if (!$c) return [];
    $ids = implode(',', array_map('intval', array_column($c, 'id')));
    $par = [];
    foreach (db()->query("SELECT id, commande_id, nom_plat, quantite, statut FROM commande_lignes WHERE commande_id IN ($ids) ORDER BY id")->fetchAll() as $l) $par[$l['commande_id']][] = $l;
    foreach ($c as &$o) $o['lignes'] = $par[$o['id']] ?? [];
    return $c;
}
function nb($sql) { return (int) db()->query($sql)->fetchColumn(); }

// ---------- Connexion ----------
if ($action === 'login') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $q = db()->prepare('SELECT COUNT(*) FROM tentatives_connexion WHERE ip = ? AND cree_le > (NOW() - INTERVAL 10 MINUTE)');
    $q->execute([$ip]);
    if ($q->fetchColumn() >= 8) ko('Trop de tentatives. Réessayez dans quelques minutes.', 429);

    $nom = strtolower(trim($in['nom'] ?? ''));
    $q = db()->prepare('SELECT id, nom, role, mot_de_passe FROM personnel WHERE nom = ? AND actif = 1');
    $q->execute([$nom]);
    $u = $q->fetch();
    // password_verify est toujours exécuté, pour ne pas révéler si le nom existe
    $ok = password_verify((string) ($in['mot_de_passe'] ?? ''), $u['mot_de_passe'] ?? password_hash('inconnu', PASSWORD_DEFAULT));
    if (!$u || !$ok) {
        db()->prepare('INSERT INTO tentatives_connexion (ip) VALUES (?)')->execute([$ip]);
        ko('Nom ou mot de passe incorrect.', 401);
    }
    db()->prepare('DELETE FROM tentatives_connexion WHERE ip = ?')->execute([$ip]);
    session_regenerate_id(true);
    $_SESSION['staff'] = ['id' => (int) $u['id'], 'nom' => $u['nom'], 'role' => $u['role']];
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    json_out(['ok' => true, 'connecte' => true, 'nom' => $u['nom'], 'role' => $u['role'], 'csrf' => $_SESSION['csrf']]);
}

$s = $_SESSION['staff'] ?? null;
if ($action === 'moi') {
    json_out($s ? ['connecte' => true, 'nom' => $s['nom'], 'role' => $s['role'], 'csrf' => $_SESSION['csrf']] : ['connecte' => false]);
}
if (!$s) json_out(['ok' => false, 'erreurs' => ['global' => 'Connectez-vous.']], 401);
if (!hash_equals($_SESSION['csrf'] ?? '', $_SERVER['HTTP_X_CSRF'] ?? '')) ko('Session expirée. Rechargez la page.', 403);
if ($action === 'logout') { unset($_SESSION['staff'], $_SESSION['csrf']); json_out(['ok' => true]); }

// Le compte doit toujours exister et être actif (rôle relu à chaque requête)
$q = db()->prepare('SELECT role FROM personnel WHERE id = ? AND actif = 1');
$q->execute([$s['id']]);
$role = $q->fetchColumn();
if (!$role) { unset($_SESSION['staff']); json_out(['ok' => false, 'erreurs' => ['global' => 'Compte désactivé.']], 401); }
if ($role !== 'admin' && !in_array($action, DROITS[$role] ?? [], true)) ko('Action non autorisée pour votre rôle.', 403);

$pdo = db();
$id = (int) ($in['id'] ?? 0);

switch ($action) {
    case 'donnees':
        $d = ['ok' => true, 'role' => $role, 'nom' => $s['nom']];
        $d['commandes'] = liste_commandes([
            'admin'     => '1=1',
            'cuisinier' => "statut IN ('en_attente','en_preparation')",
            'livreur'   => "type = 'livraison' AND statut IN ('en_attente','en_preparation','prete','en_livraison')",
            'serveur'   => "type = 'sur_place' AND statut NOT IN ('servie','annulee')",
        ][$role], $role === 'admin' ? 120 : 60);
        if (in_array($role, ['admin', 'serveur'], true))
            $d['plats'] = $pdo->query('SELECT id, nom, description, prix, categorie, image_url, disponible FROM plats ORDER BY categorie, nom')->fetchAll();
        if ($role === 'admin') {
            $d['stats'] = [
                'commandes_jour' => nb("SELECT COUNT(*) FROM commandes WHERE DATE(cree_le) = CURDATE() AND statut <> 'annulee'"),
                'ca_jour' => nb("SELECT COALESCE(SUM(total),0) FROM commandes WHERE DATE(cree_le) = CURDATE() AND statut <> 'annulee'"),
                'en_cours' => nb("SELECT COUNT(*) FROM commandes WHERE statut IN ('en_attente','en_preparation','prete','en_livraison')"),
                'reservations_jour' => nb("SELECT COUNT(*) FROM reservations WHERE date_reservation = CURDATE() AND statut <> 'annulee'"),
                'messages' => nb('SELECT COUNT(*) FROM messages_contact WHERE traite = 0'),
            ];
            $d['reservations'] = $pdo->query("SELECT r.id, r.nom, r.type, r.date_reservation AS date, TIME_FORMAT(r.heure_debut,'%H:%i') AS debut, TIME_FORMAT(r.heure_fin,'%H:%i') AS fin, r.personnes, r.notes, r.statut, u.telephone
                FROM reservations r LEFT JOIN utilisateurs u ON u.id = r.utilisateur_id WHERE r.date_reservation >= CURDATE() ORDER BY r.date_reservation, r.heure_debut LIMIT 80")->fetchAll();
            $d['messages'] = $pdo->query('SELECT id, nom, email, sujet, message FROM messages_contact WHERE traite = 0 ORDER BY id DESC LIMIT 40')->fetchAll();
            $d['personnel'] = $pdo->query('SELECT id, nom, role, actif FROM personnel ORDER BY role, nom')->fetchAll();
        }
        json_out($d);

    case 'demarrer':
        $pdo->prepare("UPDATE commandes SET statut = 'en_preparation' WHERE id = ? AND statut = 'en_attente'")->execute([$id]);
        json_out(['ok' => true]);

    case 'ligne_prete':
        $lid = (int) ($in['ligne_id'] ?? 0);
        $q = $pdo->prepare("UPDATE commande_lignes l JOIN commandes c ON c.id = l.commande_id SET l.statut = 'pret'
            WHERE l.id = ? AND l.statut = 'a_faire' AND c.statut IN ('en_attente','en_preparation')");
        $q->execute([$lid]);
        if (!$q->rowCount()) ko('Ce plat est déjà terminé.');
        $q = $pdo->prepare('SELECT commande_id FROM commande_lignes WHERE id = ?'); $q->execute([$lid]);
        $cid = (int) $q->fetchColumn();
        $pdo->prepare("UPDATE commandes SET statut = IF(EXISTS(SELECT 1 FROM commande_lignes WHERE commande_id = ? AND statut = 'a_faire'), 'en_preparation', 'prete')
            WHERE id = ? AND statut IN ('en_attente','en_preparation')")->execute([$cid, $cid]);
        json_out(['ok' => true]);

    case 'prendre':
        $q = $pdo->prepare("UPDATE commandes SET statut = 'en_livraison', livreur_id = ? WHERE id = ? AND type = 'livraison' AND statut = 'prete'");
        $q->execute([$s['id'], $id]);
        if (!$q->rowCount()) ko('Cette commande n\'est pas encore prête.');
        json_out(['ok' => true]);

    case 'livrer':
        $q = $pdo->prepare("UPDATE commandes SET statut = 'livree' WHERE id = ? AND type = 'livraison' AND statut = 'en_livraison'");
        $q->execute([$id]);
        if (!$q->rowCount()) ko('Cette commande n\'est pas en cours de livraison.');
        json_out(['ok' => true]);

    case 'nouvelle_commande':
        $table = (int) ($in['table'] ?? 0);
        if ($table < 1 || $table > 50) ko('Indiquez un numéro de table (1 à 50).');
        $lignes = [];
        foreach (($in['lignes'] ?? []) as $pid => $qte) { $pid = (int) $pid; $qte = (int) $qte; if ($pid > 0 && $qte > 0) $lignes[$pid] = min($qte, 20); }
        if (!$lignes) ko('Choisissez au moins un plat.');
        $ids = array_keys($lignes);
        $q = $pdo->prepare('SELECT id, nom, prix FROM plats WHERE disponible = 1 AND id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')');
        $q->execute($ids);
        $plats = $q->fetchAll();
        if (count($plats) !== count($ids)) ko('Un plat n\'est plus disponible.');
        $total = 0;
        foreach ($plats as $p) $total += $p['prix'] * $lignes[$p['id']];
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO commandes (utilisateur_id, type, table_numero, nom_personne, note, sous_total, frais, total, serveur_id) VALUES (NULL, 'sur_place', ?, ?, ?, ?, 0, ?, ?)")
                ->execute([$table, 'Table ' . $table, mb_substr(trim($in['note'] ?? ''), 0, 200), $total, $total, $s['id']]);
            $num = (int) $pdo->lastInsertId();
            $l = $pdo->prepare('INSERT INTO commande_lignes (commande_id, plat_id, nom_plat, prix_unitaire, quantite) VALUES (?,?,?,?,?)');
            foreach ($plats as $p) $l->execute([$num, $p['id'], $p['nom'], $p['prix'], $lignes[$p['id']]]);
            $pdo->commit();
        } catch (Throwable $x) { $pdo->rollBack(); throw $x; }
        json_out(['ok' => true, 'numero' => $num]);

    case 'servir':
        $lid = (int) ($in['ligne_id'] ?? 0);
        $q = $pdo->prepare("UPDATE commande_lignes l JOIN commandes c ON c.id = l.commande_id SET l.statut = 'servi'
            WHERE l.id = ? AND l.statut = 'pret' AND c.type = 'sur_place'");
        $q->execute([$lid]);
        if (!$q->rowCount()) ko('Ce plat n\'est pas prêt à servir.');
        $q = $pdo->prepare('SELECT commande_id FROM commande_lignes WHERE id = ?'); $q->execute([$lid]);
        $cid = (int) $q->fetchColumn();
        $pdo->prepare("UPDATE commandes SET statut = 'servie' WHERE id = ? AND NOT EXISTS (SELECT 1 FROM commande_lignes WHERE commande_id = ? AND statut <> 'servi')")->execute([$cid, $cid]);
        json_out(['ok' => true]);

    // ----- Admin uniquement (le contrôle des droits est fait plus haut) -----
    case 'annuler':
        $pdo->prepare("UPDATE commandes SET statut = 'annulee' WHERE id = ? AND statut NOT IN ('livree','servie','annulee')")->execute([$id]);
        json_out(['ok' => true]);

    case 'plat_sauver':
        $nom = trim($in['nom'] ?? ''); $cat = trim($in['categorie'] ?? ''); $prix = $in['prix'] ?? '';
        $img = trim($in['image_url'] ?? ''); $desc = mb_substr(trim($in['description'] ?? ''), 0, 255);
        if (mb_strlen($nom) < 2 || mb_strlen($nom) > 100) ko('Nom du plat invalide.');
        if (!ctype_digit((string) $prix) || $prix > 1000000) ko('Prix invalide.');
        if ($cat === '' || mb_strlen($cat) > 40) ko('Catégorie invalide.');
        if ($img !== '' && !preg_match('#^https?://\S{3,290}$#', $img)) ko('Le lien de l\'image doit commencer par http(s)://.');
        $dispo = empty($in['disponible']) ? 0 : 1;
        if ($id) $pdo->prepare('UPDATE plats SET nom=?, description=?, prix=?, categorie=?, image_url=?, disponible=? WHERE id=?')->execute([$nom, $desc, $prix, $cat, $img ?: null, $dispo, $id]);
        else $pdo->prepare('INSERT INTO plats (nom, description, prix, categorie, image_url, disponible) VALUES (?,?,?,?,?,?)')->execute([$nom, $desc, $prix, $cat, $img ?: null, $dispo]);
        json_out(['ok' => true]);

    case 'plat_toggle':
        $pdo->prepare('UPDATE plats SET disponible = 1 - disponible WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);

    case 'reservation_statut':
        if (!in_array($in['statut'] ?? '', ['en_attente', 'confirmee', 'annulee'], true)) ko('Statut invalide.');
        $pdo->prepare('UPDATE reservations SET statut = ? WHERE id = ?')->execute([$in['statut'], $id]);
        json_out(['ok' => true]);

    case 'message_traite':
        $pdo->prepare('UPDATE messages_contact SET traite = 1 WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);

    case 'personnel_sauver':
        $nom = strtolower(trim($in['nom'] ?? '')); $r = $in['role'] ?? ''; $mdp = (string) ($in['mot_de_passe'] ?? '');
        if (!preg_match('/^[a-z0-9_.-]{3,30}$/', $nom)) ko('Nom : 3 à 30 caractères (lettres, chiffres, . _ -).');
        if (!in_array($r, ['admin', 'cuisinier', 'livreur', 'serveur'], true)) ko('Rôle invalide.');
        if (!$id && $mdp === '') ko('Un mot de passe est obligatoire pour un nouveau compte.');
        if ($mdp !== '' && strlen($mdp) < 6) ko('Mot de passe : 6 caractères minimum.');
        if ($id === (int) $s['id'] && $r !== 'admin') ko('Vous ne pouvez pas retirer votre propre rôle admin.');
        $q = $pdo->prepare('SELECT id FROM personnel WHERE nom = ? AND id <> ?'); $q->execute([$nom, $id]);
        if ($q->fetch()) ko('Ce nom est déjà utilisé.');
        if ($id) {
            $pdo->prepare('UPDATE personnel SET nom = ?, role = ? WHERE id = ?')->execute([$nom, $r, $id]);
            if ($mdp !== '') $pdo->prepare('UPDATE personnel SET mot_de_passe = ? WHERE id = ?')->execute([password_hash($mdp, PASSWORD_DEFAULT), $id]);
        } else {
            $pdo->prepare('INSERT INTO personnel (nom, role, mot_de_passe) VALUES (?,?,?)')->execute([$nom, $r, password_hash($mdp, PASSWORD_DEFAULT)]);
        }
        json_out(['ok' => true]);

    case 'personnel_toggle':
        if ($id === (int) $s['id']) ko('Vous ne pouvez pas désactiver votre propre compte.');
        $pdo->prepare('UPDATE personnel SET actif = 1 - actif WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
}
ko('Action inconnue.', 400);
