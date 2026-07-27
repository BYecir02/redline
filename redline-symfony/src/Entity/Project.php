<?php

namespace App\Entity;

use App\Repository\ProjectRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Un dossier racine surveillé, appartenant à un utilisateur.
 * Le chemin est unique PAR utilisateur (deux comptes peuvent surveiller le même).
 */
#[ORM\Entity(repositoryClass: ProjectRepository::class)]
#[ORM\Table(name: 'projet')]
#[ORM\UniqueConstraint(name: 'uniq_projet_utilisateur_chemin', columns: ['user_id', 'path'])]
class Project
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'projects')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 500)]
    private string $path;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $label = null;

    /**
     * Skills (règles) activés pour ce projet lors de la dernière configuration.
     * Stocké en JSON (dénormalisation assumée, cf. dossier MERISE).
     *
     * @var string[]
     */
    #[ORM\Column(type: Types::JSON)]
    private array $skills = [];

    /**
     * Sous-dossiers exclus de la surveillance (chemins relatifs).
     *
     * @var string[]
     */
    #[ORM\Column(type: Types::JSON)]
    private array $excluded = [];

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    /** @var Collection<int, Detection> */
    #[ORM\OneToMany(mappedBy: 'project', targetEntity: Detection::class, orphanRemoval: true)]
    private Collection $detections;

    /** @var Collection<int, DetectionEvent> */
    #[ORM\OneToMany(mappedBy: 'project', targetEntity: DetectionEvent::class, orphanRemoval: true)]
    private Collection $events;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->detections = new ArrayCollection();
        $this->events = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function setPath(string $path): static
    {
        $this->path = $path;

        return $this;
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function setLabel(?string $label): static
    {
        $this->label = $label;

        return $this;
    }

    /** @return string[] */
    public function getSkills(): array
    {
        return $this->skills;
    }

    /** @param string[] $skills */
    public function setSkills(array $skills): static
    {
        $this->skills = $skills;

        return $this;
    }

    /** @return string[] */
    public function getExcluded(): array
    {
        return $this->excluded;
    }

    /** @param string[] $excluded */
    public function setExcluded(array $excluded): static
    {
        $this->excluded = $excluded;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    /** @return Collection<int, Detection> */
    public function getDetections(): Collection
    {
        return $this->detections;
    }

    public function addDetection(Detection $detection): static
    {
        if (!$this->detections->contains($detection)) {
            $this->detections->add($detection);
            $detection->setProject($this);
        }

        return $this;
    }

    public function removeDetection(Detection $detection): static
    {
        if ($this->detections->removeElement($detection)) {
            if ($detection->getProject() === $this) {
                $detection->setProject(null);
            }
        }

        return $this;
    }

    /** @return Collection<int, DetectionEvent> */
    public function getEvents(): Collection
    {
        return $this->events;
    }

    public function addEvent(DetectionEvent $event): static
    {
        if (!$this->events->contains($event)) {
            $this->events->add($event);
            $event->setProject($this);
        }

        return $this;
    }

    public function removeEvent(DetectionEvent $event): static
    {
        if ($this->events->removeElement($event)) {
            if ($event->getProject() === $this) {
                $event->setProject(null);
            }
        }

        return $this;
    }
}
