# ATMS - Relatório de Processo & Diário de Bordo (Dedicado)

Sistema web dedicado e isolado para apontamento de ocorrências, diário de bordo e acompanhamento dos turnos de produção nas células/máquinas.

---

## 🚀 Como Executar

```bash
cd c:\vidautil_\Relatorio-Processo
npm run dev
```

O sistema será executado em:
- **Local:** `http://localhost:3005`
- **Rede Local:** `http://<IP-DO-SERVIDOR>:3005`

---

## ⚙️ Regras de Turno & Horários

O sistema possui controle inteligente de horários para evitar edições indevidas fora do horário de trabalho:

- **1º Turno:** 05:00 às 14:18
- **2º Turno:** 14:18 às 23:25
- **3º Turno:** 23:25 às 05:00

---

## 🔒 Regras de Bloqueio e Liberação por Senha

1. **Usuários Administrativos (`ADMIN`):**
   - Possuem liberação irrestrita e automática para auditar, editar ou corrigir qualquer turno ou data histórica, **sem necessidade de senha**.

2. **Operadores / Fora do Horário:**
   - Durante o horário do turno correspondente no dia de hoje, a edição é livre para preenchimento.
   - Fora do horário do turno (ou em datas retroativas/futuras), o sistema bloqueia os campos em modo somente leitura.
   - Para liberar a edição fora do horário, basta clicar no botão **"Liberar com Senha"** e inserir a senha mestra:
     - **Senha padrão:** `admin123`

---

## ⚡ Otimização do Firebase (Zero Desperdício de Cota)

- **Busca Pontual:** Ao selecionar uma data no calendário, o sistema faz a leitura de **1 único documento** (`doc(db, 'daily_reports', data)`).
- **Sem Ouvintes Globais:** Não baixa todo o histórico e não carrega estoque, custos nem ferramentas, garantindo consumo praticamente nulo da cota diária gratuita do Firebase.
