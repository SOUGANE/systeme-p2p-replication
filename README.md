# P2P Node Dashboard — Angular 19

Dashboard frontend Angular pour le système distribué Peer-to-Peer (P2P) de partage de fichiers.

## 🎨 Palette de couleurs
- `#F2A93B` — Ambre doré (accents, CTA)
- `#FAF0E6` — Crème/Linen (fond principal)
- `#F2C4B8` — Rose blush (badges info)
- `#5C9E8F` — Sauge/Teal vert (succès, nœuds en ligne)
- `#E05C5C` — Corail rouge (erreurs, nœuds hors ligne)

## 🚀 Installation et démarrage

### Prérequis
- Node.js >= 18
- npm >= 9
- Angular CLI 19 (`npm install -g @angular/cli@19`)

### Étapes

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer le serveur de développement
ng serve

# 3. Ouvrir le navigateur
# http://localhost:4200
```

## 🔧 Configuration des nœuds

Par défaut, le dashboard se connecte à trois nœuds :
- **Node A** : `localhost:5000`
- **Node B** : `localhost:5001`
- **Node C** : `localhost:5002`

Pour lancer vos nœuds Spring Boot :
```bash
# Terminal 1 - Node A
java -jar p2p-node.jar --server.port=5000

# Terminal 2 - Node B
java -jar p2p-node.jar --server.port=5001

# Terminal 3 - Node C
java -jar p2p-node.jar --server.port=5002
```

> **Note CORS** : Ajoutez `@CrossOrigin(origins = "http://localhost:4200")` sur votre `FileController` ou configurez Spring Security pour autoriser les requêtes depuis `localhost:4200`.

## 📡 API Backend utilisée (FileController.java)

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| `POST` | `/files/{filename}` | Upload d'un fichier |
| `GET` | `/files/{filename}` | Téléchargement d'un fichier |
| `POST` | `/files/internal/replicate/{filename}` | Réplication inter-nœuds |
| `GET` | `/files/internal/local/{filename}` | Vérification locale |

## 📁 Structure du projet

```
src/
├── app/
│   ├── app.component.ts         # Shell layout principal
│   ├── app.config.ts            # Configuration Angular
│   ├── app.routes.ts            # Routage lazy-loading
│   ├── core/
│   │   ├── models/
│   │   │   └── models.ts        # Interfaces TypeScript
│   │   └── services/
│   │       ├── node.service.ts  # Gestion des nœuds (signals)
│   │       ├── file.service.ts  # Opérations fichiers (API REST)
│   │       └── toast.service.ts # Notifications
│   ├── features/
│   │   ├── dashboard/           # Vue d'ensemble & statistiques
│   │   ├── nodes/               # Gestion des nœuds P2P
│   │   ├── files/               # Upload/Download/Réplication
│   │   └── network/             # Topologie & visualisation canvas
│   └── shared/
│       └── components/
│           ├── sidebar/         # Barre latérale navigation
│           └── toast-container/ # Toasts notifications
├── styles.scss                  # Design system global
└── index.html
```

## 🧩 Fonctionnalités

### Dashboard
- Statistiques réseau en temps réel (nœuds online/offline, fichiers)
- Barre de disponibilité animée
- Activité récente du réseau
- Cartes architecturales P2P

### Nœuds (`/nodes`)
- Ajout/suppression de nœuds dynamiques
- Ping individuel ou collectif
- Référence API backend intégrée
- Définir le nœud actif

### Fichiers (`/files`)
- Upload par drag & drop vers n'importe quel nœud
- Téléchargement depuis un nœud
- Réplication manuelle entre nœuds (via modal)
- Vérification locale (`/internal/local/`)
- Vue globale cross-nœuds
- Recherche dans les fichiers

### Réseau (`/network`)
- **Visualisation canvas animée** de la topologie P2P
- Particules de données animées entre nœuds
- Outil de réplication manuelle
- Statistiques réseau
- **Simulation de pannes** : mettre/remettre en ligne un nœud

## 🏗️ Technologies utilisées
- **Angular 19** avec Standalone Components
- **Signals** (`signal`, `computed`) pour la gestion d'état réactive
- **HttpClient** avec `fetch` API
- **Lazy loading** des routes
- **Canvas API** pour la visualisation réseau
- **SCSS** avec CSS Custom Properties

## 💡 Configuration CORS pour Spring Boot

```java
// FileController.java - Ajoutez cette annotation
@RestController
@RequestMapping("/files")
@CrossOrigin(origins = "http://localhost:4200")
public class FileController {
    // ...
}
```

Ou dans une configuration globale :
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:4200")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*");
    }
}
```
