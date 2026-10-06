-- Base MySQL de Douala Délices. Importer ce fichier une seule fois (phpMyAdmin ou: mysql -u root -p < schema.sql)
CREATE DATABASE IF NOT EXISTS douala_delices CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE douala_delices;

CREATE TABLE IF NOT EXISTS utilisateurs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  langue VARCHAR(40),
  adresse VARCHAR(60),
  telephone VARCHAR(20),
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plats (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  prix INT UNSIGNED NOT NULL COMMENT 'en FCFA',
  categorie VARCHAR(40) NOT NULL,
  image_url VARCHAR(300),
  disponible TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NOT NULL,
  nom VARCHAR(80) NOT NULL,
  type ENUM('table','salle','nourriture') NOT NULL,
  date_reservation DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  personnes TINYINT UNSIGNED NOT NULL,
  notes VARCHAR(300),
  statut ENUM('en_attente','confirmee','annulee') NOT NULL DEFAULT 'en_attente',
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (date_reservation, type),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS commandes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NOT NULL,
  nom_personne VARCHAR(80) NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  adresse VARCHAR(60) NOT NULL,
  repere VARCHAR(150),
  paiement ENUM('especes','mobile_money') NOT NULL,
  note VARCHAR(200),
  sous_total INT UNSIGNED NOT NULL,
  frais INT UNSIGNED NOT NULL,
  total INT UNSIGNED NOT NULL,
  statut ENUM('en_attente','en_preparation','en_livraison','livree','annulee') NOT NULL DEFAULT 'en_attente',
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS commande_lignes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  commande_id INT UNSIGNED NOT NULL,
  plat_id INT UNSIGNED NOT NULL,
  nom_plat VARCHAR(100) NOT NULL,
  prix_unitaire INT UNSIGNED NOT NULL,
  quantite TINYINT UNSIGNED NOT NULL,
  FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
  FOREIGN KEY (plat_id) REFERENCES plats(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages_contact (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT UNSIGNED NULL,
  nom VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL,
  sujet VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  traite TINYINT(1) NOT NULL DEFAULT 0,
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Plats d'exemple : remplacez par votre vraie carte et vos vrais prix.
INSERT INTO plats (nom, description, prix, categorie, image_url) VALUES
('Ndolé au poisson', 'Plat traditionnel camerounais.', 5000, 'Plats africains', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=70'),
('Poulet DG', 'Poulet braisé avec banane plantain.', 4500, 'Plats africains', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=70'),
('Brochettes grillées', 'Viande marinée aux épices, grillée au feu de bois.', 3000, 'Plats africains', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=70'),
('Poisson braisé', 'Servi avec bâton de manioc ou plantains et sauce pimentée.', 6000, 'Plats africains', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=70'),
('Pizza maison', 'Pâte fine, mozzarella fondante et garnitures au choix.', 5500, 'International', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=70'),
('Pâtes fraîches', 'Sauce tomate basilic ou crème, cuites al dente.', 4000, 'International', 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=70'),
('Salade composée', 'Légumes croquants et vinaigrette légère.', 2500, 'International', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=70'),
('Jus de bissap', 'Boisson fraîche à l\'hibiscus.', 1000, 'Boissons', NULL);
