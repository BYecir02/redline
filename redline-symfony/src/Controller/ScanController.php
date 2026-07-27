<?php

namespace App\Controller;

use App\Service\AnalyzerClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

/**
 * Analyse de code : reçoit le code, le fait analyser par le moteur, renvoie le
 * rapport (contrat aligné sur le front). La persistance de l'historique sera
 * branchée dans une étape suivante.
 */
class ScanController extends AbstractController
{
    #[Route('/api/scan', name: 'scan', methods: ['POST'])]
    public function scan(Request $request, AnalyzerClient $analyzer): JsonResponse
    {
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

        return $this->json($report);
    }
}
