# 📁 Scripts de Configuration

Ce dossier contient les scripts de configuration pour le déploiement terrain.

## 📄 Fichiers

### `mikrotik-setup.rsc`

Script complet de configuration MikroTik pour le déploiement initial.

**Utilisation :**

1. Ouvrir Winbox
2. Se connecter au MikroTik
3. Aller dans **File → Load Script**
4. Sélectionner `mikrotik-setup.rsc`
5. **⚠️ IMPORTANT :** Modifier les valeurs suivantes avant d'exécuter :
   - `IP_DU_VPS` : Remplacer par l'IP réelle de votre serveur backend
   - Mot de passe admin : Décommenter et modifier la ligne `/user set admin password=...`

**Après import :**

1. Vérifier la connexion WAN : `/ip dhcp-client print`
2. Tester Internet : `/ping 8.8.8.8`
3. Vérifier le Hotspot : `/ip hotspot active print`

---

### `mikrotik-login-redirect.html`

Page de redirection pour le portail Hotspot.

**Utilisation :**

1. Dans Winbox, aller dans **Files**
2. Créer/modifier le fichier `hotspot/login.html`
3. Copier le contenu de `mikrotik-login-redirect.html`
4. **⚠️ IMPORTANT :** Modifier l'URL du portail si nécessaire :
   - Par défaut : `https://wifi.clubgei.org/captive`
   - Adapter selon votre domaine

**Variables disponibles :**

- `$(mac)` : Adresse MAC de l'appareil
- `$(ip)` : Adresse IP de l'appareil
- `$(link-orig-esc)` : URL d'origine (échappée)

---

## 🔧 Commandes Utiles MikroTik

### Vérifier la configuration

```mikrotik
# État des interfaces
/interface print

# Connexion WAN
/ip dhcp-client print

# Adresses IP
/ip address print

# Serveur DHCP
/ip dhcp-server print

# Hotspot
/ip hotspot print

# Utilisateurs Hotspot
/ip hotspot user print

# Sessions actives
/ip hotspot active print
```

### Créer un utilisateur manuellement

```mikrotik
/ip hotspot user add name=USERNAME password=PASSWORD profile=1h
```

### Supprimer un utilisateur

```mikrotik
/ip hotspot user remove [find name=USERNAME]
```

### Déconnecter une session

```mikrotik
/ip hotspot active remove [find user=USERNAME]
```

### Sauvegarder la configuration

```mikrotik
/export file=backup_$(date)
```

### Restaurer la configuration

```mikrotik
/import file=backup_$(date)
```

---

## 🚨 Dépannage

### Le script ne s'exécute pas

* Vérifier que vous êtes connecté en admin
* Vérifier la syntaxe (pas d'erreurs dans Winbox)
* Exécuter section par section si nécessaire

### Pas d'Internet après configuration

* Vérifier NAT : `/ip firewall nat print`
* Vérifier route : `/ip route print`
* Vérifier DNS : `/ip dns print`

### Hotspot ne fonctionne pas

* Vérifier interface : `/ip hotspot interface print`
* Vérifier serveur : `/ip hotspot server profile print`
* Vérifier firewall : `/ip firewall filter print`

---

## 📚 Documentation Associée

* [Guide de déploiement terrain](../DEPLOIEMENT_TERRAIN.md)
* [Documentation API](../API.md)
* [Guide d'installation](../INSTALLATION.md)

---

**Dernière mise à jour :** 2024-01-19