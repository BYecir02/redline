<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Tests fonctionnels de l'authentification : inscription, connexion, /me, et
 * contrôle d'accès (jeton requis).
 */
class AuthControllerTest extends WebTestCase
{
    private function jsonRequest($client, string $method, string $uri, array $body = [], array $headers = []): array
    {
        $server = array_merge(['CONTENT_TYPE' => 'application/json'], $headers);
        $client->request($method, $uri, [], [], $server, $body === [] ? null : json_encode($body));

        return json_decode($client->getResponse()->getContent(), true) ?? [];
    }

    public function testSignupThenLoginThenMe(): void
    {
        $client = static::createClient();
        $email = 'test-' . uniqid() . '@redline.test';

        // Inscription → 201 + token + user
        $signup = $this->jsonRequest($client, 'POST', '/api/auth/signup', ['email' => $email, 'password' => 'password123']);
        $this->assertResponseStatusCodeSame(201);
        $this->assertArrayHasKey('token', $signup);
        $this->assertSame($email, $signup['user']['email']);

        // Connexion → 200 + token
        $login = $this->jsonRequest($client, 'POST', '/api/auth/login', ['email' => $email, 'password' => 'password123']);
        $this->assertResponseIsSuccessful();
        $this->assertNotEmpty($login['token']);

        // /me avec le jeton → 200 + le bon utilisateur
        $me = $this->jsonRequest($client, 'GET', '/api/auth/me', [], ['HTTP_AUTHORIZATION' => 'Bearer ' . $login['token']]);
        $this->assertResponseIsSuccessful();
        $this->assertSame($email, $me['user']['email']);
    }

    public function testLoginWithWrongPasswordIsRejected(): void
    {
        $client = static::createClient();
        $this->jsonRequest($client, 'POST', '/api/auth/login', ['email' => 'inconnu@redline.test', 'password' => 'mauvais']);
        $this->assertResponseStatusCodeSame(401);
    }

    public function testMeWithoutTokenIsUnauthorized(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/auth/me');
        $this->assertResponseStatusCodeSame(401);
    }
}
