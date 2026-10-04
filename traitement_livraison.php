<?php
header('Content-Type: application/json');
require 'config.php'; // fichier qui contient la connexion PDO à ta base MySQL

// Récupération et nettoyage des champs
$nom_personne = htmlspecialchars(trim($_POST['nom_personne'] ?? ''));
$adresse = htmlspecialchars(trim($_POST['adresse'] ?? ''));
$nom_commande = htmlspecialchars(trim($_POST['nom_commande'] ?? ''));

// Vérification basique
if (empty($nom_personne) || empty($adresse) || empty($nom_commande)) {
    echo json_encode(['statut'=>'erreur','message'=>'Tous les champs sont obligatoires']);
    exit;
}

// Insertion SQL dans la table livraison
$sql = "INSERT INTO livraison (nom_personne, adresse, nom_commande) VALUES (?, ?, ?)";
$stmt = $pdo->prepare($sql);
$stmt->execute([$nom_personne, $adresse, $nom_commande]);

echo json_encode(['statut'=>'ok','message'=>'Livraison enregistrée avec succès !']);
?>
