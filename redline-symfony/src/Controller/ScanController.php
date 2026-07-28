<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\AnalyzerClient;
use App\Service\DetectionReconciler;
use App\Service\PromptBuilder;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

/**
 * Analyse de code : fait analyser le code par le moteur, renvoie le rapport, et
 * (si un projet est fourni) persiste l'historique via la réconciliation.
 */
class ScanController extends AbstractController
{
    #[Route('/api/scan', name: 'scan', methods: ['POST'])]
    public function scan(
        Request $request,
        AnalyzerClient $analyzer,
        DetectionReconciler $reconciler,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $code = $data['code'] ?? null;
        $filename = $data['filename'] ?? null;
        $skills = $data['skills'] ?? [];
        $projectPath = $data['projectPath'] ?? null;

        if (!is_string($code) || !is_string($filename) || !is_array($skills)) {
            return $this->json(['error' => 'Champs requis : code (string), filename (string), skills (array).'], 400);
        }

        try {
            $report = $analyzer->analyze($code, $filename, array_values($skills));
        } catch (ExceptionInterface $e) {
            return $this->json([
                'error' => "Le moteur d'analyse est injoignable.",
                'detail' => $e->getMessage(),
            ], 502);
        }

        // Persistance de l'historique uniquement si un projet est ciblé.
        if (is_string($projectPath) && $projectPath !== '') {
            $project = $reconciler->getOrCreateProject($user, $projectPath);
            $reconciler->reconcileFileReport($project, $report);
        }

        return $this->json($report);
    }

    /**
     * Analyse le code puis, s'il y a des problèmes, produit un prompt correctif
     * structuré à renvoyer à l'IA. Sortie : { prompt: string|null, report }.
     */
    #[Route('/api/generate-fix-prompt', name: 'generate_fix_prompt', methods: ['POST'])]
    public function generateFixPrompt(
        Request $request,
        AnalyzerClient $analyzer,
        PromptBuilder $promptBuilder,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $code = $data['code'] ?? null;
        $filename = $data['filename'] ?? null;
        $skills = $data['skills'] ?? [];

        if (!is_string($code) || !is_string($filename) || !is_array($skills)) {
            return $this->json(['error' => 'Champs requis : code (string), filename (string), skills (array).'], 400);
        }

        try {
            $report = $analyzer->analyze($code, $filename, array_values($skills));
        } catch (ExceptionInterface $e) {
            return $this->json([
                'error' => "Le moteur d'analyse est injoignable.",
                'detail' => $e->getMessage(),
            ], 502);
        }

        $prompt = \count($report['issues']) === 0
            ? null
            : $promptBuilder->buildCorrectionPrompt($report, $code);

        return $this->json(['prompt' => $prompt, 'report' => $report]);
    }
}

