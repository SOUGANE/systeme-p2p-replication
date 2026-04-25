package com.unchk.p2p_node.controller;

import com.unchk.p2p_node.config.NodeConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * FIX #2 — Endpoint de ping pour le dashboard Angular
 *
 * Le frontend appelait /actuator/health (Spring Actuator) qui n'existe pas.
 * Ce contrôleur fournit un endpoint simple GET /ping qui retourne
 * des infos sur le nœud au format JSON.
 *
 * Placez ce fichier dans : src/main/java/com/unchk/p2p_node/controller/PingController.java
 */
@RestController
@RequestMapping("/ping")
public class PingController {

    @Autowired
    private NodeConfig config;

    /**
     * GET /ping
     * Retourne le statut du nœud et ses infos de configuration.
     * Utilisé par le dashboard Angular pour vérifier si le nœud est en ligne.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> ping() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "online");
        response.put("storage", config.getStorage());

        // Inclure la liste des peers si disponible
        if (config.getPeers() != null) {
            response.put("peers", config.getPeers());
            response.put("peersCount", config.getPeers().size());
        }

        return ResponseEntity.ok(response);
    }
}
