# Feuille de route : faire du POS une solution professionnelle

## Context
Tu as demandé une analyse du système existant et une liste de fonctionnalités pour couvrir tous les besoins d'un commerçant, chacune avec son module et le besoin auquel elle répond. Ce document est cette analyse. Une fois validé, il sert de feuille de route : chaque bloc pourra être réalisé séparément, dans l'ordre de priorité ci-dessous.

## Ce qui existe déjà (constat)
| Module | Existant | Limites relevées dans le code |
|---|---|---|
| Vente (caisse) | Grille produits, catégories, panier (remise, stock plafonné côté écran, rendu monnaie), client, F9, modal de confirmation, ticket 58/80 mm, sons | **Le stock n'est jamais décrémenté** (`SaleController::store`) ; aucun mode de paiement enregistré ; caisse codée en dur `#01 / open` ; montant reçu non stocké |
| Produits | CRUD, image, SKU, stock, export Excel | Catégories **codées en dur** dans `routes/web.php` ; pas de prix d'achat ni de marge ; pas de code-barres dédié ; pas de seuil d'alerte |
| Scan | Page de scan basée sur le SKU | — |
| Clients | CRUD, type particulier/pro, export | Pas de crédit/solde, pas d'historique d'achats ni de fidélité |
| Historique ventes | Liste, détail, facture A4, export | Ventes toujours `completed` : **pas d'annulation ni de retour** |
| Rapports | CA du jour et du mois, nombre de ventes | Pas de marge, pas de rapport par caissier, par produit ou par période libre ; pas de clôture Z |
| Paramètres | Boutique, entreprise (RC/NIF), TVA, ticket, paiements, thème, sécurité, sauvegarde | Plusieurs réglages **sans effet** : devise (le format reste `DA` dans `formatCurrency.js`), thème, moyens de paiement, sauvegarde, invitation d'utilisateur, expiration de session |
| Utilisateurs | Auth, 2FA, profil | Rôle affiché « Caissier » pour tous : **pas de rôles ni de permissions** |
| Interface | Recherche globale, statut en ligne, plein écran, mode sombre partiel, FR/EN | Cloche de notifications factice (« 3 ») ; mode sombre limité à la navbar, au panier et à la sidebar |

---

## Propositions

### Priorité 1 : indispensable (fiabilité des chiffres et de l'argent)

| # | Module / fonctionnalité | Besoin du commerçant |
|---|---|---|
| 1 | **Ventes – décrément du stock + contrôle serveur** : vérifier le stock disponible et le décrémenter dans la transaction de vente, avec un journal des mouvements | Avoir un stock réel et juste, et ne jamais vendre ce qu'il n'a pas, même avec deux caisses ouvertes |
| 2 | **Paiements – modes et paiements mixtes** : espèces, carte, chèque, crédit, virement, plusieurs modes sur un même ticket, montant reçu et rendu enregistrés | Savoir combien il a encaissé par moyen de paiement et justifier sa caisse |
| 3 | **Caisse – sessions (ouverture / clôture, rapport Z)** : fond de caisse à l'ouverture, entrées et sorties d'espèces, clôture avec comptage, écart, rapport Z imprimable sur ticket | Contrôler le tiroir-caisse de chaque caissier chaque jour, repérer les écarts et les vols |
| 4 | **Ventes – annulation, retour et avoir** : annuler un ticket (motif, droit requis), retour partiel avec remise en stock, avoir ou remboursement | Gérer les erreurs de caisse et les retours clients sans fausser le CA ni le stock |
| 5 | **Utilisateurs – rôles et permissions** : Admin, Gérant, Caissier ; droits sur remise max, annulation, prix, rapports, paramètres ; invitation par e-mail (le bouton existe déjà) | Déléguer la caisse sans exposer les marges, les réglages ni les annulations |
| 6 | **Paramètres – rendre effectifs les réglages existants** : devise, thème, moyens de paiement actifs, expiration de session, logo sur ticket | Avoir une configuration qui fait vraiment ce qu'elle affiche |
| 7 | **Sauvegarde – sauvegarde réelle et restauration** : base SQLite et images, planifiée (le scheduler Laravel existe), téléchargement, restauration | Ne jamais perdre son historique de ventes ni son catalogue |

### Priorité 2 : gestion commerciale

| # | Module / fonctionnalité | Besoin du commerçant |
|---|---|---|
| 8 | **Catalogue – catégories gérables** : CRUD des catégories, couleur et icône, ordre d'affichage en caisse | Organiser son catalogue sans développeur |
| 9 | **Catalogue – prix d'achat, marge, codes-barres** : coût, prix TTC/HT, champ EAN-13, impression d'étiquettes code-barres | Connaître sa marge réelle et scanner tous ses articles |
| 10 | **Catalogue – variantes et unités** : tailles, couleurs, vente au poids ou au mètre, quantité décimale | Vendre correctement les produits à déclinaisons ou au détail |
| 11 | **Stock – alertes, inventaire, ajustements** : seuil mini par produit (le réglage « stock faible » existe), page d'inventaire avec comptage et écarts, ajustement motivé (casse, perte) | Éviter les ruptures et faire son inventaire annuel |
| 12 | **Achats – fournisseurs et réceptions** : fiches fournisseurs, bons de commande, réception qui alimente le stock et met à jour le prix d'achat | Réapprovisionner et suivre ses achats et ses dettes fournisseurs |
| 13 | **Clients – crédit et compte client** : plafond, ventes à crédit (le réglage existe), règlements partiels, relevé, relances | Gérer les clients professionnels qui paient en fin de mois |
| 14 | **Clients – fidélité** : points par achat, paliers, remise ou bon d'achat, historique d'achats sur la fiche | Faire revenir les clients et les connaître |
| 15 | **Promotions** : remise par produit, catégorie ou période, « 2 achetés = 1 offert », codes promo, prix de gros par quantité | Animer les ventes sans calcul manuel en caisse |
| 16 | **Documents – devis, bon de livraison, facture numérotée** : numérotation légale continue, devis convertible en vente, mentions RC/NIF/TVA | Répondre aux clients pros et respecter les obligations de facturation |
| 17 | **Ventes – tickets en attente** : mettre un panier de côté et en servir un autre | Ne pas bloquer la file quand un client a oublié un article |

### Priorité 3 : pilotage et confort

| # | Module / fonctionnalité | Besoin du commerçant |
|---|---|---|
| 18 | **Rapports avancés** : période libre ; CA, marge et panier moyen ; top et flop produits ; ventes par heure, caissier, catégorie et moyen de paiement ; TVA collectée ; export PDF/Excel | Prendre des décisions (stock, horaires, personnel) et préparer sa comptabilité |
| 19 | **Tableau de bord** : indicateurs du jour en temps réel, comparaison avec la veille et le mois précédent, alertes (stock, crédits échus) | Voir l'essentiel en un coup d'œil à l'ouverture |
| 20 | **Notifications réelles** (remplacer la cloche factice) : stock bas, rapport quotidien par e-mail, nouvelles ventes (les réglages existent) | Être prévenu sans surveiller l'écran |
| 21 | **Journal d'activité / audit** : qui a annulé, remisé, modifié un prix, ouvert le tiroir | Assurer la traçabilité et la confiance envers le personnel |
| 22 | **Mode hors ligne** : file d'attente des ventes en local, synchronisation au retour du réseau (le bouton Sync et le statut en ligne existent) | Continuer à vendre pendant une coupure internet |
| 23 | **Matériel** : tiroir-caisse (ouverture à l'impression), afficheur client, balance, impression directe ESC/POS (QZ Tray) | Avoir une caisse rapide et équipée comme en magasin |
| 24 | **Multi-caisses / multi-magasins** : plusieurs postes, stock par magasin, transferts entre magasins | Accompagner la croissance du commerce |
| 25 | **Interface complète** : mode sombre sur toutes les pages, arabe avec affichage de droite à gauche (proposé dans les réglages mais non traduit), tactile optimisé | Avoir un confort de travail adapté au marché local (Algérie : DA, RC/NIF, arabe) |
| 26 | **Import / export catalogue et clients** (Excel/CSV, l'export existe déjà) | Démarrer vite avec un catalogue existant |

---

## Ordre de réalisation recommandé
1. **Lot 1 – Fiabilité** (#1, #2, #4, #6) : stock juste, paiements enregistrés, retours. Ce lot conditionne la justesse de tous les rapports.
2. **Lot 2 – Contrôle** (#3, #5, #21) : sessions de caisse, rôles, audit.
3. **Lot 3 – Gestion** (#8, #9, #11, #12, #13) : catalogue, stock, achats, crédit.
4. **Lot 4 – Pilotage** (#18, #19, #20, #7).
5. **Lot 5 – Croissance** (#14 à #17, #22 à #26).

## Vérification (pour chaque lot réalisé)
- Tests Feature avec `DatabaseTransactions`, comme `tests/Feature/SettingsTest.php` et `SaleCheckoutTest.php`, pour ne pas toucher à la vraie base : stock décrémenté, refus si stock insuffisant, totaux par mode de paiement, retour qui remet en stock.
- `npm run build` et un parcours dans le navigateur intégré : vente, retour, clôture de caisse, rapport.
