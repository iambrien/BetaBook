import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are BetaBook AI, the smart business assistant for Nigerian market traders.

Your personality:
- Warm, friendly and professional
- You speak simple English mixed with Nigerian Pidgin expressions naturally (but not excessively)
- You are encouraging and positive about business
- You give practical, actionable advice

Your capabilities:
- Analyze transaction data provided in the context block
- Answer questions about income, expenses, debts, and profit accurately
- Provide business insights and advice tailored to Nigerian market traders
- Help users understand their financial position

Rules when analyzing data:
- ALWAYS use the live data from the "LIVE BUSINESS DATA" section to answer financial questions
- Calculate totals from the actual transaction list — never invent numbers
- Reference specific customer names, amounts, and dates when relevant
- Always format money as ₦X,XXX (e.g., ₦15,000 not 15000)
- Use expressions like "Oga", "e don happen", "e no go reach", "make you", "sharp sharp" naturally

For debt questions (e.g., "Who owes me?", "How much is X owing?"):
- Search the OUTSTANDING DEBTS section in the provided data
- Give the exact amount, item name, and date
- Example response: "Yes o! Mama Nkechi still dey owe you ₦15,000 for that Ankara fabric she collected on 12th June. You fit send am WhatsApp reminder from the Debt Tracker section."

For financial summaries:
- Compute totals from the transactions provided
- Clearly separate income, expenses, profit/loss
- Give actionable advice based on the numbers

If no data is provided, gently encourage the user to start recording their transactions.
Always be supportive and make the trader feel confident in managing their business.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, context, businessId } = body;

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      console.error('Missing ONSPACE_AI_API_KEY or ONSPACE_AI_BASE_URL');
      throw new Error('AI service not configured. Please contact support.');
    }

    // ── Build rich context from live transaction data ──────────────────────
    let contextBlock = '';
    if (Array.isArray(context) && context.length > 0) {
      const filtered = businessId
        ? context.filter((t: Record<string, unknown>) => t.business_id === businessId)
        : context;

      if (filtered.length > 0) {
        const income = filtered.filter((t: Record<string, unknown>) => t.type === 'income');
        const expenses = filtered.filter((t: Record<string, unknown>) => t.type === 'expense');
        const debts = income.filter((t: Record<string, unknown>) => t.payment_status === 'credit');

        const totalIncome = income.reduce((s: number, t: Record<string, unknown>) => s + Number(t.amount), 0);
        const totalExpense = expenses.reduce((s: number, t: Record<string, unknown>) => s + Number(t.amount), 0);
        const netProfit = totalIncome - totalExpense;

        contextBlock = `\n\n=== LIVE BUSINESS DATA ===\n`;
        contextBlock += `Total Income: ₦${totalIncome.toLocaleString()}\n`;
        contextBlock += `Total Expenses: ₦${totalExpense.toLocaleString()}\n`;
        contextBlock += `Net ${netProfit >= 0 ? 'Profit' : 'Loss'}: ₦${Math.abs(netProfit).toLocaleString()}\n`;
        contextBlock += `Total Transactions: ${filtered.length}\n\n`;

        if (debts.length > 0) {
          const totalDebt = debts.reduce((s: number, t: Record<string, unknown>) => s + Number(t.amount), 0);
          contextBlock += `OUTSTANDING DEBTS (${debts.length} customers, total ₦${totalDebt.toLocaleString()}):\n`;
          debts.forEach((d: Record<string, unknown>) => {
            const dateStr = new Date(d.created_at as string).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric',
            });
            contextBlock += `  - ${d.customer_name || 'Unknown Customer'}: ₦${Number(d.amount).toLocaleString()} for "${d.item_name || 'goods'}" on ${dateStr}`;
            if (d.customer_phone) contextBlock += ` (Phone: ${d.customer_phone})`;
            contextBlock += '\n';
          });
          contextBlock += '\n';
        } else {
          contextBlock += 'OUTSTANDING DEBTS: None — all customers have paid! 🎉\n\n';
        }

        // Recent transactions (up to 20)
        const recent = filtered.slice(0, 20);
        contextBlock += `RECENT ${recent.length} TRANSACTIONS:\n`;
        recent.forEach((t: Record<string, unknown>) => {
          const date = new Date(t.created_at as string).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
          const label = (t.item_name as string) || (t.category as string) || (t.type === 'income' ? 'Income' : 'Expense');
          const sign = t.type === 'income' ? '+' : '-';
          const creditTag = t.payment_status === 'credit' ? ` [CREDIT - ${t.customer_name}]` : '';
          contextBlock += `  ${sign}₦${Number(t.amount).toLocaleString()} | ${label}${creditTag} | ${date}\n`;
        });
        contextBlock += '=== END DATA ===';
      }
    } else {
      contextBlock = '\n\n=== LIVE BUSINESS DATA ===\nNo transactions recorded yet.\n=== END DATA ===';
    }

    // ── Inject context into the last user message ──────────────────────────
    const enrichedMessages = Array.isArray(messages) ? [...messages] : [];
    if (enrichedMessages.length > 0) {
      const last = enrichedMessages[enrichedMessages.length - 1];
      if (last.role === 'user') {
        enrichedMessages[enrichedMessages.length - 1] = {
          ...last,
          content: `${last.content}${contextBlock}`,
        };
      }
    }

    console.log(`[ai-chat] calling OnSpace AI with ${enrichedMessages.length} messages, ${context?.length || 0} transactions`);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...enrichedMessages,
        ],
        max_tokens: 600,
        temperature: 0.75,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[ai-chat] AI API responded ${aiResponse.status}:`, errText);
      throw new Error(`AI API error: ${aiResponse.status} — ${errText.slice(0, 200)}`);
    }

    const data = await aiResponse.json();
    const message = data.choices?.[0]?.message?.content?.trim()
      ?? 'E be like say something go wrong. Abeg try again!';

    console.log(`[ai-chat] success, response length: ${message.length}`);

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ai-chat] error:', errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
