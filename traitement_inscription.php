<?php
header('Content-Type: application/json');
require 'config.php'; // fichier qui contient la connexion PDO à ta base MySQL

// Récupération et nettoyage des champs
$nom_telephone = htmlspecialchars(trim($_POST['nom'] ?? ''));
$email = htmlspecialchars(trim($_POST['email'] ?? ''));
$mot_de_passe = htmlspecialchars(trim($_POST['mot_de_passe'] ?? ''));
$langue = htmlspecialchars(trim($_POST['langue'] ?? ''));
$adresse = htmlspecialchars(trim($_POST['adresse'] ?? ''));
$telephone = htmlspecialchars(trim($_POST['telephone'] ?? ''));

// Vérification basique
if (empty($nom_telephone) || empty($email) || empty($mot_de_passe) || empty($langue) || empty($adresse) || empty($telephone)) {
    echo json_encode(['statut'=>'erreur','message'=>'Tous les champs sont obligatoires']);
    exit;
}

// Sécurisation du mot de passe (hachage)
$mot_de_passe_hash = password_hash($mot_de_passe, PASSWORD_DEFAULT);

// Insertion SQL dans la table client
$sql = "INSERT INTO client (nom_telephone, telephone, email, mot_de_passe, langue, adresse) 
        VALUES (?, ?, ?, ?, ?, ?)";
$stmt = $pdo->prepare($sql);
$stmt->execute([$nom_telephone, $telephone, $email, $mot_de_passe_hash, $langue, $adresse]);

echo json_encode(['statut'=>'ok','message'=>'Client ajouté avec succès !']);
?>
