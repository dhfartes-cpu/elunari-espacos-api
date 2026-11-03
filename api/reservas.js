// Rota de API Serverless para a Elunari Tech - Reserva de Espaços
export default async function handler(req, res) {
    // Configura cabeçalhos CORS para permitir acesso do Aplicativo Mobile
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 1. LISTAR RESERVAS (GET)
    if (req.method === 'GET') {
        const reservasAtuais = [
            { id: 1, espaco: 'Sala de Vídeo', data: '2026-11-03', periodo: 'Manhã - 3º Período', professor: 'Professor Douglas' },
            { id: 2, espaco: 'Laboratório de Informática', data: '2026-11-03', periodo: 'Tarde - 1º Período', professor: 'Professor Convidado' }
        ];
        
        return res.status(200).json({ 
            sucesso: true, 
            mensagem: "API da Elunari Tech operando com sucesso!",
            dados: reservasAtuais 
        });
    }

    // 2. CRIAR UMA NOVA RESERVA (POST)
    if (req.method === 'POST') {
        const { espaco, data, periodo, professor } = req.body || {};

        if (!espaco || !data || !periodo || !professor) {
            return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos obrigatórios.' });
        }

        return res.status(201).json({ 
            sucesso: true, 
            mensagem: 'Espaço reservado com sucesso!',
            reserva: { espaco, data, periodo, professor } 
        });
    }

    return res.status(405).json({ sucesso: false, erro: 'Método não permitido' });
}