import fs from 'fs';
import path from 'path';
import { UPLOAD_BASE_PATH } from './uploadConfig';

/**
 * Script para verificar e testar a configuração de upload
 */
async function checkUploadConfiguration() {
    console.log('🔍 Verificando configuração de upload...\n');

    // 1. Verificar se a variável de ambiente está definida
    console.log('1. Variável de ambiente UPLOAD_PATH:');
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    console.log(`   Caminho configurado: ${uploadPath}`);
    console.log(`   Caminho absoluto: ${path.resolve(uploadPath)}\n`);

    // 2. Verificar se a pasta base existe
    console.log('2. Verificando pasta base:');
    try {
        if (!fs.existsSync(UPLOAD_BASE_PATH)) {
            console.log('   ❌ Pasta não existe. Tentando criar...');
            fs.mkdirSync(UPLOAD_BASE_PATH, { recursive: true });
            console.log('   ✅ Pasta criada com sucesso!');
        } else {
            console.log('   ✅ Pasta existe');
        }
    } catch (error) {
        console.log(`   ❌ Erro ao verificar/criar pasta: ${error}`);
        return;
    }

    // 3. Testar permissões de escrita
    console.log('\n3. Testando permissões de escrita:');
    try {
        const testFile = path.join(UPLOAD_BASE_PATH, 'test-write.txt');
        fs.writeFileSync(testFile, 'Teste de escrita');
        fs.unlinkSync(testFile);
        console.log('   ✅ Permissões de escrita OK');
    } catch (error) {
        console.log(`   ❌ Erro de permissão: ${error}`);
        return;
    }

    // 4. Criar estrutura de pastas para evidências
    console.log('\n4. Criando estrutura de pastas:');
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        const evidencePath = path.join(UPLOAD_BASE_PATH, 'evidences', String(currentYear), currentMonth);

        if (!fs.existsSync(evidencePath)) {
            fs.mkdirSync(evidencePath, { recursive: true });
            console.log(`   ✅ Estrutura criada: ${evidencePath}`);
        } else {
            console.log(`   ✅ Estrutura já existe: ${evidencePath}`);
        }
    } catch (error) {
        console.log(`   ❌ Erro ao criar estrutura: ${error}`);
        return;
    }

    // 5. Verificar espaço em disco disponível
    console.log('\n5. Verificando espaço em disco:');
    try {
        const stats = fs.statSync(UPLOAD_BASE_PATH);
        console.log(`   📁 Pasta válida`);

        // No Windows, podemos usar o comando DIR para verificar espaço
        // No Linux/Mac, podemos usar df
        if (process.platform === 'win32') {
            console.log('   💡 Verifique o espaço disponível com: dir /-c "' + UPLOAD_BASE_PATH + '"');
        } else {
            console.log('   💡 Verifique o espaço disponível com: df -h "' + UPLOAD_BASE_PATH + '"');
        }
    } catch (error) {
        console.log(`   ❌ Erro ao verificar pasta: ${error}`);
    }

    // 6. Resumo da configuração
    console.log('\n📋 Resumo da Configuração:');
    console.log(`   Caminho base: ${UPLOAD_BASE_PATH}`);
    console.log(`   Tipos permitidos: JPG, PNG, PDF, DOC, DOCX, TXT`);
    console.log(`   Tamanho máximo: 10MB`);
    console.log(`   Organização: /evidences/YYYY/MM/`);

    console.log('\n✅ Verificação concluída! O sistema de upload está pronto para uso.');
    console.log('\n💡 Dicas:');
    console.log('   - Para usar pasta na rede, configure UPLOAD_PATH no .env');
    console.log('   - Exemplo Windows: UPLOAD_PATH=\\\\\\\\servidor\\\\compartilhamento\\\\ActivityPro\\\\uploads');
    console.log('   - Certifique-se de incluir a pasta de uploads no backup');
}

// Executar verificação se chamado diretamente
checkUploadConfiguration().catch(console.error);

export { checkUploadConfiguration };
