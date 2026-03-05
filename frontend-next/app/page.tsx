"use client";

import { useEffect, useMemo, useState } from "react";

type Workflow = {
  workflow_id: string;
  query: string;
  status: string;
  created_at: string;
  tool_calls: { name: string }[];
};

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "dev-api-key";

export default function Dashboard() {
  const [rows, setRows] = useState<Workflow[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${API}/v1/research/workflows?limit=25`, { headers: { "x-api-key": API_KEY } });
      if (res.ok) setRows(await res.json());
    };
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      completed: rows.filter((x) => x.status === "completed").length,
      toolCalls: rows.reduce((acc, w) => acc + w.tool_calls.length, 0),
    };
  }, [rows]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Enterprise Multi-Agent Ops Dashboard</h1>
      <p>Real-time workflow telemetry + execution trace.</p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <Card label="Workflows" value={String(stats.total)} />
        <Card label="Completed" value={String(stats.completed)} />
        <Card label="Tool Calls" value={String(stats.toolCalls)} />
      </section>
      <table width="100%" cellPadding={10} style={{ background: "#111831", borderRadius: 8 }}>
        <thead><tr><th align="left">ID</th><th align="left">Query</th><th>Status</th><th>Created</th><th>Tools</th></tr></thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.workflow_id}><td>{w.workflow_id}</td><td>{w.query}</td><td>{w.status}</td><td>{new Date(w.created_at).toLocaleString()}</td><td>{w.tool_calls.map(t => t.name).join(", ")}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div style={{ background: "#111831", border: "1px solid #1f2b52", borderRadius: 10, padding: 16 }}><div>{label}</div><strong style={{ fontSize: 28 }}>{value}</strong></div>;
}
