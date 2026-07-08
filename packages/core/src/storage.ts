import { promises as fs } from "node:fs";
import path from "node:path";

export interface Storage {
  /** Salva um arquivo e retorna a storage key para persistir em faturas_importadas.arquivo_storage_key. */
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  /** Lê o conteúdo original — usado pela rota autenticada de "ver fatura original". */
  get(key: string): Promise<Buffer>;
}

/**
 * Dev local (Docker): arquivos num volume montado, nunca expostos
 * diretamente por um servidor estático — sempre via rota autenticada que
 * lê e faz stream do arquivo.
 */
export class LocalFsStorage implements Storage {
  constructor(private readonly baseDir: string) {}

  async put(key: string, data: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.baseDir, key));
  }
}

/**
 * Produção (Vercel): Vercel Blob store privado — leitura e escrita exigem
 * autenticação (OIDC/token), a URL sozinha não abre o arquivo pra ninguém.
 * Só é usada para ler o arquivo de volta em rotas autenticadas do app.
 */
export class VercelBlobStorage implements Storage {
  async put(key: string, data: Buffer, contentType: string): Promise<string> {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, data, { access: "private", contentType, addRandomSuffix: true });
    return blob.url;
  }

  async get(key: string): Promise<Buffer> {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: "private" });
    if (!result) throw new Error("Arquivo não encontrado no Blob");
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
}

let storageInstance: Storage | undefined;

export function getStorage(): Storage {
  if (storageInstance) return storageInstance;

  storageInstance = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
    ? new VercelBlobStorage()
    : new LocalFsStorage(process.env.LOCAL_STORAGE_DIR ?? "./docker/blob-storage");

  return storageInstance;
}
