<?php
require __DIR__ . '/auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: inscription.html'); exit; }

$ajax = ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';
$nom = trim($_POST['nom'] ?? '');
$email = strtolower(trim($_POST['email'] ?? ''));
$mdp = $_POST['mot_de_passe'] ?? '';
$langue = mb_substr(trim($_POST['langue'] ?? ''), 0, 40);
$adresse = mb_substr(trim($_POST['adresse'] ?? ''), 0, 60);
$tel = preg_replace('/[\s.\-]/', '', $_POST['telephone'] ?? '');
$suite = page_sure($_POST['redirect'] ?? '');

$e = [];
if (mb_strlen($nom) < 2 || mb_strlen($nom) > 80) $e['nom'] = 'Entrez votre nom (2 caractères minimum).';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $e['email'] = 'Entrez une adresse email valide.';
if (strlen($mdp) < 8) $e['mot_de_passe'] = '8 caractères minimum.';
elseif ($mdp !== ($_POST['confirmation'] ?? '')) $e['confirmation'] = 'Les mots de passe ne correspondent pas.';
if (!preg_match('/^(\+?237)?[26]\d{8}$/', $tel)) $e['telephone'] = 'Numéro camerounais attendu, ex. 6 77 00 00 00.';
if (empty($_POST['accepte'])) $e['accepte'] = 'Vous devez accepter la politique de confidentialité.';

if (!$e) {
    $q = db()->prepare('SELECT 1 FROM utilisateurs WHERE email = ?');
    $q->execute([$email]);
    if ($q->fetch()) $e['email'] = 'Cet email a déjà un compte. Utilisez « J\'ai déjà un compte ».';
}

if (!$e) {
    $q = db()->prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe, langue, adresse, telephone) VALUES (?,?,?,?,?,?)');
    $q->execute([$nom, $email, password_hash($mdp, PASSWORD_DEFAULT), $langue, $adresse, $tel]);
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) db()->lastInsertId();
    $_SESSION['nom'] = $nom;
    if ($ajax) json_out(['ok' => true, 'nom' => $nom, 'redirect' => $suite]);
    header('Location: ' . $suite); exit;
}

if ($ajax) json_out(['ok' => false, 'erreurs' => $e], 422);
header('Location: inscription.html?erreur=' . urlencode(implode(' ', $e)) . '&redirect=' . urlencode($suite));
