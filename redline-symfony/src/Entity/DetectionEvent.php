<?php

namespace App\Entity;

use App\Enum\EventType;
use App\Repository\DetectionEventRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Journal horodaté (append-only) : alimente les courbes de tendance et l'audit.
 * L'événement survit à la suppression de sa détection (clé étrangère mise à NULL).
 */
#[ORM\Entity(repositoryClass: DetectionEventRepository::class)]
#[ORM\Table(name: 'evenement_detection')]
#[ORM\Index(name: 'idx_evenement_projet_date', columns: ['project_id', 'at'])]
#[ORM\Index(name: 'idx_evenement_date', columns: ['at'])]
class DetectionEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'events')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Project $project = null;

    #[ORM\ManyToOne(inversedBy: 'events')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Detection $detection = null;

    #[ORM\Column(enumType: EventType::class)]
    private EventType $type;

    #[ORM\Column(length: 100)]
    private string $skillId;

    #[ORM\Column(length: 20)]
    private string $severity;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $at;

    public function __construct()
    {
        $this->at = new \DateTimeImmutable();
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

    public function getDetection(): ?Detection
    {
        return $this->detection;
    }

    public function setDetection(?Detection $detection): static
    {
        $this->detection = $detection;

        return $this;
    }

    public function getType(): EventType
    {
        return $this->type;
    }

    public function setType(EventType $type): static
    {
        $this->type = $type;

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

    public function getSeverity(): string
    {
        return $this->severity;
    }

    public function setSeverity(string $severity): static
    {
        $this->severity = $severity;

        return $this;
    }

    public function getAt(): \DateTimeImmutable
    {
        return $this->at;
    }

    public function setAt(\DateTimeImmutable $at): static
    {
        $this->at = $at;

        return $this;
    }
}
