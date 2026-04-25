package com.unchk.p2p_node.controller;

import com.unchk.p2p_node.config.NodeConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * NOUVEAU — Endpoint pour lister les fichiers locaux du nœud.
 * Permet au dashboard Angular de savoir quels fichiers sont stockés.
 *
 * Placez ce fichier dans :
 * src/main/java/com/unchk/p2p_node/controller/FileListController.java
 */
@RestController
@RequestMapping("/files")
public class FileListController {

    @Autowired
    private NodeConfig config;

    /**
     * GET /files/internal/list
     * Retourne la liste des fichiers stockés localement sur ce nœud.
     * Chaque fichier est retourné avec son nom et sa taille.
     */
    @GetMapping("/internal/list")
    public ResponseEntity<List<Map<String, Object>>> listLocalFiles() {
        List<Map<String, Object>> files = new ArrayList<>();

        try {
            Path storageDir = Paths.get(config.getStorage());

            // Si le dossier n'existe pas encore, retourner liste vide
            if (!Files.exists(storageDir)) {
                return ResponseEntity.ok(files);
            }

            // Lister tous les fichiers (non-dossiers) dans le répertoire de stockage
            try (Stream<Path> stream = Files.list(storageDir)) {
                stream
                    .filter(path -> !Files.isDirectory(path))
                    .forEach(path -> {
                        Map<String, Object> fileInfo = new HashMap<>();
                        fileInfo.put("name", path.getFileName().toString());
                        try {
                            BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
                            fileInfo.put("size", attrs.size());
                            fileInfo.put("lastModified", attrs.lastModifiedTime().toMillis());
                        } catch (IOException e) {
                            fileInfo.put("size", 0);
                        }
                        files.add(fileInfo);
                    });
            }

        } catch (IOException e) {
            // En cas d'erreur, retourner liste vide plutôt que 500
            return ResponseEntity.ok(files);
        }

        return ResponseEntity.ok(files);
    }
}
