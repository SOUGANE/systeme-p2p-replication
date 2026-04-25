package com.unchk.p2p_node.controller;


import com.unchk.p2p_node.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/files")
public class FileController {

    @Autowired
    private FileService fileService;

    /**
     * Endpoint d'upload d'un fichier.
     */
    @PostMapping("/{filename}")
    public ResponseEntity<String> upload(
            @PathVariable String filename,
            @RequestBody byte[] data) {

        fileService.saveFile(filename, data);
        return ResponseEntity.ok("Fichier enregistré localement avec succès.");
    }

    /**
     * Endpoint de téléchargement d'un fichier.
     */
    @GetMapping("/{filename}")
    public ResponseEntity<byte[]> download(@PathVariable String filename) {
        byte[] data = fileService.getFile(filename);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(data);
    }


    /**
     * Route interne préparée pour la réplication entre nœuds.
     * Cette route n'est pas destinée au client final.
     * Elle sert juste lorsqu'un autre nœud voudra nous envoyer
     * un fichier à copier localement.
     * donc elle ne fait qu'une sauvegarde locale.
     */
    @PostMapping("/internal/replicate/{filename}")
    public ResponseEntity<String> replicate(
            @PathVariable String filename,
            @RequestBody byte[] data,
            @RequestHeader(value = "X-Source-Node", required = false) String sourceNode) {

        fileService.saveReplicatedFile(filename, data, sourceNode);
        return ResponseEntity.ok("OK");
    }


    /**
     * Cette route est utilisée par les autres nœuds
     * lorsqu'ils veulent vérifier si ce nœud possède un fichier localement.
     */
    @GetMapping("/internal/local/{filename}")
    public ResponseEntity<byte[]> getLocalOnly(@PathVariable String filename) {
        byte[] data = fileService.getLocalFile(filename);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(data);
    }
}