<?php
require __DIR__ . '/auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: contact.html'); exit; }
if (!empty($_POST['site'])) json_out(['ok' => true]); // champ piège réservé aux robots

if (time() - ($_SESSION['dernier_message'] ?? 0) < 30)
    json_out(['ok' => false, 'erreurs' => ['global' => 'Patientez quelques secondes avant un nouveau message.']], 429);

$nom = trim($_POST['nom'] ?? '');
$email = trim($_POST['email'] ?? '');
$sujet = $_POST['sujet'] ?? '';
$msg = trim($_POST['message'] ?? '');

$e = [];
if (mb_strlen($nom) < 2 || mb_strlen($nom) > 80) $e['nom'] = 'Entrez votre nom.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $e['email'] = 'Entrez une adresse email valide.';
if (!in_array($sujet, ['question', 'reservation', 'livraison', 'reclamation', 'autre'], true)) $e['sujet'] = 'Choisissez un sujet.';
if (mb_strlen($msg) < 10 || mb_strlen($msg) > 1000) $e['message'] = 'Votre message doit faire entre 10 et 1000 caractères.';
if ($e) json_out(['ok' => false, 'erreurs' => $e], 422);

db()->prepare('INSERT INTO messages_contact (utilisateur_id, nom, email, sujet, message) VALUES (?,?,?,?,?)')
    ->execute([$_SESSION['user_id'] ?? null, $nom, $email, $sujet, $msg]);
$_SESSION['dernier_message'] = time();
json_out(['ok' => true]);
