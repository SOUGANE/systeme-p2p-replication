// Représentation d'un noeud P2P du système de réplication
export interface P2pNode {
  id: string;           // 'A', 'B', 'C'
  label: string;        // 'Nœud A'
  port: number;         // 5000, 5001, 5002
  storage: string;      // 'storage_node_5000'
  proxyPrefix: string;  // '/node-a'
  color: string;
}

// Résultat d'une opération sur un fichier
export interface FileOperationResult {
  success: boolean;
  message: string;
  filename?: string;
  nodeId?: string;
  timestamp: Date;
}

// Entrée de journal d'activité
export interface ActivityLog {
  id: string;
  type: 'UPLOAD' | 'DOWNLOAD' | 'REPLICATE' | 'SEARCH' | 'ERROR' | 'INFO';
  filename?: string;
  nodeId?: string;
  nodeLabel?: string;
  message: string;
  timestamp: Date;
  success: boolean;
}

// Statut de santé d'un noeud (testé par l'UI)
export interface NodeHealth {
  nodeId: string;
  online: boolean;
  lastChecked: Date;
  responseTimeMs?: number;
}

// Résultat de vérification d'un fichier sur un noeud
export interface FileCheckResult {
  nodeId: string;
  nodeLabel: string;
  hasFile: boolean;
  checkedAt: Date;
}
