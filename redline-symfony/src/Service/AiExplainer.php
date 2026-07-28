<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Analyse IA à la demande d'un problème : le modèle explique pourquoi c'est
 * risqué et comment corriger. La clé API vient de l'utilisateur (jamais stockée
 * côté serveur, transmise à chaque requête). Réplique issueExplainer.ts.
 *
 * Enfichable par fournisseur : ajouter OpenAI/Mistral = une nouvelle branche.
 * Pour l'instant seul Anthropic est implémenté (appelé via HttpClient).
 */
class AiExplainer
{
    private const DEFAULT_MODEL = ['anthropic' => 'claude-opus-4-8'];
    private const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
    private const ANTHROPIC_VERSION = '2023-06-01';

    public function __construct(private readonly HttpClientInterface $httpClient)
    {
    }

    /**
     * @param array{skillName: string, category: string, severity: string, filename: string, line: int, snippet: string} $ctx
     */
    public function explain(array $ctx, string $provider, string $model, string $apiKey): string
    {
        if ($apiKey === '') {
            throw new \InvalidArgumentException("Clé API requise pour l'analyse.");
        }
        if ($provider !== 'anthropic') {
            throw new \InvalidArgumentException("Fournisseur IA non supporté : $provider");
        }

        $model = $model !== '' ? $model : self::DEFAULT_MODEL[$provider];

        $response = $this->httpClient->request('POST', self::ANTHROPIC_URL, [
            'headers' => [
                'x-api-key' => $apiKey,
                'anthropic-version' => self::ANTHROPIC_VERSION,
                'content-type' => 'application/json',
            ],
            'json' => [
                'model' => $model,
                'max_tokens' => 1024,
                'messages' => [['role' => 'user', 'content' => $this->buildPrompt($ctx)]],
            ],
            'timeout' => 60,
        ]);

        // getStatusCode() ne lève pas sur un code HTTP d'erreur (seulement réseau).
        $status = $response->getStatusCode();
        $body = $response->toArray(false); // false : ne pas lever sur non-2xx.

        if ($status !== 200) {
            $message = $body['error']['message'] ?? "L'API IA a répondu $status.";
            throw new \RuntimeException($message);
        }

        $text = '';
        foreach ($body['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $text .= $block['text'] ?? '';
            }
        }

        return trim($text);
    }

    /** @param array{skillName: string, category: string, severity: string, filename: string, line: int, snippet: string} $ctx */
    private function buildPrompt(array $ctx): string
    {
        return implode("\n", [
            "Tu es un expert en revue de code. Un outil d'analyse statique a détecté un problème.",
            'Explique en 2 à 4 phrases, en français :',
            "1. pourquoi c'est un risque ;",
            '2. comment le corriger (avec un court exemple de code corrigé si pertinent).',
            'Sois concis et concret. Utilise du markdown léger (gras pour l\'essentiel, `code` inline).',
            '',
            "Skill : {$ctx['skillName']} (catégorie {$ctx['category']}, sévérité {$ctx['severity']})",
            "Fichier : {$ctx['filename']}:{$ctx['line']}",
            'Code détecté :',
            '```',
            $ctx['snippet'],
            '```',
        ]);
    }
}
