import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

export interface S3BackupObject {
  key: string;
  size: number;
  lastModified: Date;
}

// Stockage S3-compatible (MinIO en dev, S3/R2/Spaces en production) plutôt
// que le disque local du conteneur API du projet de référence — survit à un
// redémarrage/remplacement de conteneur, et permet de lister/télécharger une
// sauvegarde depuis une instance API différente de celle qui l'a créée.
@Injectable()
export class BackupsS3Service implements OnModuleInit {
  private readonly logger = new Logger(BackupsS3Service.name);
  private client!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.bucket = this.config.get<string>("S3_BUCKET") ?? "pos-erp-v2";
    this.client = new S3Client({
      endpoint: this.config.get<string>("S3_ENDPOINT"),
      region: this.config.get<string>("S3_REGION") ?? "us-east-1",
      forcePathStyle: this.config.get<string>("S3_FORCE_PATH_STYLE") === "true",
      credentials: {
        accessKeyId: this.config.get<string>("S3_ACCESS_KEY_ID") ?? "",
        secretAccessKey: this.config.get<string>("S3_SECRET_ACCESS_KEY") ?? "",
      },
    });
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      // Déjà créé par un démarrage précédent — seule erreur tolérée ici.
      const code = (error as { name?: string }).name;
      if (
        code !== "BucketAlreadyOwnedByYou" &&
        code !== "BucketAlreadyExists"
      ) {
        this.logger.warn(
          `Création du bucket "${this.bucket}" ignorée : ${(error as Error).message}`,
        );
      }
    }
  }

  async put(key: string, body: Buffer): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body }),
    );
  }

  async list(prefix: string): Promise<S3BackupObject[]> {
    await this.ensureBucket();
    const result = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }),
    );
    return (result.Contents ?? [])
      .filter((obj) => obj.Key && obj.Size !== undefined && obj.LastModified)
      .map((obj) => ({
        key: obj.Key!,
        size: obj.Size!,
        lastModified: obj.LastModified!,
      }));
  }

  async getBuffer(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = result.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    const objects = await this.list(key);
    return objects.some((obj) => obj.key === key);
  }
}
