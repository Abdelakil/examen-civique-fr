# 🇫🇷 Préparation à l'Examen Civique 

Une application web moderne, interactive et responsive pour s'entraîner au examen civique de la **Carte de Séjour Pluriannuelle (CSP)** et de la **Carte de Résident (CR)**.

## 🚀 Fonctionnalités

- **Double mode de révision** : Simulation d'examen complet (40 questions) ou entraînement ciblé par thème.
- **Navigation fluide** : Boutons précédent/suivant pour naviguer librement dans le quiz.
- **Indices intégrés** : Système de "hints" pour aider à la réflexion sans donner la réponse immédiatement.
- **Tableau de bord en temps réel** : Suivi des scores, des erreurs et de la progression par thème.
- **Design Institutionnel** : Interface inspirée de la charte graphique de la République Française, propre et accessible.
- **Totalement Responsive** : Optimisé pour ordinateurs, tablettes et smartphones.

## 🛠️ Installation & Utilisation Locale

Comme le projet utilise des fichiers JSON pour les questions, un serveur local est nécessaire pour le développement :

1. Clonez le dépôt ou téléchargez les fichiers.
2. Ouvrez le projet avec **Visual Studio Code**.
3. Utilisez l'extension **Live Server** (clic droit sur `index.html` > *Open with Live Server*).
4. Le quiz est accessible à l'adresse `http://127.0.0.1:5500`.

## 📁 Structure du Projet

- `index.html` : Structure de l'application.
- `style.css` : Design moderne avec Flexbox et variables CSS.
- `app.js` : Logique du quiz, gestion de la navigation et des statistiques.
- `CSP.json` / `CR.json` : Banques de données des questions.

---

### 🔴 Priorité Critique (IA & Innovation)
- [X] **Générateur de "Mises en Situation" (Gemini API)** : Utiliser l'IA pour créer des questions contextuelles qui ne sont pas dans la base de données fixe.
- [ ] **Rédiger un tutorial pour la génération de l'API** : Rédaction d'un tutorial pour générer les questions de mise en situation en utilisant l'IA (Gemini).

### 🟢 Priorité Haute
- [X] **Sauvegarde locale** : Utiliser `localStorage` pour enregistrer le mode sombre et l'API key.
- [X] **Indices** : Ajouter des indices pour chaque question dans la base de donnée.

### 🟡 Priorité Moyenne
- [X] **Chronomètre** : Ajouter un temps limité pour le mode "Simulation d'examen" (comme en conditions réelles).
- [ ] **Générateur de PDF** : Permettre d'exporter ses erreurs en fin de quiz pour les réviser sur papier.

### 🔵 Priorité Basse / Bonus
- [X] **Mode Sombre (Dark Mode)** : Proposer une variante visuelle pour le confort nocturne.
- [ ] **Multilingue** : Interface en plusieurs langues pour aider à la compréhension des termes techniques.

---

## ⚖️ Licence
Projet réalisé dans un but pédagogique. Les contenus des questions sont basés sur les livrets officiels du citoyen.