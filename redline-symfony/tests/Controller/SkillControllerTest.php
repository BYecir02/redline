<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Test fonctionnel : le catalogue des skills est public et renvoie les 8 règles.
 */
class SkillControllerTest extends WebTestCase
{
    public function testSkillsCatalogIsPublicAndReturnsEightSkills(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/skills');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertIsArray($data);
        $this->assertCount(8, $data);
        $this->assertArrayHasKey('id', $data[0]);
        $this->assertArrayHasKey('category', $data[0]);
        $this->assertArrayHasKey('severity', $data[0]);
    }
}
