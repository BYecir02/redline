<?php

namespace App\Tests\Service;

use App\Entity\Detection;
use App\Entity\User;
use App\Enum\DetectionStatus;
use App\Service\DetectionReconciler;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Test d'intégration du cœur métier : le cycle de vie d'une détection au fil des
 * re-scans (apparition -> résolution -> réouverture), avec vraie base de test.
 */
class ReconciliationTest extends KernelTestCase
{
    private DetectionReconciler $reconciler;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = static::getContainer();
        $this->reconciler = $container->get(DetectionReconciler::class);
        $this->em = $container->get(EntityManagerInterface::class);
    }

    public function testLifecycleAppearResolveReopen(): void
    {
        $user = new User();
        $user->setEmail('reconcile-' . uniqid() . '@test.dev')->setPasswordHash('x');
        $this->em->persist($user);
        $this->em->flush();

        $project = $this->reconciler->getOrCreateProject($user, '/demo/rec-' . uniqid());
        $repo = $this->em->getRepository(Detection::class);

        $console = ['skillId' => 'console-logs', 'category' => 'quality', 'severity' => 'warning', 'line' => 1, 'message' => 'log', 'before' => 'console.log("a")'];
        $todo = ['skillId' => 'todo-fixme', 'category' => 'quality', 'severity' => 'info', 'line' => 2, 'message' => 'todo', 'before' => '// TODO: b'];
        $file = static fn (array $issues): array => ['filename' => 'src/app.ts', 'issues' => $issues];

        // 1) Apparition des 2 problèmes → 2 détections ACTIVE.
        $this->reconciler->reconcileFileReport($project, $file([$console, $todo]));
        $this->assertCount(2, $repo->findBy(['project' => $project, 'status' => DetectionStatus::ACTIVE]));

        // 2) Le TODO disparaît → 1 ACTIVE, 1 RESOLVED.
        $this->reconciler->reconcileFileReport($project, $file([$console]));
        $this->assertCount(1, $repo->findBy(['project' => $project, 'status' => DetectionStatus::ACTIVE]));
        $this->assertCount(1, $repo->findBy(['project' => $project, 'status' => DetectionStatus::RESOLVED]));

        // 3) Le TODO réapparaît → réouverture (redevient ACTIVE, reopenCount = 1).
        $this->reconciler->reconcileFileReport($project, $file([$console, $todo]));
        $reopened = $repo->findOneBy(['project' => $project, 'skillId' => 'todo-fixme']);
        $this->assertSame(DetectionStatus::ACTIVE, $reopened->getStatus());
        $this->assertSame(1, $reopened->getReopenCount());
    }
}
