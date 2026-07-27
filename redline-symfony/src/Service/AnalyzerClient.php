<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Client du MOTEUR D'ANALYSE (service Node) : Symfony orchestre, le moteur analyse.
 * C'est le seul point où le backend parle au moteur ; le reste de l'application
 * ignore complètement qu'il s'agit d'un service Node externe.
 */
class AnalyzerClient
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        #[Autowire(env: 'ENGINE_URL')] private readonly string $engineUrl,
    ) {
    }

    /**
     * Analyse un fichier via le moteur et renvoie le rapport (contrat ScanReport).
     *
     * @param list<string> $skills
     *
     * @return array{filename: string, issues: list<array<string, mixed>>, scannedAt: string}
     */
    public function analyze(string $code, string $filename, array $skills): array
    {
        $response = $this->httpClient->request('POST', rtrim($this->engineUrl, '/') . '/analyze', [
            'json' => [
                'code' => $code,
                'filename' => $filename,
                'skills' => $skills,
            ],
            'timeout' => 30,
        ]);

        return $response->toArray();
    }
}
