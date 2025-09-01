import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Configuração de upload - ALTERE ESTE CAMINHO PARA SUA PASTA NA REDE
const UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || 'L:/E.P.E/Sistema de Documentacao/Imagem Ficha/ActivityPro';

// Tipos de arquivos permitidos
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Extensões permitidas
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx'];

// Tamanho máximo do arquivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Função para criar diretórios se não existirem
const ensureDirectoryExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Configuração do storage do multer
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');

            const uploadPath = path.join(UPLOAD_BASE_PATH, 'evidences', String(year), month);
            console.log(`[UPLOAD] Tentando criar pasta: ${uploadPath}`);

            ensureDirectoryExists(uploadPath);
            console.log(`[UPLOAD] Pasta criada/verificada: ${uploadPath}`);

            cb(null, uploadPath);
        } catch (error) {
            console.error(`[UPLOAD] Erro ao criar pasta:`, error);
            cb(error as Error, '');
        }
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        try {
            const activityId = req.params.activityId || 'unknown';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const ext = path.extname(file.originalname);
            const baseName = path.basename(file.originalname, ext);

            // Nome do arquivo: activity_ID_TIMESTAMP_NOME-ORIGINAL.ext
            const fileName = `activity_${activityId}_${timestamp}_${baseName}${ext}`;
            console.log(`[UPLOAD] Nome do arquivo gerado: ${fileName}`);

            cb(null, fileName);
        } catch (error) {
            console.error(`[UPLOAD] Erro ao gerar nome do arquivo:`, error);
            cb(error as Error, '');
        }
    }
});

// Filtro de arquivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(mimeType)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
};

// Configuração do multer
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // Apenas um arquivo por vez
    }
});

// Função para obter caminho completo do arquivo
export const getFilePath = (relativePath: string): string => {
    return path.join(UPLOAD_BASE_PATH, relativePath);
};

// Função para obter URL relativa do arquivo
export const getFileUrl = (filePath: string): string => {
    // Normalizar separadores de caminho
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedBasePath = UPLOAD_BASE_PATH.replace(/\\/g, '/');

    // Se o filePath já contém o caminho base, remover
    let relativePath;
    if (normalizedFilePath.startsWith(normalizedBasePath)) {
        relativePath = normalizedFilePath.substring(normalizedBasePath.length);
    } else {
        relativePath = normalizedFilePath;
    }

    // Garantir que inicia com /
    if (!relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
    }

    console.log(`[URL] Caminho original: ${filePath}`);
    console.log(`[URL] Caminho base: ${UPLOAD_BASE_PATH}`);
    console.log(`[URL] URL relativa gerada: ${relativePath}`);

    return relativePath;
};

// Função para deletar arquivo
export const deleteFile = (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const fullPath = path.isAbsolute(filePath) ? filePath : getFilePath(filePath);

        fs.unlink(fullPath, (err) => {
            if (err && err.code !== 'ENOENT') {
                // Ignora erro se arquivo não existe
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

export { UPLOAD_BASE_PATH, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE };
