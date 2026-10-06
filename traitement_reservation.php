<?php
require __DIR__ . '/auth.php';
exiger_connexion('reservation', 'reservation.html');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: reservation.html'); exit; }

$nom = trim($_POST['nom'] ?? '');
$type = $_POST['type'] ?? '';
$date = $_POST['date'] ?? '';
$deb = $_POST['heure_debut'] ?? '';
$fin = $_POST['heure_fin'] ?? '';
$n = (int) ($_POST['personnes'] ?? 0);
$notes = mb_substr(trim($_POST['notes'] ?? ''), 0, 300);

$HORAIRES = [0 => [12, 21], 1 => [11, 22], 2 => [11, 22], 3 => [11, 22], 4 => [11, 22], 5 => [11, 23], 6 => [11, 23]];
$CAPACITE = ['table' => 15, 'salle' => 1, 'nourriture' => 999]; // réservations simultanées max par type

$e = [];
if (mb_strlen($nom) < 2 || mb_strlen($nom) > 80) $e['nom'] = 'Entrez votre nom (2 caractères minimum).';
if (!isset($CAPACITE[$type])) $e['type'] = 'Choisissez un type de réservation.';
$dt = DateTime::createFromFormat('Y-m-d', $date);
if (!$dt || $dt->format('Y-m-d') !== $date) $e['date'] = 'Date invalide.';
elseif ($date < date('Y-m-d')) $e['date'] = 'Choisissez une date à venir.';
$re = '/^([01]\d|2[0-3]):[0-5]\d$/';
if (!preg_match($re, $deb)) $e['heure_debut'] = 'Heure invalide.';
if (!preg_match($re, $fin)) $e['heure_fin'] = 'Heure invalide.';
if ($n < 1 || $n > 30) $e['personnes'] = 'Entre 1 et 30 personnes.';

if (!$e) {
    [$o, $c] = $HORAIRES[(int) date('w', strtotime($date))];
    if ($deb < sprintf('%02d:00', $o)) $e['heure_debut'] = "Nous ouvrons à {$o}h ce jour-là.";
    elseif ($fin > sprintf('%02d:00', $c)) $e['heure_fin'] = "Nous fermons à {$c}h ce jour-là.";
    elseif ($fin <= $deb) $e['heure_fin'] = 'L\'heure de fin doit suivre l\'heure de début.';
    elseif ($date === date('Y-m-d') && $deb <= date('H:i')) $e['heure_debut'] = 'Cette heure est déjà passée.';
}
if (!$e) {
    $q = db()->prepare("SELECT COUNT(*) FROM reservations WHERE type = ? AND date_reservation = ? AND statut <> 'annulee' AND heure_debut < ? AND heure_fin > ?");
    $q->execute([$type, $date, $fin, $deb]);
    if ($q->fetchColumn() >= $CAPACITE[$type]) $e['heure_debut'] = 'Ce créneau est complet. Essayez un autre horaire.';
}
if ($e) json_out(['ok' => false, 'erreurs' => $e], 422);

db()->prepare('INSERT INTO reservations (utilisateur_id, nom, type, date_reservation, heure_debut, heure_fin, personnes, notes) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$_SESSION['user_id'], $nom, $type, $date, $deb, $fin, $n, $notes]);
json_out(['ok' => true, 'numero' => (int) db()->lastInsertId()]);
