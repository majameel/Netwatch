/* src/components/NetworkMonitor.jsx */
import React, { useState, useEffect } from "react";
import pingService from "../api/pingService";

export default function NetworkMonitor() {
  const [targets, setTargets] = useState([]);
  const [input, setInput] = useState("");
  const [results, setResults] = useState({}); // { ip: { alive, time, loss } }

  // Poll every 5 s
  useEffect(() => {
    const id = setInterval(() => {
      targets.forEach(async (ip) => {
        const data = await pingService.ping(ip);
        setResults((prev) => ({ ...prev, [ip]: data }));
      });
    }, 5000);
    return () => clearInterval(id);
  }, [targets]);

  const addTarget = () => {
    if (input && !targets.includes(input)) {
      setTargets([...targets, input]);
      setInput("");
    }
  };

  return (
    <div className="container">
      <h2>NetPulse Network Monitor</h2>

      <div className="add-target">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter IP or domain"
        />
        <button onClick={addTarget}>Add</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Target</th>
            <th>Status</th>
            <th>Latency (ms)</th>
            <th>Packet Loss (%)</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((ip) => {
            const r = results[ip] || {};
            return (
              <tr key={ip}>
                <td>{ip}</td>
                <td style={{ color: r.alive ? "green" : "red" }}>
                  {r.alive ? "Online" : "Offline"}
                </td>
                <td>{r.time ?? "-"}</td>
                <td>{r.packetLoss ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
