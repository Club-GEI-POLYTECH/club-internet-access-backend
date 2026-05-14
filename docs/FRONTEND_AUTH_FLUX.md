# Guide frontend — inscription & mot de passe oublié

Ce document sert à **structurer les pages (vues) et les formulaires** côté Next.js (ou autre SPA) en accord avec l’API NestJS.  
Préfixe global de l’API : **`/api`** (ex. `https://votre-api.com/api/...`).  
Variable d’environnement front : **`NEXT_PUBLIC_API_URL`** = origine du **backend** (sans confondre avec l’URL du site vitrine). Le client `frontend-api-client.ts` du dépôt complète `/api` si besoin.

---

## 1. Création de compte (inscription étudiant)

Le backend ne crée le compte **qu’après validation du code** reçu par email. Deux écrans (ou deux étapes sur une même page) sont le bon modèle.

### Étape A — « Demander l’inscription » (formulaire initial)

| | |
|--|--|
| **Route front conseillée** | `/register`, `/inscription`, ou `/signup` |
| **Rôle** | Saisie identité + mot de passe ; envoi du code par email. |
| **API** | `POST /api/auth/register/request` |
| **Corps JSON** | `email` (string, email valide), `password` (string, **≥ 6** caractères), `firstName`, `lastName`, `phone` (optionnel) |
| **Auth** | Aucune (pas de JWT). |
| **Succès HTTP** | **200** |
| **Réponse JSON** | `{ "message": "Si cette adresse est valide et disponible, un code à 6 chiffres vient d’être envoyé par email." }` — **toujours le même message**, que l’email soit libre ou déjà pris (évite l’énumération d’emails côté UI, ne pas afficher « email déjà utilisé » sur cette étape uniquement à partir du 200). |
| **Erreurs** | **409** : email déjà enregistré (`ConflictException`) — tu peux alors afficher un message clair. **400** : validation (champs manquants, email invalide, mot de passe trop court) ou **échec d’envoi email** (Resend mal configuré) — afficher le `message` du corps JSON. |

**Organisation UI recommandée**

- Un formulaire avec champs : email, mot de passe (+ confirmation côté front uniquement), prénom, nom, téléphone optionnel.
- Après succès **200** : rediriger vers l’**étape B** en passant l’**email** (state global, `sessionStorage`, ou query `?email=` encodé — éviter de remettre le mot de passe en clair dans l’URL).
- Bouton secondaire : « J’ai déjà un code » → même écran B avec email saisi manuellement.

### Étape B — « Saisir le code à 6 chiffres »

| | |
|--|--|
| **Route front conseillée** | `/register/verify`, `/inscription/code`, ou étape 2 sur la même URL avec un stepper. |
| **Rôle** | Vérifier le code reçu par email et **créer le compte** + connexion automatique. |
| **API** | `POST /api/auth/register/verify` |
| **Corps JSON** | `email` (le même qu’à l’étape A), `code` (string **6 chiffres**, tel que reçu par email) |
| **Succès HTTP** | **200** |
| **Réponse JSON** | Même forme que le login : `{ "access_token": "...", "user": { ... } }` — **stocker le JWT** (cookie / `localStorage`) comme après un login classique, puis rediriger vers l’accueil connecté ou le onboarding. |
| **Erreurs** | **400** : code incorrect, code expiré, trop de tentatives, ou aucune demande en cours — lire `message` du JSON. **409** : course rare (email déjà créé entre-temps). |

**Organisation UI recommandée**

- Champs : email (pré-rempli, lecture seule si possible), code sur **6 positions** (inputs OTP ou un seul champ).
- Bouton **« Renvoyer le code »** → voir section suivante.
- Après succès : traiter comme un **login réussi** (token + user).

### Option — Renvoyer le code

| | |
|--|--|
| **API** | `POST /api/auth/register/resend` |
| **Corps JSON** | `{ "email" }` |
| **Succès** | **200** — `{ "message": "Un nouveau code a été envoyé par email." }` |
| **Erreurs** | **400** : pas de demande en cours, ou demande expirée — proposer de **recommencer depuis l’étape A**. |

**Quand l’afficher** : sur l’écran B, avec cooldown (ex. 60 s) pour limiter le spam.

---

## 2. Mot de passe oublié

Deux écrans : demande par email, puis **réinitialisation** sur une page ouverte depuis le **lien dans l’email**.

### Étape A — « J’ai oublié mon mot de passe »

| | |
|--|--|
| **Route front conseillée** | `/forgot-password`, `/mot-de-passe-oublie` |
| **API** | `POST /api/auth/forgot-password` |
| **Corps JSON** | `{ "email" }` |
| **Succès HTTP** | **200** |
| **Réponse JSON** | **Toujours** le même message : `{ "message": "Si cet email existe, un lien de réinitialisation a été envoyé" }` — même si l’email n’existe pas (**ne pas** révéler « compte inconnu »). |
| **Erreurs** | Le contrôleur renvoie en principe 200 ; en cas d’exception interne rare, gérer comme erreur générique. |

**Organisation UI recommandée**

- Un seul champ email + bouton « Envoyer le lien ».
- Après 200 : message neutre du type « Si un compte existe, vous recevrez un email… » + lien « Retour à la connexion ».

### Étape B — « Nouveau mot de passe » (page ouverte depuis l’email)

Le backend construit le lien avec **`FRONTEND_URL`** (variable **serveur**) :

`{FRONTEND_URL}/reset-password?token={token_hex_64_caracteres_environ}`

| | |
|--|--|
| **Route front obligatoire** | **`/reset-password`** (chemin exact pour correspondre au mail) — ou configurer le backend pour un autre chemin (non prévu par défaut). |
| **Au chargement de la page** | Lire **`token`** dans les **query params** (`useSearchParams()` Next.js, `router.query` Vue, etc.). Si absent : message « Lien invalide » + lien vers forgot-password. |
| **API** | `POST /api/auth/reset-password` |
| **Corps JSON** | `token` (string, valeur du query param), `newPassword` (string, **≥ 6** caractères) |
| **Succès HTTP** | **200** — `{ "message": "Mot de passe réinitialisé avec succès" }` |
| **Erreurs** | **400** : token invalide, expiré (1 h côté serveur), ou déjà utilisé — afficher `message` et proposer de refaire une demande depuis `/forgot-password`. |

**Organisation UI recommandée**

- Formulaire : nouveau mot de passe + confirmation (validation front uniquement pour la confirmation).
- **Ne pas** afficher le token dans l’UI ; le repasser seulement dans le corps du `POST`.
- Après succès : rediriger vers **`/login`** avec message de succès.

**Important** : la valeur **`FRONTEND_URL`** sur le serveur API doit être l’**origine exacte** du front qui sert `/reset-password` (ex. `https://wifi.clubgei-polytech.org` sans slash final, ou une seule origine si plusieurs domaines — sinon le lien dans l’email pointe vers le mauvais site).

---

## 3. Récapitulatif des endpoints (copier-coller intégration)

| Action | Méthode | Chemin |
|--------|---------|--------|
| Inscription — envoi code | `POST` | `/api/auth/register/request` |
| Inscription — valider code | `POST` | `/api/auth/register/verify` |
| Inscription — renvoyer code | `POST` | `/api/auth/register/resend` |
| Mot de passe oublié — email | `POST` | `/api/auth/forgot-password` |
| Mot de passe oublié — nouveau MDP | `POST` | `/api/auth/reset-password` |
| Connexion | `POST` | `/api/auth/login` |

Toujours : **`Content-Type: application/json`**.

---

## 4. Schéma de navigation (suggestion)

```text
/login
  └─ lien → /register (étape A)
  └─ lien → /forgot-password (étape A MDP oublié)

/register              → POST register/request → /register/verify
/register/verify       → POST register/verify (succès → / avec JWT)

/forgot-password        → POST forgot-password → message neutre

/reset-password?token=… → POST reset-password → /login
```

---

## 5. Fichiers utiles dans ce dépôt

- `frontend-api-client.ts` — méthodes `auth.registerRequest`, `registerVerify`, `registerResend` (le login est `auth.login`).
- `frontend-types.ts` — `RegisterRequest`, `RegisterVerifyRequest`, `RegisterRequestResponse`, `LoginResponse`.
- Swagger : `/api` sur le serveur — tag **Auth**.

Pour le détail des codes HTTP et des règles métier globales : [README.md](./README.md) (section *Référence des routes* — Authentification).
