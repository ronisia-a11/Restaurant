<?php
// Fonctions communes : session, base MySQL, protection des scripts.
require_once __DIR__ . '/config.php';
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
if (session_status() === PHP_SESSION_NONE) session_start();

const PAGES_SURES = ['index.html', 'menus.html', 'reservation.html', 'livraison.html', 'aide.html', 'contact.html'];

function page_sure($p) { return in_array($p, PAGES_SURES, true) ? $p : 'index.html'; }

function db() {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
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

set_exception_handler(function ($e) {
    error_log($e);
    json_out(['ok' => false, 'erreurs' => ['global' => 'Erreur du serveur. Réessayez dans un instant.']], 500);
});

// À appeler en haut des scripts qui réservent ou commandent.
function exiger_connexion($raison = 'reservation', $page = 'reservation.html') {
    if (connecte()) return;
    $url = 'inscription.html?raison=' . $raison . '&redirect=' . urlencode(page_sure($page));
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch') json_out(['ok' => false, 'redirect' => $url], 401);
    header('Location: ' . $url);
    exit;
}

// État de connexion pour garde.js et le pré-remplissage : auth.php?statut=1
if (realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__ && isset($_GET['statut'])) {
    $d = ['connecte' => connecte(), 'nom' => null, 'telephone' => null, 'adresse' => null];
    if (connecte()) {
        $q = db()->prepare('SELECT nom, telephone, adresse FROM utilisateurs WHERE id = ?');
        $q->execute([$_SESSION['user_id']]);
        $d = array_merge($d, $q->fetch() ?: []);
    }
    json_out($d);
}
