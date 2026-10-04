<?php
header('Content-Type: application/json');
require 'config.php'; // fichier qui contient la connexion PDO à ta base MySQL

// Récupération et nettoyage des champs
$nom = htmlspecialchars(trim($_POST['nom'] ?? ''));
$type = htmlspecialchars(trim($_POST['type'] ?? ''));
$date_reservation = htmlspecialchars(trim($_POST['date'] ?? ''));
$heure_debut = htmlspecialchars(trim($_POST['heure_debut'] ?? ''));
$heure_fin = htmlspecialchars(trim($_POST['heure_fin'] ?? ''));

// Vérification basique
if (empty($nom) || empty($type) || empty($date_reservation) || empty($heure_debut) || empty($heure_fin)) {
    echo json_encode(['statut'=>'erreur','message'=>'Tous les champs sont obligatoires']);
    exit;
}

// Insertion SQL dans la table reservation
$sql = "INSERT INTO reservation (nom,type_reservation,  date_reservation, heure_debut, heure_fin) 
        VALUES (?, ?, ?, ?, ?)";
$stmt = $pdo->prepare($sql);
$stmt->execute([$nom, $type, $date_reservation, $heure_debut, $heure_fin]);

echo json_encode(['statut'=>'ok','message'=>'Réservation ajoutée avec succès !']);
?>
