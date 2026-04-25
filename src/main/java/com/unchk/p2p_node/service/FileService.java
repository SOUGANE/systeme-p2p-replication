package com.unchk.p2p_node.service;

import com.unchk.p2p_node.config.NodeConfig;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.slf4j.MDC;

@Service
public class FileService {

    @Autowired
    private NodeConfig config;

    @Autowired
    private RestTemplate restTemplate;


    /**
     * Logger principal du service.
     *
     * Permet de tracer les opérations du système distribué :
     * - sauvegardes
     * - réplications
     * - recherches distribuées
     * - erreurs réseau
     */
    private static final Logger log = LoggerFactory.getLogger(FileService.class);


    public void saveFile(String filename, byte[] data) {
        validateFilename(filename);

        log.info("[{}] Réception d'un nouveau fichier '{}' depuis le client",config.getId(), filename);
        //Étape 1 : dédiée pour la sauvegarde locale
        saveFileLocally(filename, data);

        // Étape 3 : réplication automatique vers les autres nœuds
        replicateFile(filename, data);

    }

    //Lecture du fichier
    public byte[] getFile(String filename) {
        validateFilename(filename);
             //Pour étatpe 1
       // return getLocalFile(filename);

                // Pour étatpe 4
        // 1. On vérifie d'abord si le fichier existe localement
        if (existsLocally(filename)) {
            log.info("[{}] Fichier '{}' trouvé localement",config.getId(), filename);
            return getLocalFile(filename);
        }

        log.warn("[{}] Fichier '{}' absent localement, lancement de la recherche distribuée",config.getId(), filename);

        // 2. Si le fichier est absent localement, on essaie de le chercher chez les peers
        byte[] peerData = searchInPeers(filename);

        // 3. Si un peer a renvoyé le fichier, on le retourne au client
        if (peerData != null) {
            return peerData;
        }

        // 4. Si ni le nœud local ni les peers n'ont le fichier, on renvoie une erreur
        log.error("[{}] Fichier '{}' introuvable localement et chez les peers",config.getId(), filename);
        throw new RuntimeException("Fichier introuvable localement et chez les peers : " + filename);

    }


    /**
     * Sauvegarde un fichier localement dans le dossier configuré.
     */
    private void saveFileLocally(String filename, byte[] data) {
        try {
            // Récupère le dossier de stockage du nœud depuis la configuration
            Path storageDir = Paths.get(config.getStorage());

            // Crée le dossier s'il n'existe pas
            Files.createDirectories(storageDir);

            // Construit le chemin complet du fichier à enregistrer
            Path filePath = storageDir.resolve(filename).normalize();

            // Écrit le contenu du fichier dans le chemin indiqué
            // Si le fichier existe déjà, il sera écrasé
            Files.write(filePath, data);
            log.info("[{}] Fichier '{}' sauvegardé localement dans '{}'",config.getId(), filename, filePath);

        } catch (IOException e) {
            log.error("[{}] Erreur lors de la sauvegarde locale du fichier '{}' : {}",config.getId(), filename, e.getMessage());
            throw new RuntimeException("Erreur lors de la sauvegarde du fichier : " + filename, e);
        }
    }

                                // ETAPE 3

    /**
     * Cette méthode servira lorsqu'un autre nœud envoie un fichier à copier.
     * Ici, on fait seulement la sauvegarde locale.
     */
    public void saveReplicatedFile(String filename, byte[] data, String sourceNode) {
        validateFilename(filename);
        saveFileLocally(filename, data);

        log.info("[{}] Réception d'un fichier répliqué '{}' depuis le peer '{}'",config.getId(), filename, sourceNode);
    }

    /**
     * Réplique le fichier vers tous les peers configurés.
     * Principe :
     * - pour chaque peer connu
     * - envoyer une requête HTTP POST
     * - vers l'endpoint interne /files/internal/replicate/{filename}
     *
     * on utilise la route interne de réplication,
     * pas la route publique /files/{filename},
     * afin d'éviter les boucles infinies.
     */
    private void replicateFile(String filename, byte[] data) {
        // S'il n'y a aucun peer configuré, on ne fait rien
        if (config.getPeers() == null || config.getPeers().isEmpty()) {
            return;
        }

        // On parcourt tous les peers connus du nœud
        for (String peer : config.getPeers()) {

            // Construction de l'URL interne du peer
            String url = peer + "/files/internal/replicate/" + filename;

            try {
                // Headers HTTP : on indique qu'on envoie un contenu binaire
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);

                // On envoie l'identité du node qui envoie le fichier
                headers.add("X-Source-Node", config.getId());

                // Corps de la requête HTTP = contenu du fichier + headers
                HttpEntity<byte[]> requestEntity = new HttpEntity<>(data, headers);

                // Envoi HTTP POST au peer
                restTemplate.postForEntity(url, requestEntity, String.class);

                //System.out.println("Réplication réussie vers : " + peer);
                log.info("[{}] Réplication réussie vers le peer {}",config.getId(), peer);

            } catch (Exception e) {
                // Si un peer est arrêté ou inaccessible,
                // on affiche l'erreur sans faire échouer tout le traitement
               // System.out.println("Échec de la réplication vers " + peer + " : " + e.getMessage());
                log.error("[{}] Échec de la réplication vers le peer {} : {}",config.getId(), peer, e.getMessage());
            }
        }
    }


                                        // ETATPE 4

    /**
     * Lit un fichier localement depuis le dossier de stockage du nœud.
     */
    public byte[] getLocalFile(String filename) {
        validateFilename(filename);

        try {
            // Construit le chemin complet du fichier à lire
            Path filePath = Paths.get(config.getStorage()).resolve(filename).normalize();

            // Vérifie si le fichier existe bien localement
            if (!Files.exists(filePath)) {
                throw new RuntimeException("Fichier introuvable localement : " + filename);
            }

            // Lit tout le contenu du fichier et le retourne
            return Files.readAllBytes(filePath);

        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la lecture du fichier : " + filename, e);
        }
    }



    /**
     * Recherche un fichier chez les peers configurés.
     *
     * Principe :
     * - on parcourt tous les peers connus
     * - on appelle leur route interne de lecture locale
     * - si un peer possède le fichier, on retourne son contenu
     * - sinon on continue avec le peer suivant
     *
     * on interroge /files/internal/local/{filename}
     * pour éviter toute boucle de recherche distribuée.
     */
    private byte[] searchInPeers(String filename) {
        // Si aucun peer n'est configuré, on ne peut rien chercher
        if (config.getPeers() == null || config.getPeers().isEmpty()) {
            return null;
        }

        // On parcourt tous les peers connus du nœud
        for (String peer : config.getPeers()) {

            // Construction de l'URL interne locale du peer
            String url = peer + "/files/internal/local/" + filename;

            try {
                // Envoi d'une requête GET au peer
                ResponseEntity<byte[]> response = restTemplate.getForEntity(url, byte[].class);

                // Si le peer répond correctement avec un body non vide,
                // on retourne immédiatement le contenu du fichier
                if (response.getBody() != null) {
                    //System.out.println("Fichier trouvé chez le peer : " + peer);
                    log.info(" [{}] Fichier '{}' trouvé chez le peer {}",config.getId(), filename, peer);
                    return response.getBody();
                }

            } catch (HttpClientErrorException.NotFound e) {
                // Le peer a répondu 404 : il ne possède pas ce fichier localement
               // System.out.println("Fichier absent chez le peer : " + peer);
                log.warn("[{}] Fichier '{}' absent chez le peer {}",config.getId(), filename, peer);

            } catch (Exception e) {
                // Le peer est peut-être indisponible ou inaccessible
                //System.out.println("Impossible d'interroger le peer " + peer + " : " + e.getMessage());
                log.error("[{}] Impossible d'interroger le peer {} : {}", config.getId(), peer, e.getMessage());
            }
        }

        // Aucun peer n'a le fichier
        return null;
    }


    // LES METHODES D'IMPLEMENTATION UTILISEE

    /**
     * Vérifie que le nom du fichier est correct.
     *
     * Ce contrôle simple permet d'éviter :
     * - les noms vides
     * - certaines tentatives de sortir du dossier de stockage (comme ../../secret.txt)
     */
    private void validateFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Le nom du fichier ne doit pas être vide.");
        }

        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new IllegalArgumentException("Nom de fichier invalide : " + filename);
        }
    }


    /**
     * Vérifie si un fichier existe dans le stockage local du nœud.
     */
    private boolean existsLocally(String filename) {
        Path filePath = Paths.get(config.getStorage()).resolve(filename).normalize();
        return Files.exists(filePath);
    }
}