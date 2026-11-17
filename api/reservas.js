import { kv } from '@vercel/kv';

const CHAVE_RESERVAS = 'elunari:espacos:reservas';
const SENHA_ADMIN = '9999'; // Senha mestra caso você/coordenação precise cancelar algo

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 1. LISTAR RESERVAS (GET)
        if (req.method === 'GET') {
            const reservas = (await kv.get(CHAVE_RESERVAS)) || [];
            // Ordena por data mais próxima
            reservas.sort((a, b) => a.data.localeCompare(b.data));

            // Remove o PIN antes de enviar para a tela do celular por segurança
            const reservasPublicas = reservas.map(({ pin, ...resto }) => resto);

            return res.status(200).json({
                sucesso: true,
                dados: reservasPublicas
            });
        }

        // 2. CRIAR NOVA RESERVA (POST)
        if (req.method === 'POST') {
            const { espaco, data, periodo, professor, pin } = req.body || {};

            if (!espaco || !data || !periodo || !professor || !pin) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Preencha todos os campos e crie um PIN de 4 dígitos.'
                });
            }

            const reservas = (await kv.get(CHAVE_RESERVAS)) || [];

            // Verifica se já existe reserva para o mesmo espaço, data e período
            const conflito = reservas.find(
                (r) => r.espaco === espaco && r.data === data && r.periodo === periodo
            );

            if (conflito) {
                return res.status(409).json({
                    sucesso: false,
                    erro: `Espaço já reservado neste horário por ${conflito.professor}.`
                });
            }

            const novaReserva = {
                id: Date.now().toString(),
                espaco,
                data,
                periodo,
                professor: professor.trim(),
                pin: pin.trim()
            };

            reservas.push(novaReserva);
            await kv.set(CHAVE_RESERVAS, reservas);

            const { pin: _, ...reservaSemPin } = novaReserva;

            return res.status(201).json({
                sucesso: true,
                mensagem: 'Espaço reservado com sucesso!',
                reserva: reservaSemPin
            });
        }

        // 3. CANCELAR RESERVA (DELETE)
        if (req.method === 'DELETE') {
            const { id, pin } = req.body || {};

            if (!id || !pin) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Informe o PIN para cancelar a reserva.'
                });
            }

            const reservas = (await kv.get(CHAVE_RESERVAS)) || [];
            const index = reservas.findIndex((r) => r.id === id);

            if (index === -1) {
                return res.status(404).json({
                    sucesso: false,
                    erro: 'Reserva não encontrada.'
                });
            }

            // Só apaga se o PIN bater com o do professor ou se for a senha admin
            if (reservas[index].pin !== pin.trim() && pin.trim() !== SENHA_ADMIN) {
                return res.status(403).json({
                    sucesso: false,
                    erro: 'PIN incorreto. Apenas quem agendou pode cancelar.'
                });
            }

            reservas.splice(index, 1);
            await kv.set(CHAVE_RESERVAS, reservas);

            return res.status(200).json({
                sucesso: true,
                mensagem: 'Reserva cancelada com sucesso!'
            });
        }

        return res.status(405).json({ sucesso: false, erro: 'Método não permitido' });
    } catch (error) {
        return res.status(500).json({
            sucesso: false,
            erro: 'Erro interno no servidor: ' + error.message
        });
    }
}
