-- =====================================================================
-- Tableau de bord du personnel de Douala Délices
-- À importer APRÈS schema.sql (phpMyAdmin, ou: mysql -u root -p < dashboard.sql)
--
-- MOTS DE PASSE CHOISIS (en clair, pour votre information) :
--   admin       mot de passe en clair : Admin2026
--   cuisinier   mot de passe en clair : Cuisine2026
--   livreur     mot de passe en clair : Livre2026
--   serveur     mot de passe en clair : Salle2026
--
-- La base ne contient que les versions HACHÉES (bcrypt) : impossible de relire
-- le mot de passe depuis la base. CHANGEZ-LES avant la mise en ligne.
--
-- Pour changer un mot de passe :
--   1) page Personnel du tableau de bord (connecté en admin), ou
--   2) générez un haché : php -r "echo password_hash('NouveauMotDePasse', PASSWORD_DEFAULT);"
--      puis : UPDATE personnel SET mot_de_passe = '<le haché>' WHERE nom = 'cuisinier';
-- =====================================================================
USE douala_delices;

ALTER TABLE commandes
  MODIFY utilisateur_id INT UNSIGNED NULL,
  MODIFY telephone VARCHAR(20) NULL,
  MODIFY adresse VARCHAR(60) NULL,
  MODIFY paiement ENUM('especes','mobile_money') NULL,
  MODIFY statut ENUM('en_attente','en_preparation','prete','en_livraison','livree','servie','annulee') NOT NULL DEFAULT 'en_attente',
  ADD COLUMN type ENUM('livraison','sur_place') NOT NULL DEFAULT 'livraison' AFTER utilisateur_id,
  ADD COLUMN table_numero TINYINT UNSIGNED NULL AFTER type,
  ADD COLUMN serveur_id INT UNSIGNED NULL,
  ADD COLUMN livreur_id INT UNSIGNED NULL,
  ADD INDEX idx_statut_type (statut, type);

ALTER TABLE commande_lignes
  ADD COLUMN statut ENUM('a_faire','pret','servi') NOT NULL DEFAULT 'a_faire';

CREATE TABLE IF NOT EXISTS personnel (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(30) NOT NULL UNIQUE,
  role ENUM('admin','cuisinier','livreur','serveur') NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tentatives_connexion (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (ip, cree_le)
) ENGINE=InnoDB;

INSERT IGNORE INTO personnel (nom, role, mot_de_passe) VALUES
('admin', 'admin', '$2y$10$CUSYSbz6pDL5Rn7mslkrKOWFI0ahpKUGyn8.a65aMc27wuUmCUNLu'),
('cuisinier', 'cuisinier', '$2y$10$BHx6vZRsZkmE1F0oHe9KheCA/dbexcBD9dRfRXSv1LDNWIW1RSpwS'),
('livreur', 'livreur', '$2y$10$nWZ97bIoDvUCJPymgN8Z0uwo5p8N3m2SCiIhfpicNL1TcUj3m0V7q'),
('serveur', 'serveur', '$2y$10$um68sm7tTi0wiET.liClL.JbZI3DsnaPExk81XlCGuVoO81Oov2Su');
