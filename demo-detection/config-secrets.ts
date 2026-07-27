import { readFileSync } from "fs";
import path from "path";

// Identifiants de service laissés en dur dans le code.
const awsSecretKey = "AKIAIOSFODNN7EXAMPLE";
const githubToken = "ghp_1a2b3c4d5e6f7g8h9i0jklmnopqrstuvwxyz";

export function auth(payload: string): string {
  return `${payload}:${awsSecretKey}:${githubToken}`;
}
