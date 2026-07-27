<?php

namespace App\Controller;

use App\Service\SkillCatalog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Catalogue public des règles disponibles, consommé par le wizard de configuration.
 */
class SkillController extends AbstractController
{
    #[Route('/api/skills', name: 'skills_list', methods: ['GET'])]
    public function list(SkillCatalog $catalog): JsonResponse
    {
        return $this->json($catalog->all());
    }
}
