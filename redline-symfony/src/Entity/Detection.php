<?php

namespace App\Entity;

use App\Enum\DetectionStatus;
use App\Repository\DetectionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * L'IDENTITÉ d'un problème détecté, par signature de contenu, avec son cycle de vie.
 * Mise à jour au fil des scans plutôt que recréée.
 */
#[ORM\Entity(repositoryClass: DetectionRepository::class)]
#[ORM\Table(name: 'detection')]
#[ORM\UniqueConstraint(name: 'uniq_detection_projet_signature', columns: ['project_id', 'signature'])]
#[ORM\Index(name: 'idx_detection_projet_statut', columns: ['project_id', 'status'])]
#[ORM\Index(name: 'idx_detection_skill', columns: ['skill_id'])]
class Detection
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'detections')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Project $project = null;

    #[ORM\Column(length: 500)]
    private string $file;

    #[ORM\Column(length: 100)]
    private string $skillId;

    #[ORM\Column(length: 20)]
    private string $category;

    #[ORM\Column(length: 20)]
    private string $severity;

    #[ORM\Column]
    private int $line;

    #[ORM\Column(type: Types::TEXT)]
    private string $snippet;

    /** Signature stable propre au projet : `fichier::skill::extrait`. */
    #[ORM\Column(type: Types::TEXT)]
    private string $signature;

    #[ORM\Column(enumType: DetectionStatus::class)]
    private DetectionStatus $status = DetectionStatus::ACTIVE;

    /** Faux positif assumé par l'utilisateur : masqué de l'UI et des stats courantes. */
    #[ORM\Column]
    private bool $ignored = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $firstSeenAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $lastSeenAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    #[ORM\Column]
    private int $reopenCount = 0;

    /** @var Collection<int, DetectionEvent> */
    #[ORM\OneToMany(mappedBy: 'detection', targetEntity: DetectionEvent::class)]
    private Collection $events;

    public function __construct()
    {
        $this->firstSeenAt = new \DateTimeImmutable();
        $this->lastSeenAt = new \DateTimeImmutable();
        $this->events = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getProject(): ?Project
    {
        return $this->project;
    }

    public function setProject(?Project $project): static
    {
        $this->project = $project;

        return $this;
    }

    public function getFile(): string
    {
        return $this->file;
    }

    public function setFile(string $file): static
    {
        $this->file = $file;

        return $this;
    }

    public function getSkillId(): string
    {
        return $this->skillId;
    }

    public function setSkillId(string $skillId): static
    {
        $this->skillId = $skillId;

        return $this;
    }

    public function getCategory(): string
    {
        return $this->category;
    }

    public function setCategory(string $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getSeverity(): string
    {
        return $this->severity;
    }

    public function setSeverity(string $severity): static
    {
        $this->severity = $severity;

        return $this;
    }

    public function getLine(): int
    {
        return $this->line;
    }

    public function setLine(int $line): static
    {
        $this->line = $line;

        return $this;
    }

    public function getSnippet(): string
    {
        return $this->snippet;
    }

    public function setSnippet(string $snippet): static
    {
        $this->snippet = $snippet;

        return $this;
    }

    public function getSignature(): string
    {
        return $this->signature;
    }

    public function setSignature(string $signature): static
    {
        $this->signature = $signature;

        return $this;
    }

    public function getStatus(): DetectionStatus
    {
        return $this->status;
    }

    public function setStatus(DetectionStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function isIgnored(): bool
    {
        return $this->ignored;
    }

    public function setIgnored(bool $ignored): static
    {
        $this->ignored = $ignored;

        return $this;
    }

    public function getFirstSeenAt(): \DateTimeImmutable
    {
        return $this->firstSeenAt;
    }

    public function setFirstSeenAt(\DateTimeImmutable $firstSeenAt): static
    {
        $this->firstSeenAt = $firstSeenAt;

        return $this;
    }

    public function getLastSeenAt(): \DateTimeImmutable
    {
        return $this->lastSeenAt;
    }

    public function setLastSeenAt(\DateTimeImmutable $lastSeenAt): static
    {
        $this->lastSeenAt = $lastSeenAt;

        return $this;
    }

    public function getResolvedAt(): ?\DateTimeImmutable
    {
        return $this->resolvedAt;
    }

    public function setResolvedAt(?\DateTimeImmutable $resolvedAt): static
    {
        $this->resolvedAt = $resolvedAt;

        return $this;
    }

    public function getReopenCount(): int
    {
        return $this->reopenCount;
    }

    public function setReopenCount(int $reopenCount): static
    {
        $this->reopenCount = $reopenCount;

        return $this;
    }

    /** @return Collection<int, DetectionEvent> */
    public function getEvents(): Collection
    {
        return $this->events;
    }
}
