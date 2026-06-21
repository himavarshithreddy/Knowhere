import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, Target, Brain, Sparkles, AlertCircle, ArrowUp, ArrowDown, Minus } from "lucide-react";

export type IntelligenceData = {
  summary: string;
  keyMetrics: { label: string; value: string; trend: string; trendDirection: "up" | "down" | "flat"; color: "green" | "red" | "yellow" | "blue" }[];
  trends: { title: string; description: string; iconName: string }[];
  anomalies: { description: string; severity: "low" | "medium" | "high" }[];
  forecasts: { prediction: string; timeframe: string }[];
  actionableAdvice: { action: string; reason: string }[];
};

type Props = {
  data: IntelligenceData;
};

const IconMap: Record<string, React.ElementType> = {
  Activity, TrendingUp, TrendingDown, Target, Brain, Sparkles, AlertCircle
};

export function IntelligencePanel({ data }: Props) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const getColor = (color: string) => {
    switch (color) {
      case "green": return "var(--success)";
      case "red": return "var(--danger)";
      case "yellow": return "#eab308";
      case "blue": return "var(--accent)";
      default: return "var(--text)";
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "24px" }}>
      
      {/* AI Summary Header */}
      <motion.div variants={item} className="intelligence-summary-card">
        <div style={{ padding: "12px", background: "rgba(168, 85, 247, 0.2)", borderRadius: "12px", color: "#c084fc" }}>
          <Brain size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 8px 0", color: "var(--text)" }}>System Intelligence</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "15px", lineHeight: 1.5 }}>{data.summary}</p>
        </div>
      </motion.div>

      {/* Key Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {data.keyMetrics.map((metric, i) => (
          <motion.div key={i} variants={item} style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted)" }}>{metric.label}</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px" }}>{metric.value}</span>
              <span style={{ 
                fontSize: "13px", 
                fontWeight: 600, 
                color: getColor(metric.color),
                display: "flex",
                alignItems: "center",
                gap: "2px",
                background: `\${getColor(metric.color)}15`,
                padding: "2px 8px",
                borderRadius: "12px"
              }}>
                {metric.trendDirection === "up" && <ArrowUp size={14} />}
                {metric.trendDirection === "down" && <ArrowDown size={14} />}
                {metric.trendDirection === "flat" && <Minus size={14} />}
                {metric.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="intelligence-grid">
        
        {/* Left Column: Trends & Actionable Advice */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Actionable Advice */}
          {data.actionableAdvice && data.actionableAdvice.length > 0 && (
            <motion.div variants={item} style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "24px"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <Target size={18} color="var(--accent)" /> Recommended Actions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {data.actionableAdvice.map((advice, i) => (
                  <div key={i} style={{ 
                    background: "var(--surface-2)", 
                    padding: "16px", 
                    borderRadius: "12px",
                    borderLeft: "3px solid var(--accent)"
                  }}>
                    <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--text)", marginBottom: "4px" }}>{advice.action}</div>
                    <div style={{ fontSize: "13px", color: "var(--muted)" }}>{advice.reason}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Trends */}
          {data.trends && data.trends.length > 0 && (
            <motion.div variants={item}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp size={18} color="var(--success)" /> Emerging Trends
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                {data.trends.map((trend, i) => {
                  const Icon = IconMap[trend.iconName] || Sparkles;
                  return (
                    <div key={i} style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: "16px",
                      padding: "20px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{ padding: "8px", background: "var(--surface-2)", borderRadius: "8px", color: "var(--text)" }}>
                          <Icon size={18} />
                        </div>
                        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>{trend.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)", lineHeight: 1.5 }}>{trend.description}</p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Anomalies & Forecasts */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Anomalies */}
          {data.anomalies && data.anomalies.length > 0 && (
            <motion.div variants={item} style={{
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "16px",
              padding: "24px"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px", color: "var(--danger)" }}>
                <AlertCircle size={18} /> Anomalies
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {data.anomalies.map((anomaly, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ 
                      width: "8px", height: "8px", borderRadius: "50%", marginTop: "6px", flexShrink: 0,
                      background: anomaly.severity === "high" ? "var(--danger)" : anomaly.severity === "medium" ? "#eab308" : "var(--text-muted)"
                    }} />
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--text)", lineHeight: 1.5 }}>
                      {anomaly.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Forecasts */}
          {data.forecasts && data.forecasts.length > 0 && (
            <motion.div variants={item} style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "24px"
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px", color: "var(--accent)" }}>
                <Activity size={18} /> Forecasts
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {data.forecasts.map((forecast, i) => (
                  <div key={i}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                      {forecast.timeframe}
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--text)", lineHeight: 1.5 }}>
                      {forecast.prediction}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
