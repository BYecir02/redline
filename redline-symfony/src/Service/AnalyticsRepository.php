<?php

namespace App\Service;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\ParameterType;

/**
 * Agrégations analytiques (lecture seule), toutes scopées par utilisateur.
 * SQL brut paramétré (jamais de concaténation d'entrée utilisateur) : compteurs,
 * MTTR, tendances via date_trunc, gestion des ignorés. Réplique statsRepo.ts.
 */
class AnalyticsRepository
{
    public function __construct(private readonly Connection $db)
    {
    }

    /**
     * Liste les projets de l'utilisateur, du plus récemment actif au plus ancien.
     *
     * @return list<array<string, mixed>>
     */
    public function projectSummaries(int $userId): array
    {
        $projects = $this->db->fetchAllAssociative(
            'SELECT id, path, label, skills, excluded, created_at
             FROM projet WHERE user_id = :uid',
            ['uid' => $userId],
        );
        if ($projects === []) {
            return [];
        }

        $counts = $this->db->fetchAllAssociative(
            'SELECT d.project_id AS pid, d.status AS status, count(*) AS c
             FROM detection d JOIN projet p ON p.id = d.project_id
             WHERE p.user_id = :uid AND d.ignored = false
             GROUP BY d.project_id, d.status',
            ['uid' => $userId],
        );
        $active = [];
        $resolved = [];
        foreach ($counts as $row) {
            if ($row['status'] === 'ACTIVE') {
                $active[(int) $row['pid']] = (int) $row['c'];
            } elseif ($row['status'] === 'RESOLVED') {
                $resolved[(int) $row['pid']] = (int) $row['c'];
            }
        }

        $lastRows = $this->db->fetchAllAssociative(
            'SELECT d.project_id AS pid, max(d.last_seen_at) AS last_at
             FROM detection d JOIN projet p ON p.id = d.project_id
             WHERE p.user_id = :uid GROUP BY d.project_id',
            ['uid' => $userId],
        );
        $lastById = [];
        foreach ($lastRows as $row) {
            $lastById[(int) $row['pid']] = $row['last_at'];
        }

        $result = [];
        foreach ($projects as $p) {
            $id = (int) $p['id'];
            $last = $lastById[$id] ?? null;
            $result[] = [
                'id' => (string) $id,
                'path' => $p['path'],
                'label' => $p['label'],
                'skills' => $this->decodeJson($p['skills']),
                'excluded' => $this->decodeJson($p['excluded']),
                'createdAt' => $this->iso($p['created_at']),
                'activeCount' => $active[$id] ?? 0,
                'resolvedCount' => $resolved[$id] ?? 0,
                'lastActivityAt' => $last !== null ? $this->iso($last) : null,
            ];
        }

        // Plus récemment actif d'abord ; à défaut d'activité, par date de création.
        usort($result, static function (array $a, array $b): int {
            $ka = $a['lastActivityAt'] ?? $a['createdAt'];
            $kb = $b['lastActivityAt'] ?? $b['createdAt'];

            return strcmp($kb, $ka);
        });

        return $result;
    }

    /** @return array<string, mixed> */
    public function summary(int $userId, ?string $projectPath): array
    {
        $pathCond = $projectPath !== null ? 'AND p.path = :path' : '';
        $params = ['uid' => $userId];
        if ($projectPath !== null) {
            $params['path'] = $projectPath;
        }

        $countDet = fn (string $extra): int => (int) $this->db->fetchOne(
            "SELECT count(*) FROM detection d JOIN projet p ON p.id = d.project_id
             WHERE p.user_id = :uid AND d.ignored = false $extra $pathCond",
            $params,
        );

        $active = $countDet("AND d.status = 'ACTIVE'");
        $resolved = $countDet("AND d.status = 'RESOLVED'");
        $reopenedCount = $countDet('AND d.reopen_count > 0');

        $events = (int) $this->db->fetchOne(
            "SELECT count(*) FROM evenement_detection e JOIN projet p ON p.id = e.project_id
             WHERE p.user_id = :uid $pathCond",
            $params,
        );

        $groupBy = fn (string $dim): array => $this->db->fetchAllAssociative(
            "SELECT d.$dim AS dim, d.status AS status, count(*) AS c
             FROM detection d JOIN projet p ON p.id = d.project_id
             WHERE p.user_id = :uid AND d.ignored = false $pathCond
             GROUP BY d.$dim, d.status",
            $params,
        );

        $bySeverity = $this->splitByStatus($groupBy('severity'), 'severity');
        $byCategory = $this->splitByStatus($groupBy('category'), 'category');
        $bySkill = $this->splitByStatus($groupBy('skill_id'), 'skillId');

        $topSkills = array_map(
            static fn (array $s): array => [
                'skillId' => $s['skillId'],
                'total' => $s['active'] + $s['resolved'],
                'active' => $s['active'],
                'resolved' => $s['resolved'],
            ],
            $bySkill,
        );
        usort($topSkills, static fn (array $a, array $b): int => $b['total'] - $a['total']);
        $topSkills = array_slice($topSkills, 0, 8);

        $mttr = $this->db->fetchOne(
            "SELECT avg(extract(epoch FROM (d.resolved_at - d.first_seen_at)))::float
             FROM detection d JOIN projet p ON p.id = d.project_id
             WHERE p.user_id = :uid AND d.status = 'RESOLVED'
               AND d.resolved_at IS NOT NULL AND d.ignored = false $pathCond",
            $params,
        );

        return [
            'totals' => [
                'active' => $active,
                'resolved' => $resolved,
                'detections' => $active + $resolved,
                'events' => $events,
            ],
            'bySeverity' => $bySeverity,
            'byCategory' => $byCategory,
            'topSkills' => $topSkills,
            'mttrSeconds' => $mttr !== null ? (float) $mttr : null,
            'reopenedCount' => $reopenedCount,
        ];
    }

    /** @return array{bucket: string, points: list<array<string, mixed>>} */
    public function trends(int $userId, string $bucket, int $limit, ?string $projectPath): array
    {
        $unit = in_array($bucket, ['minute', 'hour', 'day'], true) ? $bucket : 'hour';
        $limit = max(1, min($limit, 500));
        $pathCond = $projectPath !== null ? 'AND p.path = :path' : '';
        $params = ['uid' => $userId];
        if ($projectPath !== null) {
            $params['path'] = $projectPath;
        }

        // $unit est strictement borné à un jeu sûr → interpolation sans risque.
        $rows = $this->db->fetchAllAssociative(
            "SELECT date_trunc('$unit', e.\"at\") AS at, e.type AS type, count(*) AS c
             FROM evenement_detection e JOIN projet p ON p.id = e.project_id
             WHERE p.user_id = :uid $pathCond
             GROUP BY 1, 2 ORDER BY 1 ASC",
            $params,
        );

        $byBucket = [];
        foreach ($rows as $r) {
            $at = $this->iso($r['at']);
            $byBucket[$at] ??= ['at' => $at, 'appeared' => 0, 'resolved' => 0, 'reopened' => 0];
            $c = (int) $r['c'];
            if ($r['type'] === 'APPEARED') {
                $byBucket[$at]['appeared'] += $c;
            } elseif ($r['type'] === 'RESOLVED') {
                $byBucket[$at]['resolved'] += $c;
            } elseif ($r['type'] === 'REOPENED') {
                $byBucket[$at]['reopened'] += $c;
            }
        }

        $points = array_values($byBucket);
        usort($points, static fn (array $a, array $b): int => strcmp($a['at'], $b['at']));

        return ['bucket' => $unit, 'points' => array_slice($points, -$limit)];
    }

    /** @return list<array{projectPath: string, signature: string}> */
    public function listIgnored(int $userId): array
    {
        $rows = $this->db->fetchAllAssociative(
            'SELECT p.path AS project_path, d.signature AS signature
             FROM detection d JOIN projet p ON p.id = d.project_id
             WHERE p.user_id = :uid AND d.ignored = true',
            ['uid' => $userId],
        );

        return array_map(
            static fn (array $r): array => ['projectPath' => $r['project_path'], 'signature' => $r['signature']],
            $rows,
        );
    }

    /** Marque une détection (projet + signature) comme ignorée. Renvoie true si trouvée. */
    public function setIgnored(int $userId, string $projectPath, string $signature, bool $ignored): bool
    {
        $projectId = $this->db->fetchOne(
            'SELECT id FROM projet WHERE user_id = :uid AND path = :path',
            ['uid' => $userId, 'path' => $projectPath],
        );
        if ($projectId === false) {
            return false;
        }

        $count = $this->db->executeStatement(
            'UPDATE detection SET ignored = :ig WHERE project_id = :pid AND signature = :sig',
            ['ig' => $ignored, 'pid' => (int) $projectId, 'sig' => $signature],
            ['ig' => ParameterType::BOOLEAN],
        );

        return $count > 0;
    }

    /** Restaure toutes les détections ignorées de l'utilisateur. */
    public function restoreAll(int $userId): void
    {
        $this->db->executeStatement(
            'UPDATE detection d SET ignored = false FROM projet p
             WHERE d.project_id = p.id AND p.user_id = :uid AND d.ignored = true',
            ['uid' => $userId],
        );
    }

    /**
     * Fusionne des lignes (dimension x statut) en { <key>: dim, active, resolved }.
     *
     * @param list<array<string, mixed>> $rows
     *
     * @return list<array<string, mixed>>
     */
    private function splitByStatus(array $rows, string $key): array
    {
        $map = [];
        foreach ($rows as $r) {
            $dim = (string) $r['dim'];
            $map[$dim] ??= ['active' => 0, 'resolved' => 0];
            if ($r['status'] === 'ACTIVE') {
                $map[$dim]['active'] += (int) $r['c'];
            } elseif ($r['status'] === 'RESOLVED') {
                $map[$dim]['resolved'] += (int) $r['c'];
            }
        }

        $out = [];
        foreach ($map as $dim => $split) {
            $out[] = [$key => $dim, 'active' => $split['active'], 'resolved' => $split['resolved']];
        }

        return $out;
    }

    /** @return list<string> */
    private function decodeJson(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    private function iso(string $dbTimestamp): string
    {
        return (new \DateTimeImmutable($dbTimestamp, new \DateTimeZone('UTC')))
            ->format(\DateTimeInterface::ATOM);
    }
}
