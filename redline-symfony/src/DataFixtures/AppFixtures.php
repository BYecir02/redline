<?php

namespace App\DataFixtures;

use App\Entity\Detection;
use App\Entity\DetectionEvent;
use App\Entity\Project;
use App\Entity\User;
use App\Enum\DetectionStatus;
use App\Enum\EventType;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Données de démonstration : un compte prêt à l'emploi (pour le jury / les tests)
 * avec un projet et quelques détections, pour peupler le dashboard.
 *
 * Charger avec : php bin/console doctrine:fixtures:load
 * Compte : demo@redline.dev / demo1234
 */
class AppFixtures extends Fixture
{
    public function __construct(private readonly UserPasswordHasherInterface $hasher)
    {
    }

    public function load(ObjectManager $manager): void
    {
        $user = new User();
        $user->setEmail('demo@redline.dev');
        $user->setPasswordHash($this->hasher->hashPassword($user, 'demo1234'));
        $manager->persist($user);

        $project = new Project();
        $project->setUser($user)
            ->setPath('/demo/mon-projet')
            ->setLabel('Projet de démonstration')
            ->setSkills(['sql-injection', 'hardcoded-secret', 'console-logs', 'todo-fixme']);
        $manager->persist($project);

        $samples = [
            ['src/db/queries.ts', 'sql-injection', 'security', 'critical', 12, 'const q = "SELECT * FROM users WHERE id = " + id', DetectionStatus::ACTIVE],
            ['src/config.ts', 'hardcoded-secret', 'security', 'critical', 3, 'const API_KEY = "sk-live-a8f2kJq9mXpL3nR7"', DetectionStatus::ACTIVE],
            ['src/app.ts', 'console-logs', 'quality', 'warning', 45, 'console.log("debug", user)', DetectionStatus::ACTIVE],
            ['src/utils.ts', 'todo-fixme', 'quality', 'info', 8, '// TODO: gerer le cas null', DetectionStatus::RESOLVED],
        ];

        foreach ($samples as [$file, $skill, $category, $severity, $line, $snippet, $status]) {
            $detection = (new Detection())
                ->setProject($project)
                ->setFile($file)
                ->setSkillId($skill)
                ->setCategory($category)
                ->setSeverity($severity)
                ->setLine($line)
                ->setSnippet($snippet)
                ->setSignature("$file::$skill::$snippet");

            if ($status === DetectionStatus::RESOLVED) {
                $detection->setStatus(DetectionStatus::RESOLVED)->setResolvedAt(new \DateTimeImmutable());
            }
            $manager->persist($detection);

            $manager->persist(
                (new DetectionEvent())
                    ->setProject($project)->setDetection($detection)
                    ->setType(EventType::APPEARED)->setSkillId($skill)->setSeverity($severity)
            );

            if ($status === DetectionStatus::RESOLVED) {
                $manager->persist(
                    (new DetectionEvent())
                        ->setProject($project)->setDetection($detection)
                        ->setType(EventType::RESOLVED)->setSkillId($skill)->setSeverity($severity)
                );
            }
        }

        $manager->flush();
    }
}
