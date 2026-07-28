<?php

namespace App\Controller;

use App\Service\AiExplainer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Analyse IA à la demande d'un problème détecté (API externe Anthropic).
 * Entrée : { apiKey, skillName, snippet, provider?, model?, category?, severity?, filename?, line? }
 * Sortie : { analysis: string }
 */
class AnalyzeController extends AbstractController
{
    #[Route('/api/analyze', name: 'analyze', methods: ['POST'])]
    public function analyze(Request $request, AiExplainer $explainer): JsonResponse
    {
        $b = json_decode($request->getContent(), true) ?? [];

        $apiKey = $b['apiKey'] ?? null;
        $skillName = $b['skillName'] ?? null;
        $snippet = $b['snippet'] ?? null;

        if (!is_string($apiKey) || $apiKey === '') {
            return $this->json(['error' => "`apiKey` est requis pour l'analyse IA."], 400);
        }
        if (!is_string($skillName) || $skillName === '') {
            return $this->json(['error' => '`skillName` est requis.'], 400);
        }
        if (!is_string($snippet) || $snippet === '') {
            return $this->json(['error' => '`snippet` est requis.'], 400);
        }

        $str = static fn (string $key): string => is_string($b[$key] ?? null) ? $b[$key] : '';

        try {
            $analysis = $explainer->explain(
                [
                    'skillName' => $skillName,
                    'category' => $str('category'),
                    'severity' => $str('severity'),
                    'filename' => $str('filename'),
                    'line' => is_int($b['line'] ?? null) ? $b['line'] : 0,
                    'snippet' => $snippet,
                ],
                $str('provider') !== '' ? $str('provider') : 'anthropic',
                $str('model'),
                $apiKey,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            // Échec côté API IA (clé invalide, réseau…) → 502 lisible.
            return $this->json(['error' => 'Analyse IA échouée : ' . $e->getMessage()], 502);
        }

        return $this->json(['analysis' => $analysis]);
    }
}
