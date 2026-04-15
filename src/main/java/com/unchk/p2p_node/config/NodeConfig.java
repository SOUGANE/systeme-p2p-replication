package com.unchk.p2p_node.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Classe de configuration du nœud.
 * cette classe lit les propriétés personnalisées définies dans application.yml.
 */
@Component
@ConfigurationProperties(prefix = "node")
@Data
public class NodeConfig {

    /**
     * Dossier local où les fichiers seront stockés (storage_node_5000)
     */
    private String storage;

    /**
     * Liste des autres nœuds
     */
    private List<String> peers;
}