import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawn } from "node:child_process";

interface DbConnection {
  user: string;
  password: string;
  database: string;
}

// pg_dump/pg_restore sont exécutés à l'intérieur du conteneur Docker Postgres
// (voir docker-compose.yml) plutôt qu'avec un client installé sur la machine
// hôte : garantit une version strictement identique à celle du serveur, sans
// dépendance supplémentaire à installer/maintenir. Une installation sans
// Docker (Postgres managé en production) nécessiterait d'adapter cette seule
// classe pour invoquer pg_dump/pg_restore directement sur DATABASE_URL.
@Injectable()
export class PgDumpService {
  constructor(private readonly config: ConfigService) {}

  private parseDbUrl(): DbConnection {
    const url = new URL(this.config.get<string>("DATABASE_URL")!);
    return {
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  }

  private get container(): string {
    return (
      this.config.get<string>("BACKUP_DB_CONTAINER") ?? "pos-erp-v2-postgres"
    );
  }

  // Format "custom" (-F c) : compressé, et seul format compatible avec
  // pg_restore. Sortie collectée en mémoire (pas de fichier temporaire local)
  // — le buffer résultant est ensuite uploadé sur le stockage S3-compatible
  // par BackupsService.
  runDump(): Promise<Buffer> {
    const { user, password, database } = this.parseDbUrl();

    return new Promise((resolve, reject) => {
      const child = spawn(
        "docker",
        [
          "exec",
          "-e",
          `PGPASSWORD=${password}`,
          this.container,
          "pg_dump",
          "-U",
          user,
          "-d",
          database,
          "-F",
          "c",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      const chunks: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(
            new Error(`pg_dump a échoué (code ${code}) : ${stderr.trim()}`),
          );
        }
      });
    });
  }

  // --clean --if-exists : dépose les objets existants avant de les recréer,
  // de façon idempotente.
  runRestore(dump: Buffer): Promise<void> {
    const { user, password, database } = this.parseDbUrl();

    return new Promise((resolve, reject) => {
      const child = spawn(
        "docker",
        [
          "exec",
          "-i",
          "-e",
          `PGPASSWORD=${password}`,
          this.container,
          "pg_restore",
          "-U",
          user,
          "-d",
          database,
          "--clean",
          "--if-exists",
        ],
        { stdio: ["pipe", "ignore", "pipe"] },
      );

      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("error", reject);
      child.on("close", (code) => {
        // pg_restore renvoie parfois 1 pour de simples avertissements sans
        // que la restauration ait réellement échoué — seul un code >1 est
        // traité comme une erreur bloquante.
        if (code === 0 || code === 1) {
          resolve();
        } else {
          reject(
            new Error(`pg_restore a échoué (code ${code}) : ${stderr.trim()}`),
          );
        }
      });

      child.stdin.end(dump);
    });
  }
}
