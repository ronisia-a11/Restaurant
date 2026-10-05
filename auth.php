<?php
// Fonctions communes : session, base de données, protection des pages.
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
if (session_status() === PHP_SESSION_NONE) session_start();

const PAGES_SURES = ['index.html', 'menus.html', 'reservation.html', 'livraison.html', 'aide.html', 'contact.html'];

function page_sure($p) { return in_array($p, PAGES_SURES, true) ? $p : 'index.html'; }

function db() {
    static $pdo;
    if (!$pdo) {
        $dir = __DIR__ . '/data';
        if (!is_dir($dir)) { mkdir($dir, 0750, true); file_put_contents($dir . '/.htaccess', "Require all denied\n"); }
        $pdo = new PDO('sqlite:' . $dir . '/douala.sqlite'); // pour MySQL : new PDO('mysql:host=...;dbname=...;charset=utf8mb4', $user, $pass)
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("CREATE TABLE IF NOT EXISTS utilisateurs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, nom TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
            mot_de_passe TEXT NOT NULL, langue TEXT, adresse TEXT, telephone TEXT,
            cree_le TEXT DEFAULT CURRENT_TIMESTAMP)");
    }
    return $pdo;
}

function connecte() { return !empty($_SESSION['user_id']); }

function json_out($d, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}

// À appeler en haut de traitement_reservation.php et de tout script de commande.
function exiger_connexion($raison = 'reservation', $page = 'reservation.html') {
    if (connecte()) return;
    $url = 'inscription.html?raison=' . $raison . '&redirect=' . urlencode(page_sure($page));
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch') json_out(['ok' => false, 'redirect' => $url], 401);
    header('Location: ' . $url);
    exit;
}

// État de connexion pour garde.js : auth.php?statut=1
if (realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__ && isset($_GET['statut'])) {
    json_out(['connecte' => connecte(), 'nom' => $_SESSION['nom'] ?? null]);
}
