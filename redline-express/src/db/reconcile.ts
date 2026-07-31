/**
 * Logique PURE de réconciliation du cycle de vie des détections (sans DB).
 *
 * À chaque re-scan d'un fichier, on compare les problèmes désormais présents
 * (par SIGNATURE de contenu) à ceux déjà connus en base pour ce fichier, et on
 * en déduit ce qu'il faut faire. Isolée ici pour être testable sans Postgres ;
 * `detectionRepo.ts` se contente d'appliquer le plan produit.
 *
 * Règles :
 *  - signature présente ET inconnue en base       → CREATE (nouvelle détection ACTIVE)
 *  - signature présente ET connue mais RESOLVED    → REOPEN (le problème est revenu)
 *  - signature présente ET connue et déjà ACTIVE   → TOUCH  (on rafraîchit lastSeenAt)
 *  - signature ABSENTE mais détection ACTIVE en base → RESOLVE (le problème a disparu)
 *  - signature absente et détection déjà RESOLVED   → rien (stable)
 */

export type DetectionStatus = "ACTIVE" | "RESOLVED";

/** Une détection déjà connue en base (vue minimale nécessaire au diff). */
export type ExistingDetection = {
  id: string;
  signature: string;
  status: DetectionStatus;
};

/** Plan d'application : identifiants/signatures à traiter par catégorie. */
export type ReconcilePlan = {
  /** Signatures à insérer comme détections ACTIVE. */
  create: string[];
  /** Ids de détections RESOLVED à repasser ACTIVE (réapparition). */
  reopen: string[];
  /** Ids de détections déjà ACTIVE à simplement rafraîchir (lastSeenAt). */
  touch: string[];
  /** Ids de détections ACTIVE à passer RESOLVED (le problème a disparu). */
  resolve: string[];
};

/**
 * Calcule le plan de réconciliation pour UN fichier.
 * @param existing détections déjà en base pour ce projet+fichier
 * @param incoming signatures des problèmes présents dans le nouveau rapport
 */
export function planReconciliation(
  existing: ExistingDetection[],
  incoming: string[],
): ReconcilePlan {
  const plan: ReconcilePlan = { create: [], reopen: [], touch: [], resolve: [] };

  // Index des détections connues par signature (une par signature : contrainte DB).
  const bySignature = new Map<string, ExistingDetection>();
  for (const d of existing) bySignature.set(d.signature, d);

  const incomingSet = new Set(incoming);

  // Problèmes présents dans le rapport → create / reopen / touch.
  for (const sig of incomingSet) {
    const known = bySignature.get(sig);
    if (!known) {
      plan.create.push(sig);
    } else if (known.status === "RESOLVED") {
      plan.reopen.push(known.id);
    } else {
      plan.touch.push(known.id);
    }
  }

  // Détections ACTIVE en base mais absentes du rapport → resolve.
  for (const d of existing) {
    if (d.status === "ACTIVE" && !incomingSet.has(d.signature)) {
      plan.resolve.push(d.id);
    }
  }

  return plan;
}

/** Signature stable d'un problème, propre au projet : `fichier::skill::extrait`. */
export function signatureOf(file: string, skillId: string, before: string): string {
  return `${file}::${skillId}::${before.trim()}`;
}
