package com.unchk.p2p_node.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * FIX #1 — Configuration CORS globale
 *
 * Sans ce fichier, le navigateur bloque TOUTES les requêtes Angular
 * car elles viennent d'une origine différente (localhost:4200 → localhost:5000).
 *
 * Placez ce fichier dans : src/main/java/com/unchk/p2p_node/config/WebConfig.java
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                // Autoriser le dashboard Angular (et tout autre port de dev)
                .allowedOriginPatterns("http://localhost:*")
                // Méthodes HTTP utilisées par le dashboard
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD")
                // Autoriser tous les headers (Content-Type, etc.)
                .allowedHeaders("*")
                // Autoriser l'envoi de cookies/credentials si besoin
                .allowCredentials(false)
                // Cache preflight pendant 1 heure (évite les requêtes OPTIONS répétées)
                .maxAge(3600);
    }
}
