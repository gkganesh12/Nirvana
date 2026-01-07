'use client';

import { useEffect, useState } from 'react';
import { 
  GitMerge, 
  Trash2, 
  RefreshCw,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface CorrelationRule {
  id: string;
  sourceGroupKey: string;
  targetGroupKey: string;
  confidence: number;
  lastUpdatedAt: string;
  sourceAlert: {
    id: string;
    title: string;
    project: string;
    severity: string;
  } | null;
  targetAlert: {
    id: string;
    title: string;
    project: string;
    severity: string;
  } | null;
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-zinc-500',
};

export default function CorrelationRulesPage() {
  const [rules, setRules] = useState<CorrelationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0.5);

  async function fetchRules() {
    try {
      const res = await fetch(`/api/correlation-rules?minConfidence=${minConfidence}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, [minConfidence]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await fetch('/api/correlation-rules', { method: 'POST' });
      // Wait a bit for analysis to complete
      setTimeout(() => {
        fetchRules();
        setAnalyzing(false);
      }, 2000);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalyzing(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      await fetch('/api/correlation-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId }),
      });
      setRules(rules.filter(r => r.id !== ruleId));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-900/20';
    if (confidence >= 0.6) return 'bg-yellow-900/20';
    return 'bg-orange-900/20';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Correlation Rules</h1>
          <p className="text-zinc-400 mt-1">AI-detected patterns between alerts</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-900/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Correlation Rules</h1>
          <p className="text-zinc-400 mt-1">AI-detected patterns between alerts</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {analyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Confidence Filter */}
      <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 rounded-xl p-4">
        <span className="text-sm text-zinc-400">Min Confidence:</span>
        <div className="flex gap-2">
          {[0.5, 0.6, 0.7, 0.8].map((conf) => (
            <button
              key={conf}
              onClick={() => setMinConfidence(conf)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                minConfidence === conf
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {Math.round(conf * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-12 text-center">
          <GitMerge className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No correlation rules found</h3>
          <p className="text-zinc-500 mb-4">
            Run analysis to detect patterns between your alerts
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Run Analysis
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:border-red-900/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 flex-1">
                  {/* Source Alert */}
                  <div className="flex-1">
                    {rule.sourceAlert ? (
                      <a
                        href={`/dashboard/alerts/${rule.sourceAlert.id}`}
                        className="block group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${severityColors[rule.sourceAlert.severity] || 'bg-zinc-500'}`}></div>
                          <span className="text-xs text-zinc-500">{rule.sourceAlert.project}</span>
                        </div>
                        <p className="text-white group-hover:text-red-400 transition-colors line-clamp-1">
                          {rule.sourceAlert.title}
                        </p>
                      </a>
                    ) : (
                      <div>
                        <p className="text-zinc-500 text-sm">Unknown Alert</p>
                        <p className="text-zinc-600 text-xs font-mono">{rule.sourceGroupKey.slice(0, 20)}...</p>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="w-5 h-5 text-red-500" />
                    <span className={`text-xs font-medium ${getConfidenceColor(rule.confidence)}`}>
                      {Math.round(rule.confidence * 100)}%
                    </span>
                  </div>

                  {/* Target Alert */}
                  <div className="flex-1">
                    {rule.targetAlert ? (
                      <a
                        href={`/dashboard/alerts/${rule.targetAlert.id}`}
                        className="block group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${severityColors[rule.targetAlert.severity] || 'bg-zinc-500'}`}></div>
                          <span className="text-xs text-zinc-500">{rule.targetAlert.project}</span>
                        </div>
                        <p className="text-white group-hover:text-red-400 transition-colors line-clamp-1">
                          {rule.targetAlert.title}
                        </p>
                      </a>
                    ) : (
                      <div>
                        <p className="text-zinc-500 text-sm">Unknown Alert</p>
                        <p className="text-zinc-600 text-xs font-mono">{rule.targetGroupKey.slice(0, 20)}...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 ml-6">
                  <div className={`px-3 py-1 rounded-full ${getConfidenceBg(rule.confidence)}`}>
                    <span className={`text-sm font-medium ${getConfidenceColor(rule.confidence)}`}>
                      {rule.confidence >= 0.8 ? 'High' : rule.confidence >= 0.6 ? 'Medium' : 'Low'} Confidence
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-white mb-1">How Correlation Works</h3>
            <p className="text-sm text-zinc-500">
              SignalCraft analyzes your alert history to find patterns. When Alert A frequently 
              occurs within 5 minutes of Alert B, a correlation rule is created. Higher confidence 
              means the pattern is more consistent. Use these rules to understand root causes and 
              reduce alert fatigue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
