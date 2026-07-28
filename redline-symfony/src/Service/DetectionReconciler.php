<?php

namespace App\Service;

use App\Entity\Detection;
use App\Entity\DetectionEvent;
use App\Entity\Project;
use App\Entity\User;
use App\Enum\DetectionStatus;
use App\Enum\EventType;
use App\Repository\DetectionRepository;
use App\Repository\ProjectRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Réconciliation du cycle de vie des détections (persistance de l'historique).
 *
 * À chaque re-scan d'un fichier, compare les problèmes présents (par SIGNATURE
 * de contenu) à ceux déjà connus en base pour ce fichier, et en déduit :
 *  - signature nouvelle            → CREATE  (détection ACTIVE + événement APPEARED)
 *  - connue mais RESOLVED          → REOPEN  (le problème est revenu + REOPENED)
 *  - connue et déjà ACTIVE         → TOUCH   (rafraîchit lastSeenAt, sans événement)
 *  - ACTIVE en base mais absente   → RESOLVE (le problème a disparu + RESOLVED)
 *
 * Le flush unique final est atomique (transaction gérée par Doctrine).
 */
class DetectionReconciler
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ProjectRepository $projects,
        private readonly DetectionRepository $detections,
    ) {
    }

    /** Signature stable propre au projet : `fichier::skill::extrait`. */
    public function signature(string $file, string $skillId, string $before): string
    {
        return $file . '::' . $skillId . '::' . trim($before);
    }

    /** Retrouve (ou crée) le projet d'un utilisateur pour un chemin donné. */
    public function getOrCreateProject(User $user, string $path, ?string $label = null): Project
    {
        $project = $this->projects->findOneBy(['user' => $user, 'path' => $path]);
        if ($project === null) {
            $project = new Project();
            $project->setUser($user);
            $project->setPath($path);
            $project->setLabel($label);
            $this->em->persist($project);
            $this->em->flush();
        }

        return $project;
    }

    /**
     * Réconcilie en base les détections d'UN fichier avec son nouveau rapport.
     *
     * @param array{filename: string, issues: list<array<string, mixed>>} $report
     */
    public function reconcileFileReport(Project $project, array $report): void
    {
        $file = $report['filename'];

        // Signature -> données du problème (dédoublonné sur la signature).
        $incoming = [];
        foreach ($report['issues'] as $issue) {
            $sig = $this->signature($file, $issue['skillId'], $issue['before']);
            $incoming[$sig] ??= [
                'skillId' => $issue['skillId'],
                'category' => $issue['category'],
                'severity' => $issue['severity'],
                'line' => $issue['line'],
                'snippet' => $issue['before'],
            ];
        }

        // Détections déjà connues pour ce projet + fichier.
        $existing = $this->detections->findBy(['project' => $project, 'file' => $file]);
        $bySignature = [];
        foreach ($existing as $d) {
            $bySignature[$d->getSignature()] = $d;
        }

        $now = new \DateTimeImmutable();

        // Problèmes présents dans le rapport → create / reopen / touch.
        foreach ($incoming as $sig => $data) {
            $known = $bySignature[$sig] ?? null;

            if ($known === null) {
                $detection = (new Detection())
                    ->setProject($project)
                    ->setFile($file)
                    ->setSignature($sig)
                    ->setSkillId($data['skillId'])
                    ->setCategory($data['category'])
                    ->setSeverity($data['severity'])
                    ->setLine($data['line'])
                    ->setSnippet($data['snippet']);
                $this->em->persist($detection);
                $this->addEvent($project, $detection, EventType::APPEARED, $data['skillId'], $data['severity']);
            } elseif ($known->getStatus() === DetectionStatus::RESOLVED) {
                $known->setStatus(DetectionStatus::ACTIVE)
                    ->setResolvedAt(null)
                    ->setLastSeenAt($now)
                    ->setReopenCount($known->getReopenCount() + 1);
                $this->addEvent($project, $known, EventType::REOPENED, $known->getSkillId(), $known->getSeverity());
            } else {
                $known->setLastSeenAt($now);
            }
        }

        // Détections ACTIVE en base mais absentes du rapport → resolve.
        foreach ($existing as $d) {
            if ($d->getStatus() === DetectionStatus::ACTIVE && !isset($incoming[$d->getSignature()])) {
                $d->setStatus(DetectionStatus::RESOLVED)->setResolvedAt($now);
                $this->addEvent($project, $d, EventType::RESOLVED, $d->getSkillId(), $d->getSeverity());
            }
        }

        $this->em->flush();
    }

    private function addEvent(
        Project $project,
        Detection $detection,
        EventType $type,
        string $skillId,
        string $severity,
    ): void {
        $event = (new DetectionEvent())
            ->setProject($project)
            ->setDetection($detection)
            ->setType($type)
            ->setSkillId($skillId)
            ->setSeverity($severity);
        $this->em->persist($event);
    }
}
