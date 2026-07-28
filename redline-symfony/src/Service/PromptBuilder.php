<?php

namespace App\Service;

/**
 * Construit le prompt correctif structuré envoyé à l'IA à partir d'un rapport
 * d'analyse et du code source. Se termine par une consigne stricte (ne renvoyer
 * que le code corrigé) pour que la sortie soit ré-analysable. Réplique
 * promptBuilder.ts.
 */
class PromptBuilder
{
    /**
     * @param array{filename: string, issues: list<array<string, mixed>>} $report
     */
    public function buildCorrectionPrompt(array $report, string $sourceCode): string
    {
        $blocks = [];
        foreach ($report['issues'] as $index => $issue) {
            $blocks[] = implode("\n", [
                'Problème ' . ($index + 1) . " (ligne {$issue['line']}, sévérité {$issue['severity']}, skill {$issue['skillId']}) :",
                "  {$issue['message']}",
                '  Code fautif : ' . trim((string) $issue['before']),
            ]);
        }

        return implode("\n", [
            "Tu es un outil de correction de code. On te donne un fichier et la liste des problèmes détectés par une analyse statique. Corrige chaque problème.",
            '',
            "Fichier : {$report['filename']}",
            '',
            'Problèmes à corriger :',
            implode("\n\n", $blocks),
            '',
            'Code source complet :',
            '```',
            $sourceCode,
            '```',
            '',
            'Consignes de sortie :',
            '- Renvoie UNIQUEMENT le code corrigé, sans aucune explication ni commentaire d\'accompagnement.',
            '- Garde le reste du fichier strictement inchangé ; ne modifie que ce qui est nécessaire pour résoudre les problèmes listés.',
            "- Conserve le style, l'indentation et les imports existants.",
        ]);
    }
}
