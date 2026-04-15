package com.unchk.p2p_node.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Classe de configuration Spring.
 * Elle permet de déclarer un objet RestTemplate
 * qui servira à envoyer des requêtes HTTP vers les autres nœuds.
 */
@Configuration
public class RestTemplateConfig {

    /**
     * Bean RestTemplate mis à disposition dans le conteneur Spring.
     *
     * Grâce à cette méthode, on pourra injecter RestTemplate
     * dans FileService.
     *
     * @return une instance de RestTemplate
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
