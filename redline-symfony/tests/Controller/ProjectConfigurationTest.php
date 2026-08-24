<?php

namespace App\Tests\Controller;

use App\Service\AnalyzerClient;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** Vérifie la persistance de la configuration utilisée pour reprendre un projet. */
class ProjectConfigurationTest extends WebTestCase
{
    /** @param array<string, mixed> $body */
    private function jsonRequest(
        KernelBrowser $client,
        string $method,
        string $uri,
        array $body = [],
        ?string $token = null,
    ): array {
        $server = ['CONTENT_TYPE' => 'application/json'];
        if ($token !== null) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
        }

        $client->request(
            $method,
            $uri,
            [],
            [],
            $server,
            $body === [] ? null : json_encode($body, JSON_THROW_ON_ERROR),
        );

        return json_decode($client->getResponse()->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }

    public function testScanPersistsSkillsAndExclusionsForProjectResume(): void
    {
        $client = static::createClient();
        $email = 'project-config-' . uniqid() . '@redline.test';
        $signup = $this->jsonRequest($client, 'POST', '/api/auth/signup', [
            'email' => $email,
            'password' => 'password123',
        ]);
        $this->assertResponseStatusCodeSame(201);

        $client->disableReboot();
        $analyzer = $this->createMock(AnalyzerClient::class);
        $analyzer->expects($this->exactly(2))
            ->method('analyze')
            ->willReturn([
                'filename' => 'src/app.ts',
                'issues' => [],
                'scannedAt' => '2026-08-24T10:00:00.000Z',
            ]);
        static::getContainer()->set(AnalyzerClient::class, $analyzer);

        $projectPath = 'projet-config-' . uniqid();
        $this->jsonRequest($client, 'POST', '/api/scan', [
            'code' => 'const value = 1;',
            'filename' => 'src/app.ts',
            'skills' => ['sql-injection', 'todo-fixme'],
            'projectPath' => $projectPath,
            'exclude' => ['vendor', 'dist'],
        ], $signup['token']);
        $this->assertResponseIsSuccessful();

        // Une nouvelle sélection remplace les skills, mais l'absence de `exclude`
        // conserve les exclusions précédemment choisies.
        $this->jsonRequest($client, 'POST', '/api/scan', [
            'code' => 'const value = 2;',
            'filename' => 'src/app.ts',
            'skills' => ['console-logs'],
            'projectPath' => $projectPath,
        ], $signup['token']);
        $this->assertResponseIsSuccessful();

        $projects = $this->jsonRequest($client, 'GET', '/api/projects', token: $signup['token']);
        $project = array_values(array_filter(
            $projects,
            static fn (array $item): bool => $item['path'] === $projectPath,
        ))[0] ?? null;

        $this->assertNotNull($project);
        $this->assertSame(['console-logs'], $project['skills']);
        $this->assertSame(['vendor', 'dist'], $project['excluded']);
    }

    public function testScanRejectsMalformedExclusions(): void
    {
        $client = static::createClient();
        $email = 'project-config-invalid-' . uniqid() . '@redline.test';
        $signup = $this->jsonRequest($client, 'POST', '/api/auth/signup', [
            'email' => $email,
            'password' => 'password123',
        ]);

        $this->jsonRequest($client, 'POST', '/api/scan', [
            'code' => 'const value = 1;',
            'filename' => 'src/app.ts',
            'skills' => ['console-logs'],
            'projectPath' => 'invalid-config-' . uniqid(),
            'exclude' => ['src', 42],
        ], $signup['token']);

        $this->assertResponseStatusCodeSame(400);
    }
}
