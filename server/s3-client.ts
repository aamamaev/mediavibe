import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = "https://storage.yandexcloud.net";
const S3_REGION = "ru-central1";
const S3_BUCKET = process.env.YANDEX_S3_BUCKET || "cinefeels-movies";

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.YANDEX_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.YANDEX_S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
}

export async function listJsonFiles(): Promise<S3Object[]> {
  const objects: S3Object[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key?.endsWith(".json") && item.Key && item.Size && item.LastModified) {
          objects.push({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
          });
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

export async function getJsonContent(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const body = await response.Body?.transformToString();
  
  if (!body) {
    throw new Error(`Empty response for key: ${key}`);
  }

  return body;
}

export async function checkPosterExists(fid: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${fid}.jpg`,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getPosterPresignedUrl(fid: string): Promise<string | null> {
  try {
    const exists = await checkPosterExists(fid);
    if (!exists) {
      return null;
    }
    return generatePresignedUrl(`${fid}.jpg`);
  } catch (error) {
    console.error(`Error generating presigned URL for ${fid}:`, error);
    return null;
  }
}

export { s3Client, S3_BUCKET, S3_ENDPOINT, S3_REGION };
