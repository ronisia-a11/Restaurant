<?php
require __DIR__ . '/auth.php';
$plats = db()->query('SELECT id, nom, description, prix, categorie, image_url FROM plats WHERE disponible = 1 ORDER BY categorie, nom')->fetchAll();
json_out(['plats' => $plats, 'frais' => FRAIS_LIVRAISON]);
