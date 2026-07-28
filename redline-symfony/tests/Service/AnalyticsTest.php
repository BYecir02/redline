<?php

namespace App\Tests\Service;

use App\Entity\User;
use App\Service\AnalyticsRepository;
use App\Service\DetectionReconciler;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Test d'intégration des agrégations analytiques : après persistance de
 * détections, la synthèse renvoie les bons totaux et dimensions.
 */
class AnalyticsTest extends KernelTestCase
{
    public function testSummaryReflectsPersistedDetections(): void
    {
        self::bootKernel();
        $container = static::getContainer();
        $reconciler = $container->get(DetectionReconciler::class);
        $analytics = $container->get(AnalyticsRepository::class);
        $em = $container->get(EntityManagerInterface::class);

        $user = new User();
        $user->setEmail('analytics-' . uniqid() . '@test.dev')->setPasswordHash('x');
        $em->persist($user);
        $em->flush();

        $project = $reconciler->getOrCreateProject($user, '/demo/ana-' . uniqid());
        $reconciler->reconcileFileReport($project, [
            'filename' => 'a.ts',
            'issues' => [
                ['skillId' => 'sql-injection', 'category' => 'security', 'severity' => 'critical', 'line' => 1, 'message' => 'x', 'before' => 'q = "..." + id'],
                ['skillId' => 'console-logs', 'category' => 'quality', 'severity' => 'warning', 'line' => 2, 'message' => 'x', 'before' => 'console.log("a")'],
            ],
        ]);

        $summary = $analytics->summary($user->getId(), null);

        $this->assertSame(2, $summary['totals']['active']);
        $this->assertSame(0, $summary['totals']['resolved']);
        $this->assertGreaterThanOrEqual(2, $summary['totals']['events']);

        $severities = array_column($summary['bySeverity'], 'severity');
        $this->assertContains('critical', $severities);
        $this->assertContains('warning', $severities);
    }
}
