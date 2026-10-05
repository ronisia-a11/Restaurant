<?php
require __DIR__ . '/auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: inscription.html?mode=connexion'); exit; }

$ajax = ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';
$email = strtolower(trim($_POST['email'] ?? ''));
$suite = page_sure($_POST['redirect'] ?? '');

$q = db()->prepare('SELECT id, nom, mot_de_passe FROM utilisateurs WHERE email = ?');
$q->execute([$email]);
$u = $q->fetch(PDO::FETCH_ASSOC);

if ($u && password_verify($_POST['mot_de_passe'] ?? '', $u['mot_de_passe'])) {
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $u['id'];
    $_SESSION['nom'] = $u['nom'];
    if ($ajax) json_out(['ok' => true, 'nom' => $u['nom'], 'redirect' => $suite]);
    header('Location: ' . $suite); exit;
}

$msg = 'Email ou mot de passe incorrect.';
if ($ajax) json_out(['ok' => false, 'erreurs' => ['mot_de_passe' => $msg]], 401);
header('Location: inscription.html?mode=connexion&erreur=' . urlencode($msg) . '&redirect=' . urlencode($suite));
