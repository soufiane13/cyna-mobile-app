# 📱 CYNA Defense - Application Mobile

Bienvenue sur le dépôt de l'application mobile **CYNA Defense**. 
Développée en **React Native** via le framework **Expo**, cette application est l'interface utilisateur mobile de notre écosystème. Elle communique en temps réel avec notre backend NestJS (Render) et s'appuie sur Supabase pour la gestion sécurisée des données.

---

## 🛠️ Stack Technique

* **Frontend Mobile :** React Native, Expo, Expo Router
* **Backend API (Connecté) :** NestJS (Render)
* **Base de données / Auth :** Supabase
* **Paiement :** Stripe
* **Tests Unitaires :** Jest & React Native Testing Library (Mock Tests)
* **Build & Déploiement :** Expo Application Services (EAS Build)

---

## 🚀 Guide d'installation

### 1. Prérequis
Assurez-vous d'avoir installé sur votre machine :
* [Node.js](https://nodejs.org/) (Version LTS recommandée)
* L'application **Expo Go** sur votre smartphone (iOS ou Android), ou un émulateur local (Android Studio / Xcode).

### 2. Cloner et installer les dépendances
Naviguez dans le dossier de l'application mobile et installez les dépendances. 
*⚠️ Important : Nous utilisons le flag `--legacy-peer-deps` pour garantir la stabilité de l'environnement de test face aux exigences strictes des dépendances React 19.*

```bash
git clone [URL_DE_REPO_GITHUB]
cd cyna-mobile-app
npm install --legacy-peer-deps
```
3. Variables d'environnement (.env)
Créez un fichier .env à la racine du projet. L'application utilisant Expo, toutes les variables exposées doivent être préfixées par EXPO_PUBLIC_.


# URL de votre API Backend (NestJS)
```
EXPO_PUBLIC_API_URL=[https://votre-backend-render.com/api](https://votre-backend-render.com/api)
```

# Configuration Supabase (Clés Publiques UNIQUEMENT)
```
EXPO_PUBLIC_SUPABASE_URL=[https://vvqznavlkqjelpskjplh.supabase.co](https://vvqznavlkqjelpskjplh.supabase.co)
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme_publique
```

# Clé publique Stripe (Publishable Key)
```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique
```
💻 Démarrer l'application (Développement local)
Pour lancer le serveur de développement local :

```Bash
npx expo start
```
Scannez le QR Code affiché dans le terminal avec l'application Expo Go sur votre téléphone.

Ou appuyez sur la touche a pour l'ouvrir sur un émulateur Android, et i pour un simulateur iOS.

🧪 Tests et Assurance Qualité (QA)
La stabilité de notre interface et de notre logique métier est assurée par une suite de tests unitaires exécutée via Jest.

Pour lancer la validation du code :

```Bash
npm run test
```
Pour obtenir un rapport détaillé des tests (verbose) :

```Bash
npm run test -- --verbose
```
📦 Compilation et Déploiement (APK / AAB)
Le projet est configuré pour être compilé directement dans le cloud grâce à l'infrastructure Expo EAS (Expo Application Services), ce qui évite de surcharger la machine locale.

Pour générer un fichier d'installation (ex: un APK pour Android) :

Connectez-vous à votre compte Expo CLI :

```Bash
npx expo login
```
Lancez le build Android :

```Bash
eas build -p android --profile preview
```
Une fois le processus terminé, suivez le lien généré dans le terminal pour télécharger l'application compilée.
