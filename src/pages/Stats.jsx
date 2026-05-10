import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, Upload, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSessions, deleteSession, exportData, importData } from '@/lib/localStorageManager';

export default function Stats() {
  const [sessions, setSessions] = useState([]);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nback-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importData(data);
      setSessions(getSessions());
    } catch (err) {
      setImportError('Failed to import data. Invalid file format.');
    }
  };

  const handleDelete = (sessionId) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    deleteSession(sessionId);
    setSessions(getSessions());
  };

  // Calculate stats
  const totalSessions = sessions.length;
  const avgAccuracy = totalSessions > 0 ? Math.round(sessions.reduce((s, x) => s + (x.accuracy || 0), 0) / totalSessions) : 0;
  const totalTrials = sessions.reduce((s, x) => s + (x.totalTrials || 0), 0);
  const highestAccuracy = totalSessions > 0 ? Math.max(...sessions.map(s => s.accuracy || 0)) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
         {/* Header */}
         <div className="flex items-center justify-between gap-3 mb-8">
           <div className="flex items-center gap-3">
             <BarChart3 className="w-8 h-8 text-primary" />
             <h1 className="text-3xl font-mono font-bold text-foreground">Progress & Stats</h1>
           </div>
           <Link to="/" className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground text-xs font-mono transition-colors">
             Dashboard
           </Link>
         </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Sessions', value: totalSessions, color: 'text-primary' },
            { label: 'Avg Accuracy', value: `${avgAccuracy}%`, color: 'text-emerald-400' },
            { label: 'Best Accuracy', value: `${highestAccuracy}%`, color: 'text-accent' },
            { label: 'Total Trials', value: totalTrials, color: 'text-chart-3' }
          ].map((stat, i) => (
            <div key={i} className="rounded-lg bg-secondary/40 border border-border p-3 text-center">
              <div className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs font-mono text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Export/Import Controls */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <Button onClick={handleExport} className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">
            <Download className="w-4 h-4" /> Export Data
          </Button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 cursor-pointer transition-colors font-mono text-sm">
            <Upload className="w-4 h-4" /> Import Data
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        {importError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 mb-6 text-red-400 text-sm font-mono">
            {importError}
          </div>
        )}

        {/* Sessions List */}
        <div>
          <h2 className="text-lg font-mono font-bold text-foreground mb-4">Sessions</h2>

          {sessions.length === 0 ? (
            <div className="rounded-lg bg-secondary/40 border border-border p-6 text-center">
              <p className="text-sm font-mono text-muted-foreground">No sessions yet. Start training!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessions.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-lg bg-secondary/40 border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="font-mono font-semibold text-foreground">
                      N={session.nLevel} · {(session.modes || []).join(', ') || 'Normal'}
                      {session.noobMode && ' · NOOB'}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {new Date(session.created_date).toLocaleDateString()} · {session.totalTrials} trials
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <div className={`text-lg font-mono font-bold ${session.accuracy >= 75 ? 'text-emerald-400' : session.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {session.accuracy}%
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/review/${session.id}`}>
                      <button className="w-8 h-8 rounded bg-secondary border border-border text-muted-foreground hover:text-primary transition-colors flex items-center justify-center" title="Review trials">
                        <Eye className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="w-8 h-8 rounded bg-secondary border border-border text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>


      </div>
    </motion.div>
  );
}