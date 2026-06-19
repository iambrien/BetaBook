import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are BetaBook AI, the smart business assistant for Nigerian market traders. 

Your personality:
- Warm, friendly and professional
- You speak simple English mixed with Nigerian Pidgin expressions naturally
- You are encouraging and positive about business
- You give practical, actionable advice

Your capabilities:
- Analyze transaction data provided to you in context
- Answer questions about income, expenses, debts, and profit
- Provide business insights and advice tailored to Nigerian market traders
- Help users understand their financial position

When given transaction data:
- Calculate totals, identify patterns, and give specific answers
- Reference specific customer names, amounts, and dates when relevant
- Always use ₦ for Nigerian Naira amounts
- Use expressions like "Oga", "e don happen", "e no go reach", "make you" naturally but not excessively

For debt-related questions about specific people:
- Search the provided transactions for credit entries matching the name
- Give the exact amount owed with the item and date
- Example: "Yes o! Mama Nkechi still dey owe you ₦15,000 for that Ankara fabric she collected on 12th June."

For financial summaries:
- Calculate totals from the provided transactions
- Separate income from expenses clearly
- Show profit/loss status

Always be helpful and make the trader feel supported in managing their business.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, context, businessId } = await req.json();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('AI service not configured');
    }

    // Build context message from transactions
    let contextMessage = '';
    if (context && context.length > 0) {
      const filtered = businessId
        ? context.filter((t: { business_id: string }) => t.business_id === businessId)
        : context;

      const income = filtered.filter((t: { type: string }) => t.type === 'income');
      const expenses = filtered.filter((t: { type: string }) => t.type === 'expense');
      const debts = income.filter((t: { payment_status: string }) => t.payment_status === 'credit');

      const totalIncome = income.reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
      const totalExpense = expenses.reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);

      contextMessage = `\n\n--- LIVE BUSINESS DATA ---\n`;
      contextMessage += `Total Income: ₦${totalIncome.toLocaleString()}\n`;
      contextMessage += `Total Expenses: ₦${totalExpense.toLocaleString()}\n`;
      contextMessage += `Net Profit/Loss: ₦${(totalIncome - totalExpense).toLocaleString()}\n\n`;

      if (debts.length > 0) {
        contextMessage += `OUTSTANDING DEBTS (${debts.length}):\n`;
        debts.forEach((d: { customer_name?: string; amount: number; item_name?: string; created_at: string }) => {
          contextMessage += `- ${d.customer_name || 'Unknown'}: ₦${Number(d.amount).toLocaleString()} for ${d.item_name || 'goods'} (${new Date(d.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })})\n`;
        });
        contextMessage += '\n';
      }

      if (filtered.length > 0) {
        contextMessage += `RECENT TRANSACTIONS (last ${Math.min(filtered.length, 15)}):\n`;
        filtered.slice(0, 15).forEach((t: { type: string; amount: number; item_name?: string; category?: string; customer_name?: string; payment_status?: string; created_at: string }) => {
          const date = new Date(t.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
          const label = t.item_name || t.category || (t.type === 'income' ? 'Income' : 'Expense');
          const credit = t.payment_status === 'credit' ? ` [CREDIT - ${t.customer_name}]` : '';
          contextMessage += `- ${t.type === 'income' ? '+' : '-'}₦${Number(t.amount).toLocaleString()} | ${label}${credit} | ${date}\n`;
        });
      }
      contextMessage += '--- END DATA ---';
    }

    // Inject context into the last user message
    const enrichedMessages = [...messages];
    if (contextMessage && enrichedMessages.length > 0) {
      const last = enrichedMessages[enrichedMessages.length - 1];
      if (last.role === 'user') {
        enrichedMessages[enrichedMessages.length - 1] = {
          ...last,
          content: last.content + contextMessage,
        };
      }
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
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
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content ?? 'E be like say I no hear you well. Try again!';

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('AI chat error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
