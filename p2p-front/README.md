# P2P Réplication — Interface Angular 20

Interface graphique complète pour le projet **systeme-p2p-replication** (`com.unchk.p2p_node`).

---

## Architecture du projet Spring Boot

```
3 noeuds Spring Boot :
  Nœud A → port 5000  (storage_node_5000)  peers: B(:5001), C(:5002)
  Nœud B → port 5001  (storage_node_5001)  peers: A(:5000), C(:5002)
  Nœud C → port 5002  (storage_node_5002)  peers: A(:5000), B(:5001)
```

### Endpoints réels (FileController.java)

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/files/{filename}` | Upload + réplication auto vers les peers |
| `GET`  | `/files/{filename}` | Download (local d'abord, puis peers si absent) |
| `POST` | `/files/internal/replicate/{filename}` | Réplication interne entre nœuds |
| `GET`  | `/files/internal/local/{filename}` | Lecture locale uniquement (sans peer lookup) |

---

## Structure Angular 20

```
src/app/
├── core/
│   ├── models/index.ts           — Types : P2pNode, FileCheckResult, ActivityLog…
│   └── services/
│       ├── p2p-api.service.ts    — Appels HTTP vers les 4 vrais endpoints Spring Boot
│       ├── activity.service.ts   — Journal d'activité (Signal)
│       └── node-state.service.ts — État + santé des 3 nœuds (Signal + computed)
├── features/
│   ├── dashboard/                — Vue d'ensemble, architecture, journal
│   ├── upload/                   — POST /files/{filename} avec drag & drop
│   ├── download/                 — GET /files/{filename} avec téléchargement auto
│   ├── replication/              — Vérification sur les 3 nœuds + réplication manuelle
│   └── nodes/                   — État détaillé, config YAML, commandes de lancement
├── app.component.ts              — Shell avec sidebar + ping auto toutes les 15s
├── app.routes.ts                 — Routes lazy-loaded
└── app.config.ts                 — Providers Angular 20
```

---

## Installation et démarrage

### Prérequis
- **Node.js 18+**
- **Angular CLI 20** : `npm install -g @angular/cli@20`
- **Les 3 nœuds Spring Boot** démarrés (voir ci-dessous)

### 1. Démarrer les 3 nœuds Spring Boot

Ouvrir 3 terminaux dans le dossier `systeme-p2p-replication/` :

```bash
# Terminal 1 — Nœud A (port 5000)
./mvnw spring-boot:run -Dspring-boot.run.profiles=nodeA

# Terminal 2 — Nœud B (port 5001)
./mvnw spring-boot:run -Dspring-boot.run.profiles=nodeB

# Terminal 3 — Nœud C (port 5002)
./mvnw spring-boot:run -Dspring-boot.run.profiles=nodeC
```

### 2. Démarrer l'interface Angular

```bash
cd p2p-replication-ui/
npm install
npm start
# → http://localhost:4200
```

Le proxy redirige automatiquement :
- `/node-a/*` → `http://localhost:5000`
- `/node-b/*` → `http://localhost:5001`
- `/node-c/*` → `http://localhost:5002`

---

## Fonctionnalités par page

### Dashboard (`/dashboard`)
- Schéma de l'architecture des 3 nœuds avec statut en temps réel
- Tableau des 4 endpoints REST réels
- Métriques de session (uploads, downloads)
- Journal d'activité live

### Upload (`/upload`)
- Sélection du nœud destinataire (A, B ou C)
- Drag & drop de fichier
- Envoi binaire en `Content-Type: application/octet-stream`
- La réplication automatique est déclenchée côté Spring Boot (`FileService.replicateFile()`)

### Download (`/download`)
- Sélection du nœud source
- Saisie du nom de fichier
- Si absent localement, Spring Boot interroge automatiquement les peers (`FileService.searchInPeers()`)
- Téléchargement déclenché dans le navigateur

### Réplication (`/replication`)
- Saisie du nom de fichier
- Vérification simultanée sur les 3 nœuds via `GET /files/internal/local/{filename}`
- Résumé visuel : présent / absent sur chaque nœud
- Réplication manuelle vers un nœud manquant via `POST /files/internal/replicate/{filename}`

### Nœuds (`/nodes`)
- Statut en temps réel (ping health check toutes les 10s)
- Détail de configuration : port, dossier de stockage, peers configurés, latence
- Endpoints complets par nœud
- Résumé de la config YAML
- Commandes de démarrage Spring Boot

---

## Proxy de développement (`proxy.conf.json`)

```json
{
  "/node-a": { "target": "http://localhost:5000", "pathRewrite": {"^/node-a": ""} },
  "/node-b": { "target": "http://localhost:5001", "pathRewrite": {"^/node-b": ""} },
  "/node-c": { "target": "http://localhost:5002", "pathRewrite": {"^/node-c": ""} }
}
```

## Production (Nginx)

```nginx
location /node-a/ { proxy_pass http://localhost:5000/; }
location /node-b/ { proxy_pass http://localhost:5001/; }
location /node-c/ { proxy_pass http://localhost:5002/; }
location / { root /var/www/p2p-ui; try_files $uri /index.html; }
```
