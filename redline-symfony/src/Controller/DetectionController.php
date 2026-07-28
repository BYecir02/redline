<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\AnalyticsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Gestion des détections ignorées (faux positifs assumés), par utilisateur.
 */
class DetectionController extends AbstractController
{
    #[Route('/api/detections/ignored', name: 'detections_ignored', methods: ['GET'])]
    public function ignored(AnalyticsRepository $analytics, #[CurrentUser] User $user): JsonResponse
    {
        return $this->json($analytics->listIgnored($user->getId()));
    }

    #[Route('/api/detections/ignore', name: 'detections_ignore', methods: ['POST'])]
    public function ignore(
        Request $request,
        AnalyticsRepository $analytics,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $projectPath = $data['projectPath'] ?? null;
        $signature = $data['signature'] ?? null;

        if (!is_string($projectPath) || !is_string($signature)) {
            return $this->json(['error' => 'projectPath et signature requis.'], 400);
        }

        $matched = $analytics->setIgnored($user->getId(), $projectPath, $signature, true);

        return $this->json(['matched' => $matched]);
    }

    #[Route('/api/detections/restore-all', name: 'detections_restore_all', methods: ['POST'])]
    public function restoreAll(AnalyticsRepository $analytics, #[CurrentUser] User $user): JsonResponse
    {
        $analytics->restoreAll($user->getId());

        return $this->json(['status' => 'ok']);
    }
}
