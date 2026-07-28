<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\AnalyticsRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Historique des projets (sessions) de l'utilisateur, avec compteurs et activité.
 */
class ProjectController extends AbstractController
{
    #[Route('/api/projects', name: 'projects_list', methods: ['GET'])]
    public function list(AnalyticsRepository $analytics, #[CurrentUser] User $user): JsonResponse
    {
        return $this->json($analytics->projectSummaries($user->getId()));
    }
}
