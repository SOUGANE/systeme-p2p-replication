// Adresses des 3 noeuds du système P2P de réplication
export const environment = {
  production: false,
  nodes: [
    { id: 'A', label: 'Nœud A', port: 5000, storage: 'storage_node_5000', proxyPrefix: '/node-a', color: '#6c8fff' },
    { id: 'B', label: 'Nœud B', port: 5001, storage: 'storage_node_5001', proxyPrefix: '/node-b', color: '#34d399' },
    { id: 'C', label: 'Nœud C', port: 5002, storage: 'storage_node_5002', proxyPrefix: '/node-c', color: '#fbbf24' }
  ]
};
