export interface P2PNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'checking';
  lastChecked?: Date;
  filesCount?: number;
  isActive: boolean;
}

export interface FileInfo {
  name: string;
  size?: number;
  nodePort: number;
  nodeName: string;
  uploadedAt?: Date;
  isLocal: boolean;
  isReplicated?: boolean;
}

export interface UploadRequest {
  filename: string;
  data: ArrayBuffer;
  targetNodeId?: string;
}

export interface ReplicationRequest {
  filename: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface NodeStats {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  totalFiles: number;
  replicatedFiles: number;
}
