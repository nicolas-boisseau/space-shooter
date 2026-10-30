# Starfall — prototype v0

Petit shoot'em up vertical réalisé avec Phaser 4 et Vite.

## Lancer le jeu

```sh
npm install
npm run dev
```

## Publication sur GitHub Pages

Le jeu est disponible sur https://nicolas-boisseau.github.io/space-shooter/.

Chaque push sur `main` déclenche le workflow
`.github/workflows/deploy-pages.yml` : installation avec `npm ci`, compilation
avec `npm run build`, puis déploiement du dossier `dist` sur GitHub Pages.
Le workflow peut aussi être lancé manuellement depuis l'onglet Actions du dépôt.
Dans Settings > Pages, la source de publication doit être **GitHub Actions**.

Pour prévisualiser la version de production localement :

```sh
npm run build
npm run preview
```

Ouvrir ensuite http://localhost:4173/space-shooter/. Vite utilise le préfixe
`/space-shooter/` en production et `/` avec `npm run dev`. Les dépendances,
le dossier `dist` et les réglages de l'éditeur ne sont pas versionnés.

## Commandes

- Flèches : déplacer le vaisseau
- Espace (maintenir) : tirer automatiquement
- Entrée : recommencer après une collision
- Mobile : toucher la zone de jeu et glisser pour placer le vaisseau sous le
  doigt (dans les limites de l'écran). Le tir démarre dès le premier contact,
  puis conserve sa cadence tant que le doigt reste posé ; le relâcher arrête
  le tir. Un seul doigt pilote le vaisseau, les contacts supplémentaires sont ignorés.
- Après une défaite : toucher la zone de jeu pour recommencer une fois
  l'explosion terminée. Un nouveau contact est nécessaire pour reprendre le pilotage.

Le défilement tactile de la page est bloqué uniquement sur le canvas du jeu.
Une interruption du contact ou la mise en arrière-plan libère le contrôle tactile.

Les ennemis lâchent parfois des modules : multitir, cadence accélérée ou changement d'arme. Le tir peut évoluer des projectiles simples vers des missiles ou des lasers.

Le vaisseau Mantis utilise une spritesheet originale (`public/assets/mantis.png`) :
5 colonnes de poses, du virage gauche au virage droit, et 4 lignes de propulsion.
Chaque case mesure 96 × 128 px, affichée à demi-échelle. Le roulis passe
progressivement par les poses intermédiaires, puis revient au neutre lorsque les
flèches latérales sont relâchées. La zone de collision ne change pas avec la pose.

Chaque ennemi reçoit aléatoirement l'apparence Viper, Wisp ou Bastion, avec les
mêmes chances. La spritesheet `public/assets/enemies.png` contient 3 colonnes
(une par modèle) et 4 lignes de propulsion animée à 12 images/s, en cases de
96 × 128 px affichées à demi-échelle. Les appareils sont orientés dans le sens
de leur déplacement. Le modèle est purement visuel : vitesses, points de vie,
collisions, score et bonus restent identiques.

Les destructions utilisent `public/assets/explosions.png` : 12 colonnes de
128 × 128 px, avec une ligne pour les ennemis (600 ms) et une pour le joueur
(850 ms). Chaque explosion est jouée une seule fois puis supprimée. À la mort
du joueur, le vaisseau disparaît et le combat se fige ; l'écran de fin et le
redémarrage avec Entrée deviennent disponibles après l'explosion.

## Survol de Bordeaux

Le décor original est dessiné en Canvas 2D dans
`src/background/BordeauxBackground.js`, puis découpé en 8 textures de
960 × 960 px pour Phaser. Il n'utilise ni images distantes ni service de cartes.
Les textures sont réutilisées au redémarrage ; aucune carte n'est redessinée
à chaque frame.

Le parcours défile à 32 px/s du sud vers le nord : pont Simone-Veil et Arkéa
Arena, pont Saint-Jean, Saint-Michel, pont de Pierre, centre historique,
Chaban-Delmas et Cité du Vin, bassins à flot, puis pont d'Aquitaine. La Bourse
et son miroir d'eau, les Quinconces, le Grand Théâtre et Saint-André figurent
sur la rive gauche. C'est une illustration cartoon aux distances compressées,
pas une carte à l'échelle. Après environ deux minutes, le décor boucle pour
accompagner le jeu sans fin. Un voile blanc à 42 % d'opacité atténue le décor.
Quatre sprites de nuages translucides (50 % d'opacité) défilent en parallaxe
au-dessus du décor, mais sous les vaisseaux, les tirs et l'interface pour
préserver la lisibilité du combat. Leur texture est dessinée et mise en cache
une seule fois. Les opacités sont définies par `BACKGROUND_VEIL_ALPHA` et
`CLOUD_ALPHA` dans le module du décor.
Le décor comme les nuages se figent à la mort du joueur.

Le tissu urbain est dessiné en îlots irréguliers : maisons mitoyennes à toits
de tuiles, petites cours, cheminées et verrières dans le centre, hangars et
toitures métalliques vers Bacalan, quartiers plus végétalisés sur la rive
droite. Les rues, les ombres, le grain des matériaux, les bateaux, les arbres
et le mobilier des quais sont calculés une seule fois avec une graine fixe.
Le dessin s'inspire de l'observation de la
[vue aérienne du centre de Bordeaux sur Google Maps](https://www.google.com/maps/@44.846,-0.568,1670m/data=!3m1!1e3),
sans copier ni charger les images ou tuiles Google/Bing dans le jeu.
Les positions des monuments et le tracé de la Garonne restent inchangés.
