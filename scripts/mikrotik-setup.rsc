# Script de configuration MikroTik pour Club Internet Access
# À importer dans Winbox : File → Load Script
# ⚠️ ADAPTEZ LES VALEURS SELON VOTRE ENVIRONNEMENT

# ============================================
# PHASE 1 : RENOMMAGE DES INTERFACES
# ============================================
/interface ethernet set [find default-name=ether1] name=WAN
/interface ethernet set [find default-name=ether2] name=LAN

# ============================================
# PHASE 2 : CONFIGURATION WAN (Internet)
# ============================================
/ip dhcp-client add interface=WAN disabled=no

# ============================================
# PHASE 3 : CONFIGURATION LAN
# ============================================
/ip address add address=192.168.10.1/24 interface=LAN

# Pool DHCP
/ip pool add name=lan-pool ranges=192.168.10.50-192.168.10.250

# Serveur DHCP
/ip dhcp-server add name=lan-dhcp interface=LAN address-pool=lan-pool disabled=no

# Réseau DHCP
/ip dhcp-server network add address=192.168.10.0/24 gateway=192.168.10.1 dns-server=8.8.8.8,1.1.1.1

# ============================================
# PHASE 4 : NAT (Masquerade)
# ============================================
/ip firewall nat add chain=srcnat out-interface=WAN action=masquerade

# ============================================
# PHASE 5 : CONFIGURATION HOTSPOT
# ============================================
# Interface Hotspot
/ip hotspot interface add name=hotspot1 interface=LAN

# Serveur Hotspot
/ip hotspot server profile set default hotspot-address=192.168.10.1 dns-name=wifi.faculte.local html-directory=hotspot login-by=http-chap

# Pool Hotspot
/ip pool add name=hotspot-pool ranges=192.168.10.2-192.168.10.49

# ============================================
# PHASE 6 : PROFILS UTILISATEURS HOTSPOT
# ============================================
# ⚠️ IMPORTANT : Le backend utilise ces noms de profils (bande passante)
# Profil 1 Mbps
/ip hotspot user profile add name=1mbps rate-limit=1M/1M keepalive-timeout=2m

# Profil 2 Mbps
/ip hotspot user profile add name=2mbps rate-limit=2M/2M keepalive-timeout=2m

# Profil 5 Mbps
/ip hotspot user profile add name=5mbps rate-limit=5M/5M keepalive-timeout=2m

# Note : Les durées sont gérées via limit-uptime dans le backend, pas via les profils

# ============================================
# PHASE 7 : WALLED GARDEN (Portail externe)
# ============================================
# DNS (obligatoire)
/ip hotspot walled-garden add dst-port=53 protocol=udp action=allow
/ip hotspot walled-garden add dst-port=53 protocol=tcp action=allow

# ⚠️ REMPLACEZ IP_DU_VPS par l'IP réelle de votre serveur backend
# Exemple : /ip hotspot walled-garden add dst-address=45.67.89.123 protocol=tcp dst-port=443 action=allow
/ip hotspot walled-garden add dst-address=IP_DU_VPS protocol=tcp dst-port=443 action=allow
/ip hotspot walled-garden add dst-address=IP_DU_VPS protocol=tcp dst-port=80 action=allow

# ============================================
# PHASE 8 : SÉCURITÉ
# ============================================
# API limitée au LAN
/ip service set api disabled=no port=8728 address=192.168.10.0/24

# ⚠️ CHANGEZ LE MOT DE PASSE ADMIN
# /user set admin password=VOTRE_MOT_DE_PASSE_SECURISE

# Firewall basique
/ip firewall filter add chain=input action=drop connection-state=invalid
/ip firewall filter add chain=input action=accept connection-state=established,related
/ip firewall filter add chain=input action=accept src-address=192.168.10.0/24
/ip firewall filter add chain=input action=drop

# ============================================
# PHASE 9 : UTILISATEUR DE TEST
# ============================================
/ip hotspot user add name=test password=123 profile=1h

# ============================================
# PHASE 10 : SAUVEGARDE
# ============================================
/export file=backup_gei_initial

# ============================================
# FIN DU SCRIPT
# ============================================
# Vérifications à faire après import :
# 1. /ip dhcp-client print (doit être bound)
# 2. /ping 8.8.8.8 (doit répondre)
# 3. /ip hotspot active print (tester connexion)
# 4. Modifier login.html pour redirection portail externe
