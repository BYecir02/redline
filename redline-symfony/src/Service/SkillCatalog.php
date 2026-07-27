<?php

namespace App\Service;

/**
 * Catalogue des règles ("skills") exposé au front (GET /api/skills).
 *
 * Ce sont uniquement les MÉTADONNÉES (id, libellé, catégorie, sévérité, cibles).
 * L'exécution réelle des règles reste dans le moteur d'analyse Node : Symfony
 * orchestre, le moteur analyse. Catégories/sévérités en forme machine (le front
 * les traduit pour l'affichage).
 */
class SkillCatalog
{
    /**
     * @return list<array{
     *     id: string, name: string, description: string,
     *     category: string, severity: string, pattern: string,
     *     targets: string|list<string>
     * }>
     */
    public function all(): array
    {
        return [
            [
                'id' => 'sql-injection',
                'name' => 'SQL Injection',
                'description' => 'Requêtes SQL construites par concaténation',
                'category' => 'security',
                'severity' => 'critical',
                'pattern' => 'query = "SELECT * FROM users WHERE id = " + userId',
                'targets' => 'all',
            ],
            [
                'id' => 'hardcoded-secret',
                'name' => 'Secrets hardcodés',
                'description' => 'API keys, tokens, passwords en clair',
                'category' => 'security',
                'severity' => 'critical',
                'pattern' => 'API_KEY = "sk-proj-a8f2..."',
                'targets' => 'all',
            ],
            [
                'id' => 'xss-risk',
                'name' => 'XSS potentiel',
                'description' => 'Utilisation de innerHTML ou dangerouslySetInnerHTML',
                'category' => 'security',
                'severity' => 'warning',
                'pattern' => 'element.innerHTML = userInput',
                'targets' => ['javascript', 'typescript', 'react', 'nextjs', 'vue'],
            ],
            [
                'id' => 'cors-wildcard',
                'name' => 'CORS trop permissif',
                'description' => 'Access-Control-Allow-Origin: * en production',
                'category' => 'security',
                'severity' => 'warning',
                'pattern' => 'res.setHeader("Access-Control-Allow-Origin", "*")',
                'targets' => ['javascript', 'typescript', 'express', 'nestjs'],
            ],
            [
                'id' => 'console-logs',
                'name' => 'Console.log oubliés',
                'description' => 'Logs de debug laissés dans le code de prod',
                'category' => 'quality',
                'severity' => 'warning',
                'pattern' => 'console.log("debug user:", userData)',
                'targets' => ['javascript', 'typescript'],
            ],
            [
                'id' => 'todo-fixme',
                'name' => 'TODO / FIXME',
                'description' => 'Commentaires non résolus dans le code',
                'category' => 'quality',
                'severity' => 'info',
                'pattern' => '// TODO: handle edge case when user is null',
                'targets' => 'all',
            ],
            [
                'id' => 'unused-imports',
                'name' => 'Imports inutilisés',
                'description' => 'Modules importés mais jamais utilisés',
                'category' => 'quality',
                'severity' => 'info',
                'pattern' => "import { unused } from './utils'  // jamais utilisé",
                'targets' => ['javascript', 'typescript'],
            ],
            [
                'id' => 'missing-error-handling',
                'name' => 'Try/catch manquant',
                'description' => 'Appels async sans gestion d\'erreur',
                'category' => 'reliability',
                'severity' => 'warning',
                'pattern' => 'const data = await fetchUser(id) // no try/catch',
                'targets' => ['javascript', 'typescript'],
            ],
        ];
    }
}
