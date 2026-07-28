<?php

namespace App\Tests\Service;

use App\Service\PromptBuilder;
use PHPUnit\Framework\TestCase;

/**
 * Test unitaire (pur, sans base) du générateur de prompt correctif.
 */
class PromptBuilderTest extends TestCase
{
    public function testPromptContainsIssuesFileAndStrictInstructions(): void
    {
        $builder = new PromptBuilder();

        $report = [
            'filename' => 'src/db/queries.ts',
            'issues' => [
                [
                    'line' => 12,
                    'severity' => 'critical',
                    'skillId' => 'sql-injection',
                    'message' => 'Injection SQL détectée',
                    'before' => 'const q = "SELECT * FROM users WHERE id = " + id',
                ],
            ],
        ];

        $prompt = $builder->buildCorrectionPrompt($report, 'const q = "..." + id;');

        // Le fichier, le skill et le message doivent apparaître.
        $this->assertStringContainsString('src/db/queries.ts', $prompt);
        $this->assertStringContainsString('sql-injection', $prompt);
        $this->assertStringContainsString('Injection SQL détectée', $prompt);
        // La consigne stricte de sortie doit être présente.
        $this->assertStringContainsString('UNIQUEMENT le code corrigé', $prompt);
    }

    public function testEmptyReportStillProducesInstructions(): void
    {
        $builder = new PromptBuilder();
        $prompt = $builder->buildCorrectionPrompt(['filename' => 'a.ts', 'issues' => []], 'const x = 1;');

        $this->assertStringContainsString('a.ts', $prompt);
        $this->assertStringContainsString('Consignes de sortie', $prompt);
    }
}
