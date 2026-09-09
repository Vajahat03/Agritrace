'use client';

import { FormEvent, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { DashboardLayout } from './DashboardLayout';
import { Bot, CalendarClock, CheckCircle2, ImagePlus, Loader2, MessageSquare, Send, Sparkles, TrendingUp, Upload, XCircle } from 'lucide-react';

type Portal = 'farmer' | 'vendor' | 'customer';

type AgentResult = { title: string; data: Record<string, unknown> } | null;

function ResultCard({ result }: { result: AgentResult }) {
  if (!result) return null;
  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-4 w-4" />{result.title}</div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(result.data).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 8).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-white/80 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{key.replaceAll('_', ' ')}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-800">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AgentCard({ icon: Icon, title, description, status, children }: { icon: typeof Bot; title: string; description: string; status: 'Connected' | 'Pending'; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><Icon className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{description}</p></div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${status === 'Connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{status}</span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AIAgentsDashboard({ portal }: { portal: Portal }) {
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [produceType, setProduceType] = useState('tomato');
  const [shelfLifeDays, setShelfLifeDays] = useState('1');
  const [question, setQuestion] = useState('');

  const run = async (agent: string, request: () => Promise<any>, title: string) => {
    setRunning(agent); setError(null); setResult(null);
    try {
      const response = await request();
      const payload = response?.data || response;
      setResult({ title, data: payload && typeof payload === 'object' ? payload : { result: payload } });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'The agent could not complete this request.');
    } finally { setRunning(null); }
  };

  const readImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const runAssistant = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    void run('assistant', () => apiClient.post('/ai/rag/query', { query: question, cropType: produceType, language: 'en' }), 'Agricultural assistant response');
  };

  return (
    <DashboardLayout portal={portal} title="AI Agents" subtitle="Practical intelligence for produce, shelf life, markets, and farm decisions.">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3"><Bot className="mt-0.5 h-6 w-6 text-emerald-700" /><div><h2 className="font-semibold text-emerald-950">AgriTrace AI workspace</h2><p className="mt-1 text-sm text-emerald-800">Run the connected agents below. Results are returned from the configured AgriTrace API; unavailable services are clearly reported.</p></div></div>
      </div>

      {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span className="flex items-center gap-2"><XCircle className="h-4 w-4" />{error}</span><button onClick={() => setError(null)} className="font-semibold">Dismiss</button></div>}
      {running && <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Running {running} agent...</div>}

      <div className="grid gap-5 lg:grid-cols-2">
        <AgentCard icon={ImagePlus} title="Freshness Detection" description="Analyze a produce image for quality, freshness, defects, and a visual recommendation." status="Connected">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-800 hover:bg-emerald-100"><Upload className="h-4 w-4" />{imageUrl ? 'Replace image' : 'Upload produce image'}<input type="file" accept="image/*" className="sr-only" onChange={(event) => event.target.files?.[0] && readImage(event.target.files[0])} /></label>
          {imageUrl && <img src={imageUrl} alt="Selected produce" className="mt-3 h-32 w-full rounded-xl object-cover" />}
          <button disabled={!imageUrl || !!running} onClick={() => void run('freshness', () => apiClient.post('/ai/vision/analyze', { imageUrl }), 'Freshness analysis')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{running === 'freshness' && <Loader2 className="h-4 w-4 animate-spin" />}Analyze produce</button>
          {result?.title === 'Freshness analysis' && <ResultCard result={result} />}
        </AgentCard>

        <AgentCard icon={CalendarClock} title="Shelf-Life Prediction" description="Estimate remaining commercial shelf life from produce condition and storage inputs." status="Connected">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-600">Produce<select value={produceType} onChange={(event) => setProduceType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"><option>tomato</option><option>apple</option><option>banana</option><option>onion</option><option>potato</option></select></label><label className="text-sm text-slate-600">Storage days<input type="number" min="0" value={shelfLifeDays} onChange={(event) => setShelfLifeDays(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label></div>
          <button disabled={!!running} onClick={() => void run('shelf-life', () => apiClient.post('/ai/shelflife/predict', { produceType, currentFreshnessScore: 75, qualityScore: 75, storageCondition: 'ambient', storageDays: Number(shelfLifeDays) }), 'Shelf-life prediction')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">{running === 'shelf-life' && <Loader2 className="h-4 w-4 animate-spin" />}Predict shelf life</button>
          {result?.title === 'Shelf-life prediction' && <ResultCard result={result} />}
        </AgentCard>

        <AgentCard icon={TrendingUp} title="Price Prediction" description="Request a market forecast through the existing price intelligence API." status="Connected">
          <p className="text-sm text-slate-600">Use the market and commodity inputs from the marketplace workflow to request a forecast.</p><button disabled={!!running} onClick={() => void run('price', () => apiClient.post('/ai/price/predict', { commodity: produceType, marketLocation: 'Nashik APMC', state: 'Maharashtra', forecastHorizonDays: 1 }), 'Market price prediction')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:border-slate-300 disabled:text-slate-400">{running === 'price' && <Loader2 className="h-4 w-4 animate-spin" />}Request market forecast</button>
          {result?.title === 'Market price prediction' && <ResultCard result={result} />}
        </AgentCard>

        <AgentCard icon={MessageSquare} title="Agricultural Assistant" description="Ask an agriculture question and receive an answer with the configured knowledge sources." status="Connected">
          <form onSubmit={runAssistant} className="space-y-3"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about crop care, storage, or post-harvest handling..." rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><button disabled={!question.trim() || !!running} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">{running === 'assistant' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Ask assistant</button></form>
          {result?.title === 'Agricultural assistant response' && <ResultCard result={result} />}
        </AgentCard>
      </div>
    </DashboardLayout>
  );
}
