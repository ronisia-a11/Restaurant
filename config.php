<?php
$host = 'localhost';
$db   = 'restaurant';
$user = 'root';   // par défaut sous XAMPP/WAMP
$pass = '';       // mot de passe vide par défaut
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    die('Erreur connexion : ' . $e->getMessage());
}
?>
