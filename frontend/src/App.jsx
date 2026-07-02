import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = "https://system-monitor-2wml.onrender.com";

export default function App() {
  const [systems, setSystems] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, idle: 0 });
  const [settings, setSettings] = useState({
    idle_timeout: 30,
    heartbeat_interval: 5000,
  });
  const [activityHistory, setActivityHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveStatus, setLiveStatus] = useState("online");
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Settings panel state ──────────────────────
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const panelRef = useRef(null);

const fetchData = useCallback(async () => {
  try {
    const [systemsRes, settingsRes, historyRes] = await Promise.all([
      axios.get(`${API_BASE}/systems`),
      axios.get(`${API_BASE}/settings`),
      axios.get(`${API_BASE}/activity-log`),
    ]);

    const systemsData = systemsRes.data;

    console.log("====================================");
    console.log("Fetched at:", new Date().toLocaleTimeString());
    console.log("Systems:", systemsData);

    setSystems(systemsData);

    const total = systemsData.length;
    const active = systemsData.filter(
      (s) => s.status.toLowerCase() === "active"
    ).length;
    const idle = total - active;

    setStats({ total, active, idle });

    setSettings(settingsRes.data);
    setActivityHistory(historyRes.data);
    setLastUpdated(new Date());
    setLiveStatus("online");
  } catch (err) {
    console.error("fetchData error:", err);
    setLiveStatus("offline");
  }
}, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, settings.heartbeat_interval || 30000);
    return () => clearInterval(interval);
  }, [fetchData, settings.heartbeat_interval]);

  const saveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await axios.put(`${API_BASE}/settings`, settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("saveSettings error:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Close panel on ESC or outside click ──────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSettingsPanelOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOverlayClick = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      setSettingsPanelOpen(false);
    }
  };

  const filteredSystems = systems.filter(
    (s) =>
      s.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ip_address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="app">
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-icon">🖥</span>
          <span className="navbar-title">SysWatch</span>
        </div>
        <div className="navbar-meta">
          <div className={`live-indicator ${liveStatus}`}>
            <span className="live-dot" />
            <span className="live-label">
              {liveStatus === "online" ? "Live" : "Offline"}
            </span>
          </div>
          <div className="last-updated">
            <span className="last-updated-label">Updated</span>
            <span className="last-updated-time">{formatTime(lastUpdated)}</span>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {/* ── STAT CARDS ── */}
        <section className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon-wrap">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Systems</div>
            </div>
            <div className="stat-trend">All</div>
          </div>

          <div className="stat-card stat-active">
            <div className="stat-icon-wrap">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Active Systems</div>
            </div>
            <div className="stat-trend active-pct">
              {stats.total
                ? Math.round((stats.active / stats.total) * 100)
                : 0}
              %
            </div>
          </div>

          <div className="stat-card stat-idle">
            <div className="stat-icon-wrap">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="stat-body">
              <div className="stat-value">{stats.idle}</div>
              <div className="stat-label">Idle Systems</div>
            </div>
            <div className="stat-trend idle-pct">
              {stats.total
                ? Math.round((stats.idle / stats.total) * 100)
                : 0}
              %
            </div>
          </div>
        </section>

        {/* ── MAIN GRID (systems only — settings card removed) ── */}
        <div className="content-grid content-grid--full">
          {/* ── CURRENT SYSTEMS CARD ── */}
          <section className="card systems-card">
            <div className="card-header">
              <div className="card-title-row">
                <span className="card-icon">🖥️</span>
                <h2 className="card-title">Current Systems</h2>
                <span className="card-badge">{filteredSystems.length}</span>
              </div>
              <div className="search-wrap">
                <svg
                  className="search-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search hostname or IP…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="search-clear"
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hostname</th>
                    <th>IP Address</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSystems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-row">
                        <span className="empty-icon">🔍</span>
                        No systems match your search
                      </td>
                    </tr>
                  ) : (
                    filteredSystems.map((system) => (
                      <tr
                        key={system.id || system.hostname}
                        className="data-row"
                      >
                        <td>
                          <div className="cell-primary">
                            <span className="cell-icon host-icon">
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <path d="M8 21h8M12 17v4" />
                              </svg>
                            </span>
                            {system.hostname}
                          </div>
                        </td>
                        <td>
                          <div className="cell-primary">
                            <span className="cell-icon ip-icon">
                              <svg
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                              </svg>
                            </span>
                            <span className="ip-text">{system.ip_address}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${system.status}`}>
                            <span className="status-dot" />
                            {system.status.toLowerCase() === "active"
                              ? "Active"
                              : "Idle"}
                          </span>
                        </td>
                        <td>
                          <span className="timestamp">
                            {formatDateTime(system.last_seen)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ── ACTIVITY HISTORY ── */}
        <section className="card history-card">
          <div className="card-header">
            <div className="card-title-row">
              <span className="card-icon">📋</span>
              <h2 className="card-title">Activity History</h2>
              <span className="card-badge">{activityHistory.length}</span>
            </div>
            <p className="card-subtitle">
              Recent session events across all monitored endpoints
            </p>
          </div>

          <div className="table-wrap">
            <table className="data-table history-table">
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activityHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      <span className="empty-icon">📭</span>
                      No activity recorded yet
                    </td>
                  </tr>
                ) : (
                  activityHistory.map((entry, i) => (
                    <tr key={entry.id || i} className="data-row">
                      <td>
                        <div className="cell-primary">
                          <span className="cell-icon host-icon">
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <rect x="2" y="3" width="20" height="14" rx="2" />
                              <path d="M8 21h8M12 17v4" />
                            </svg>
                          </span>
                          {entry.hostname}
                        </div>
                      </td>
                      <td>
                        <span className="timestamp">
                          {formatDateTime(entry.start_time)}
                        </span>
                      </td>
                      <td>
                        <span className="timestamp">
                          {entry.end_time ? (
                            formatDateTime(entry.end_time)
                          ) : (
                            <span className="ongoing">Ongoing</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="duration-badge">
                          {formatDuration(entry.duration_seconds)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${entry.status}`}>
                          <span className="status-dot" />
                          {entry.status.toLowerCase() === "active"
                            ? "Active"
                            : "Idle"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════
          FLOATING SETTINGS BUTTON
      ══════════════════════════════════════════ */}
      <button
        className="settings-fab"
        onClick={() => setSettingsPanelOpen(true)}
        aria-label="Open agent configuration"
        title="Agent Configuration"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* ══════════════════════════════════════════
          SETTINGS SLIDE PANEL + OVERLAY
      ══════════════════════════════════════════ */}
      {/* Overlay */}
      <div
        className={`settings-overlay ${settingsPanelOpen ? "settings-overlay--visible" : ""}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className={`settings-panel ${settingsPanelOpen ? "settings-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Agent Configuration"
      >
        {/* Panel header */}
        <div className="sp-header">
          <div className="sp-title-row">
            <div className="sp-icon-wrap">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h2 className="sp-title">Agent Configuration</h2>
              <p className="sp-subtitle">Monitoring thresholds &amp; polling</p>
            </div>
          </div>
          <button
            className="sp-close"
            onClick={() => setSettingsPanelOpen(false)}
            aria-label="Close settings"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="sp-divider" />

        {/* Panel body */}
        <div className="sp-body">
          {/* Idle Timeout */}
          <div className="field-group">
            <label className="field-label" htmlFor="sp-idleTimeout">
              Idle Timeout
              <span className="field-unit">minutes</span>
            </label>
            <div className="input-wrap">
              <input
                id="sp-idleTimeout"
                className="field-input"
                type="number"
                min="1"
                value={Math.round(settings.idle_timeout / 60)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    idle_timeout: Number(e.target.value) * 60,
                  }))
                }
              />
              <span className="input-suffix">min</span>
            </div>
            <p className="field-hint">Time before a system is marked idle</p>
          </div>

          {/* Heartbeat Interval */}
          <div className="field-group">
            <label className="field-label" htmlFor="sp-heartbeat_interval">
              Heartbeat Interval
              <span className="field-unit">seconds</span>
            </label>
            <div className="input-wrap">
              <input
                id="sp-heartbeat_interval"
                className="field-input"
                type="number"
                min="1"
                value={Math.round(settings.heartbeat_interval / 1000)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    heartbeat_interval: Number(e.target.value) * 1000,
                  }))
                }
              />
              <span className="input-suffix">sec</span>
            </div>
            <p className="field-hint">How often agents send a heartbeat ping</p>
          </div>
        </div>

        {/* Panel footer */}
        <div className="sp-footer">
          <button
            className={`save-btn ${savingSettings ? "saving" : ""} ${saveSuccess ? "saved" : ""}`}
            onClick={saveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? (
              <>
                <span className="btn-spinner" />
                Saving…
              </>
            ) : saveSuccess ? (
              <>
                <span className="btn-check">✓</span>
                Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}