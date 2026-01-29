# 📨 Intégration Kafka

Ce document explique comment utiliser Kafka pour recevoir des données dans le backend.

## 🎯 Vue d'ensemble

Le backend consomme des messages depuis Kafka pour :
- **Paiements** : Création, complétion, échec, annulation de paiements
- **Comptes Wi-Fi** : Création, activation, expiration, suppression de comptes
- **Sessions** : Début, fin, mise à jour de sessions
- **Utilisateurs** : Création, mise à jour, suppression, activation/désactivation d'utilisateurs

## 📋 Topics Kafka

Le backend écoute les topics suivants :

| Topic | Description | Group ID |
|-------|-------------|----------|
| `payments` | Événements de paiement | `payment-consumer-group` |
| `wifi-accounts` | Événements de comptes Wi-Fi | `wifi-account-consumer-group` |
| `sessions` | Événements de sessions | `session-consumer-group` |
| `users` | Événements d'utilisateurs | `user-consumer-group` |

## ⚙️ Configuration

### Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Activer/désactiver Kafka
KAFKA_ENABLED=true

# Brokers Kafka (séparer plusieurs brokers par des virgules)
KAFKA_BROKERS=localhost:9092

# Client ID pour Kafka
KAFKA_CLIENT_ID=internet-access-backend

# Authentification Kafka (optionnel)
KAFKA_USERNAME=
KAFKA_PASSWORD=

# Autoriser la création automatique de topics
KAFKA_AUTO_TOPIC_CREATION=false
```

### Configuration Docker Compose

Pour ajouter Kafka à votre `docker-compose.yml` :

```yaml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

## 📨 Format des messages

Tous les messages Kafka doivent suivre ce format JSON :

```json
{
  "event": "nom.de.l.evenement",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    // Données spécifiques à l'événement
  }
}
```

## 💰 Topic: `payments`

### Événements supportés

#### `payment.created`
Crée un nouveau paiement.

```json
{
  "event": "payment.created",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "amount": 5000,
    "method": "mobile_money",
    "phoneNumber": "+243900000000",
    "userId": "uuid-de-l-utilisateur",
    "wifiAccountId": "uuid-du-compte-wifi",
    "notes": "Paiement via Mobile Money"
  }
}
```

#### `payment.completed`
Marque un paiement comme complété. Crée automatiquement un compte Wi-Fi si nécessaire.

```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-19T10:05:00Z",
  "data": {
    "id": "uuid-du-paiement",
    "transactionId": "TXN123456",
    "amount": 5000
  }
}
```

#### `payment.failed`
Marque un paiement comme échoué.

```json
{
  "event": "payment.failed",
  "timestamp": "2024-01-19T10:10:00Z",
  "data": {
    "id": "uuid-du-paiement",
    "transactionId": "TXN123456"
  }
}
```

#### `payment.cancelled`
Annule un paiement.

```json
{
  "event": "payment.cancelled",
  "timestamp": "2024-01-19T10:15:00Z",
  "data": {
    "id": "uuid-du-paiement"
  }
}
```

## 📶 Topic: `wifi-accounts`

### Événements supportés

#### `wifi-account.created`
Crée un nouveau compte Wi-Fi.

```json
{
  "event": "wifi-account.created",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "username": "etu1234",
    "duration": "7d",
    "bandwidthProfile": "2mbps",
    "maxDevices": 1,
    "userId": "uuid-de-l-utilisateur",
    "comment": "Compte créé via Kafka"
  }
}
```

#### `wifi-account.activated`
Active un compte Wi-Fi.

```json
{
  "event": "wifi-account.activated",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "id": "uuid-du-compte",
    "username": "etu1234"
  }
}
```

#### `wifi-account.expired`
Marque un compte comme expiré.

```json
{
  "event": "wifi-account.expired",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "id": "uuid-du-compte",
    "username": "etu1234"
  }
}
```

#### `wifi-account.deleted`
Supprime un compte Wi-Fi.

```json
{
  "event": "wifi-account.deleted",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "id": "uuid-du-compte",
    "username": "etu1234"
  }
}
```

## 🔌 Topic: `sessions`

### Événements supportés

#### `session.started`
Événement de début de session.

```json
{
  "event": "session.started",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "wifiAccountId": "uuid-du-compte",
    "username": "etu1234",
    "mikrotikSessionId": "session-id",
    "ipAddress": "192.168.10.100"
  }
}
```

#### `session.ended`
Événement de fin de session.

```json
{
  "event": "session.ended",
  "timestamp": "2024-01-19T10:30:00Z",
  "data": {
    "wifiAccountId": "uuid-du-compte",
    "username": "etu1234",
    "mikrotikSessionId": "session-id"
  }
}
```

#### `session.updated`
Mise à jour d'une session (bytes transférés).

```json
{
  "event": "session.updated",
  "timestamp": "2024-01-19T10:15:00Z",
  "data": {
    "wifiAccountId": "uuid-du-compte",
    "username": "etu1234",
    "mikrotikSessionId": "session-id",
    "bytesIn": 1048576,
    "bytesOut": 524288
  }
}
```

## 👤 Topic: `users`

### Événements supportés

#### `user.created`
Crée un nouvel utilisateur.

```json
{
  "event": "user.created",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "email": "user@example.com",
    "password": "motdepasse123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+243900000000",
    "role": "student",
    "isActive": true
  }
}
```

#### `user.updated`
Met à jour un utilisateur.

```json
{
  "event": "user.updated",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "id": "uuid-de-l-utilisateur",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "+243900000001"
  }
}
```

#### `user.deleted`
Supprime un utilisateur.

```json
{
  "event": "user.deleted",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "id": "uuid-de-l-utilisateur",
    "email": "user@example.com"
  }
}
```

#### `user.activated`
Active un utilisateur.

```json
{
  "event": "user.activated",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "id": "uuid-de-l-utilisateur",
    "email": "user@example.com"
  }
}
```

#### `user.deactivated`
Désactive un utilisateur.

```json
{
  "event": "user.deactivated",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "id": "uuid-de-l-utilisateur",
    "email": "user@example.com"
  }
}
```

## 🚀 Démarrage

### 1. Installer les dépendances

```bash
npm install kafkajs
```

### 2. Configurer Kafka

Ajoutez les variables d'environnement dans votre `.env` (voir section Configuration).

### 3. Démarrer Kafka

Si vous utilisez Docker Compose :

```bash
docker-compose up -d zookeeper kafka
```

### 4. Créer les topics (optionnel)

Si `KAFKA_AUTO_TOPIC_CREATION=false`, créez les topics manuellement :

```bash
docker exec -it kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic payments \
  --partitions 3 \
  --replication-factor 1

docker exec -it kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic wifi-accounts \
  --partitions 3 \
  --replication-factor 1

docker exec -it kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic sessions \
  --partitions 3 \
  --replication-factor 1

docker exec -it kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic users \
  --partitions 3 \
  --replication-factor 1
```

### 5. Démarrer le backend

```bash
npm run start:dev
```

Les consumers Kafka démarrent automatiquement et écoutent les topics.

## 🧪 Tester l'intégration

### Envoyer un message de test

```bash
# Exemple : Créer un paiement
docker exec -it kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic payments

# Collez ce JSON :
{
  "event": "payment.created",
  "timestamp": "2024-01-19T10:00:00Z",
  "data": {
    "amount": 5000,
    "method": "mobile_money",
    "phoneNumber": "+243900000000",
    "userId": "test-user-id"
  }
}
```

### Vérifier les logs

Les logs du backend affichent les messages reçus :

```
[PaymentConsumer] 📥 Received payment event: payment.created
[PaymentConsumer] ✅ Payment created from Kafka: uuid-du-paiement
```

## 🔍 Dépannage

### Les consumers ne démarrent pas

1. Vérifiez que `KAFKA_ENABLED=true`
2. Vérifiez que Kafka est accessible (`KAFKA_BROKERS`)
3. Vérifiez les logs du backend pour les erreurs de connexion

### Les messages ne sont pas traités

1. Vérifiez le format JSON des messages
2. Vérifiez que les topics existent
3. Vérifiez les logs du backend pour les erreurs de traitement

### Erreur de connexion Kafka

1. Vérifiez que Kafka est démarré
2. Vérifiez les variables `KAFKA_BROKERS`
3. Vérifiez l'authentification si configurée (`KAFKA_USERNAME`, `KAFKA_PASSWORD`)

## 📚 Ressources

- [Documentation KafkaJS](https://kafka.js.org/)
- [Documentation Kafka](https://kafka.apache.org/documentation/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/kafka)
