<?php

namespace App\Tests\Service;

use App\Service\AiExplainer;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

class AiExplainerTest extends TestCase
{
    public function testAnthropicContractSendsExpectedRequestAndReturnsText(): void
    {
        $captured = [];
        $client = new MockHttpClient(function (string $method, string $url, array $options) use (&$captured): MockResponse {
            $captured = compact('method', 'url', 'options');

            return $this->jsonResponse([
                'content' => [
                    ['type' => 'text', 'text' => '  Première partie. '],
                    ['type' => 'tool_use', 'name' => 'ignored'],
                    ['type' => 'text', 'text' => 'Deuxième partie.  '],
                ],
            ]);
        });

        $result = (new AiExplainer($client))->explain(
            $this->context(),
            'anthropic',
            'claude-sonnet-test',
            'test-key-never-sent',
        );

        self::assertSame('Première partie. Deuxième partie.', $result);
        self::assertSame('POST', $captured['method']);
        self::assertSame('https://api.anthropic.com/v1/messages', $captured['url']);

        $headers = implode("\n", $captured['options']['headers']);
        self::assertStringContainsString('x-api-key: test-key-never-sent', $headers);
        self::assertStringContainsString('anthropic-version: 2023-06-01', $headers);

        $payload = json_decode($captured['options']['body'], true, flags: JSON_THROW_ON_ERROR);
        self::assertSame('claude-sonnet-test', $payload['model']);
        self::assertSame(1024, $payload['max_tokens']);
        self::assertSame('user', $payload['messages'][0]['role']);
        self::assertStringContainsString('SQL Injection', $payload['messages'][0]['content']);
        self::assertStringContainsString('src/db.ts:12', $payload['messages'][0]['content']);
        self::assertStringContainsString('SELECT', $payload['messages'][0]['content']);
    }

    public function testUsesDefaultModelWhenModelIsEmpty(): void
    {
        $model = null;
        $client = new MockHttpClient(function (string $method, string $url, array $options) use (&$model): MockResponse {
            $payload = json_decode($options['body'], true, flags: JSON_THROW_ON_ERROR);
            $model = $payload['model'];

            return $this->jsonResponse(['content' => [['type' => 'text', 'text' => 'Analyse.']]]);
        });

        (new AiExplainer($client))->explain($this->context(), 'anthropic', '', 'test-key');

        self::assertSame('claude-opus-4-8', $model);
    }

    public function testRejectsMissingApiKeyWithoutNetworkCall(): void
    {
        $client = new MockHttpClient();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Clé API requise');

        try {
            (new AiExplainer($client))->explain($this->context(), 'anthropic', '', '');
        } finally {
            self::assertSame(0, $client->getRequestsCount());
        }
    }

    public function testRejectsUnsupportedProviderWithoutNetworkCall(): void
    {
        $client = new MockHttpClient();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Fournisseur IA non supporté : openai');

        try {
            (new AiExplainer($client))->explain($this->context(), 'openai', '', 'test-key');
        } finally {
            self::assertSame(0, $client->getRequestsCount());
        }
    }

    public function testExposesAnthropicErrorMessage(): void
    {
        $client = new MockHttpClient($this->jsonResponse(
            ['error' => ['message' => 'Clé de test refusée']],
            401,
        ));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Clé de test refusée');

        (new AiExplainer($client))->explain($this->context(), 'anthropic', '', 'invalid-test-key');
    }

    public function testRejectsSuccessfulResponseWithoutText(): void
    {
        $client = new MockHttpClient($this->jsonResponse([
            'content' => [['type' => 'tool_use', 'name' => 'ignored']],
        ]));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage("La réponse de l'API IA ne contient aucun texte.");

        (new AiExplainer($client))->explain($this->context(), 'anthropic', '', 'test-key');
    }

    /** @return array{skillName: string, category: string, severity: string, filename: string, line: int, snippet: string} */
    private function context(): array
    {
        return [
            'skillName' => 'SQL Injection',
            'category' => 'Sécurité',
            'severity' => 'critical',
            'filename' => 'src/db.ts',
            'line' => 12,
            'snippet' => 'db.query("SELECT " . $id)',
        ];
    }

    /** @param array<string, mixed> $body */
    private function jsonResponse(array $body, int $status = 200): MockResponse
    {
        return new MockResponse(json_encode($body, JSON_THROW_ON_ERROR), [
            'http_code' => $status,
            'response_headers' => ['content-type: application/json'],
        ]);
    }
}
