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
 * Produção (Vercel): Vercel Blob, mantido privado. O upload real do
 * cliente para o Blob acontece direto do browser (client-direct-upload) —
 * esta classe só é usada para ler o arquivo de volta em rotas autenticadas.
 */
export class VercelBlobStorage implements Storage {
  // Vercel Blob não tem ACL privada nativa — a "privacidade" vem de (a) URL
  // com sufixo aleatório imprevisível e (b) nunca entregar essa URL ao
  // cliente diretamente, só via rota autenticada que faz o fetch aqui e
  // faz stream do conteúdo de volta.
  async put(key: string, data: Buffer, contentType: string): Promise<string> {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, data, { access: "public", contentType, addRandomSuffix: true });
    return blob.url;
  }

  async get(key: string): Promise<Buffer> {
    const res = await fetch(key);
    if (!res.ok) throw new Error(`Falha ao ler arquivo do Blob: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
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
