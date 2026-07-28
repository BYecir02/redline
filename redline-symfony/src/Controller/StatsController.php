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
 * Analytique : synthèse et tendances, scopées par utilisateur (option : un projet).
 */
class StatsController extends AbstractController
{
    #[Route('/api/stats/summary', name: 'stats_summary', methods: ['GET'])]
    public function summary(
        Request $request,
        AnalyticsRepository $analytics,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $projectPath = $request->query->get('projectPath') ?: null;

        return $this->json($analytics->summary($user->getId(), $projectPath));
    }

    #[Route('/api/stats/trends', name: 'stats_trends', methods: ['GET'])]
    public function trends(
        Request $request,
        AnalyticsRepository $analytics,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $bucket = (string) $request->query->get('bucket', 'hour');
        $limit = (int) $request->query->get('limit', 24);
        $projectPath = $request->query->get('projectPath') ?: null;

        return $this->json($analytics->trends($user->getId(), $bucket, $limit, $projectPath));
    }
}
