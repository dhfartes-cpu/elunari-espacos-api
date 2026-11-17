import { createClient } from 'redis';

const CHAVE_RESERVAS = 'elunari:espacos:reservas';
const SENHA_ADMIN = '9999';

async function getRedisClient() {
    const url = process.env.STORAGE_URL || process.env.REDIS_URL || process.env.KV_URL;
    if (!url) {
        throw new Error('URL do banco de dados não encontrada nas variáveis da Vercel.');
    }
    const client = createClient({ url });
    await client.connect();
    return client;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let client;
    try {
        client = await getRedisClient();

        if (req.method === 'GET') {
            const dadosStr = await client.get(CHAVE_RESERVAS);
            const reservas = dadosStr ? JSON.parse(dadosStr) : [];
            const reservasPublicas = reservas.map(({ pin, ...resto }) => resto);
            return res.status(200).json({ sucesso: true, dados: reservasPublicas });
        }

        if (req.method === 'POST') {
            const { espaco, data, periodos, professor, pin } = req.body || {};

            if (!espaco || !data || !periodos || !Array.isArray(periodos) || periodos.length === 0 || !professor || !pin) {
                return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos e selecione pelo menos um período.' });
            }

            const dadosStr = await client.get(CHAVE_RESERVAS);
            const reservas = dadosStr ? JSON.parse(dadosStr) : [];

            for (const periodo of periodos) {
                const conflito = reservas.find(r => r.espaco === espaco && r.data === data && r.periodo === periodo);
                if (conflito) {
                    return res.status(409).json({
                        sucesso: false,
                        erro: `O período "${periodo}" em ${espaco} já está reservado por ${conflito.professor}.`
                    });
                }
            }

            const grupoId = Date.now().toString();
            const novasReservas = periodos.map(periodo => ({
                id: `${grupoId}-${Math.random().toString(36).substr(2, 5)}`,
                espaco,
                data,
                periodo,
                professor: professor.trim(),
                pin: pin.trim()
            }));

            reservas.push(...novasReservas);
            await client.set(CHAVE_RESERVAS, JSON.stringify(reservas));

            return res.status(201).json({ sucesso: true, mensagem: 'Espaço(s) reservado(s) com sucesso!' });
        }

        if (req.method === 'DELETE') {
            const { id, pin } = req.body || {};
            const dadosStr = await client.get(CHAVE_RESERVAS);
            const reservas = dadosStr ? JSON.parse(dadosStr) : [];
            const index = reservas.findIndex(r => r.id === id);

            if (index === -1) {
                return res.status(404).json({ sucesso: false, erro: 'Reserva não encontrada.' });
            }

            if (reservas[index].pin !== pin.trim() && pin.trim() !== SENHA_ADMIN) {
                return res.status(403).json({ sucesso: false, erro: 'PIN incorreto.' });
            }

            reservas.splice(index, 1);
            await client.set(CHAVE_RESERVAS, JSON.stringify(reservas));

            return res.status(200).json({ sucesso: true, mensagem: 'Reserva cancelada com sucesso!' });
        }

        return res.status(405).json({ sucesso: false, erro: 'Método não permitido' });
    } catch (error) {
        return res.status(500).json({ sucesso: false, erro: 'Erro interno: ' + error.message });
    } finally {
        if (client) {
            await client.quit();
        }
    }
}
