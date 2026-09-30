# Portfolio de Toufik Ait Amrane

Portfolio personnel présentant mon parcours, mes compétences et mes réalisations dans le cadre de mon BTS Services Informatiques aux Organisations (BTS SIO), option SLAM.

Le site est conçu en HTML, CSS et JavaScript natifs et publié comme site statique. Le contrôle reCAPTCHA v2 est vérifié par un Cloudflare Worker ; aucun serveur applicatif ni étape de compilation n'est nécessaire pour le site lui-même.

## Contenu du portfolio

- Présentation et parcours de formation
- Compétences techniques et outils
- Projets : EduSIO, VoisinPartage, CliniqueApp, OMAZA et Coach Sportif IA
- Expériences et veille technologique
- CV téléchargeable
- Formulaire de contact avec validation, Google reCAPTCHA v2 et champ honeypot
- Mise en page responsive et animations au défilement

## Technologies utilisées

- HTML5
- CSS3
- JavaScript natif
- Bootstrap 5.3.3 et Bootstrap Icons 1.11.3, chargés depuis jsDelivr
- Polices Inter et Space Grotesk, chargées depuis Google Fonts

Une connexion Internet est nécessaire pour charger Bootstrap, les icônes et les polices depuis leurs CDN.

## Structure du projet

```text
.
├── index.html                 # Page principale
├── css/
│   └── style.css              # Styles et mise en page
├── js/
│   ├── config.js              # Clé publique reCAPTCHA et URL du Worker
│   └── main.js                # Interactions et animations
├── cloudflare-worker/
│   ├── wrangler.jsonc         # Configuration du Worker
│   └── src/
│       └── index.mjs          # Vérification serveur du jeton Google
├── assets/
│   ├── documents/             # CV et documents des projets
│   └── images/                # Portraits, projets et icônes
├── CHANGELOG.md               # Notes des évolutions publiées
└── README.md                  # Documentation du projet
```

## Prévisualiser le site en local

Il suffit d'ouvrir `index.html` dans un navigateur pour vérifier la mise en page. Le reCAPTCHA et sa vérification ne fonctionneront qu'après leur configuration. Pour tester le site avec un petit serveur local, depuis le dossier du projet sous Windows :

```powershell
py -m http.server 8000
```

Puis ouvrir [http://localhost:8000](http://localhost:8000) dans le navigateur. Arrêter le serveur avec `Ctrl+C`.

## Configurer le reCAPTCHA v2

La clé publique du widget peut être visible dans le navigateur. Le secret Google doit rester exclusivement dans Cloudflare : ne le placez jamais dans `js/config.js` ni dans un autre fichier publié par GitHub Pages.

1. Dans la [console d'administration reCAPTCHA](https://www.google.com/recaptcha/admin/create), créez une clé **reCAPTCHA v2 – Case à cocher « Je ne suis pas un robot »**. Ajoutez le nom d'hôte de votre site (par exemple `votre-utilisateur.github.io`) et récupérez la clé du site et la clé secrète.
2. L'origine `https://toufik12197.github.io` est déjà renseignée dans `cloudflare-worker/wrangler.jsonc`. Si vous utilisez un domaine personnalisé ou un autre compte GitHub, remplacez-la par l'origine exacte du site, sans chemin ni barre oblique finale.
3. Depuis PowerShell, à la racine du projet, publiez le Worker et enregistrez son secret :

   ```powershell
   Set-Location .\cloudflare-worker
   npx.cmd wrangler@latest login
   npx.cmd wrangler@latest secret put RECAPTCHA_SECRET
   npx.cmd wrangler@latest deploy
   Set-Location ..
   ```

   À l'invite, collez la clé secrète Google. La commande de déploiement affiche l'adresse `workers.dev` du Worker.
4. Dans `js/config.js`, remplacez `REMPLACER_PAR_CLE_PUBLIQUE_GOOGLE` par la clé du site, et `REMPLACER_PAR_URL_WORKER.workers.dev` par l'adresse du Worker suivie de `/verify`.
5. Publiez le site sur GitHub Pages. Le Worker n'accepte que les requêtes provenant de l'origine indiquée dans `ALLOWED_ORIGIN` et vérifie aussi le nom d'hôte renvoyé par Google.

Pour tester depuis `http://localhost:8000`, ajoutez `localhost` aux domaines autorisés de la clé Google et remplacez temporairement `ALLOWED_ORIGIN` par `http://localhost:8000`, puis redéployez le Worker. Restaurez l'origine de production avant la mise en ligne.

Le formulaire continue à préparer un message avec `mailto` : l'application de messagerie du visiteur doit être configurée et l'envoi final se fait dans cette application. Le Worker valide bien le jeton reCAPTCHA côté serveur, mais ne reçoit ni ne stocke le message.

## Mise en ligne avec GitHub Pages

Le site étant statique, GitHub Pages peut le publier directement depuis le dépôt, sans compilation.

1. Créer un dépôt GitHub et envoyer les fichiers du projet dans la branche `main`. Si le dossier n'est pas encore un dépôt Git, exécuter ces commandes depuis sa racine en remplaçant l'URL par celle du dépôt créé :

   ```powershell
   git init -b main
   git add .
   git commit -m "feat: mise en ligne initiale du portfolio"
   git remote add origin https://github.com/UTILISATEUR/NOM-DU-DEPOT.git
   git push -u origin main
   ```

2. Sur GitHub, ouvrir **Settings > Pages**.
3. Dans **Build and deployment**, choisir **Deploy from a branch**, puis sélectionner la branche `main` et le dossier `/(root)`, et enregistrer.
4. Attendre la fin du déploiement. GitHub Pages affichera l'adresse publique du site dans les paramètres **Pages**.

Une fois GitHub Pages activé, chaque `git push` vers la branche publiée déclenche une nouvelle publication. Il n'y a pas de workflow GitHub Actions personnalisé à configurer dans ce projet.

## Garder une trace des mises à jour

Chaque commit envoyé sur GitHub constitue une trace datée dans l'historique Git. Pour une trace facile à lire par les visiteurs et les futurs recruteurs, noter aussi les changements importants dans [`CHANGELOG.md`](CHANGELOG.md) :

1. Ajouter une note dans la section **À venir** du fichier, en précisant la date et le type de changement.
2. Inclure le fichier de changelog dans le commit qui accompagne la modification.
3. Envoyer le commit sur la branche publiée : l'historique Git conservera le détail du commit et GitHub Pages republiera le site.
4. Lors d'une mise en ligne notable, déplacer les notes dans une entrée datée (par exemple `## [1.0.0] - AAAA-MM-JJ`) et recommencer avec une nouvelle section **À venir**.

Exemples de messages de commit :

```text
feat: ajoute un nouveau projet
fix: corrige l'affichage du menu sur mobile
docs: actualise le CV et le changelog
style: améliore la section compétences
```

Les préfixes (`feat`, `fix`, `docs`, `style`) aident à repérer rapidement la nature de chaque mise à jour.

## Avant chaque publication

- Vérifier le rendu sur ordinateur et mobile.
- Tester les liens, le téléchargement du CV et le formulaire de contact. Le reCAPTCHA doit être configuré et le Worker déployé ; le formulaire prépare ensuite un message avec `mailto` et nécessite une application de messagerie configurée chez le visiteur.
- Vérifier que les informations personnelles et les documents placés dans `assets/` peuvent être rendus publics.
- Mettre à jour `CHANGELOG.md`, puis vérifier les fichiers concernés avec `git status` avant de créer le commit.