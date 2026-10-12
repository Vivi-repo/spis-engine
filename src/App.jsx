import { useState, useRef, useMemo, useCallback } from 'react';
import { Icon } from './components/Icon';
import { Blueprint } from './components/Blueprint';
import { Bridge } from './components/Bridge';
import { ControlPanel } from './components/ControlPanel';
import { FatigueMeter } from './components/FatigueMeter';
import { Feed } from './components/Feed';
import { InspectCtx } from './components/InspectCtx';
import { MindMap } from './components/MindMap';
import { InspectorModal } from './components/PayloadInspector';
import { START_F, breakStep, contentStep, projectKpis } from './lib/fatigue';
import { SEED_TRACES, sampleTrace } from './lib/infra';
import { buildPacedList, getItem } from './lib/queue';

export const freshSession = () => ({ f: START_F, streak: 0, n: 0, breaks: 0, terminated: false, last: null, trace: [START_F], path: [] });

export function App() {
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const [threshold, setThreshold] = useState(65);
  const [breaksOn, setBreaksOn] = useState(true);
  const [flashOn, setFlashOn] = useState(!reduced);
  const [active, setActive] = useState(null);
  const [autoplay, setAutoplay] = useState(null);
  const [counts, setCounts] = useState({ standard: 16, paced: 16 });
  const [sessions, setSessions] = useState({ standard: freshSession(), paced: freshSession() });
  const [epoch, setEpoch] = useState(0);
  const [view, setView] = useState('feeds');
  const [outage, setOutage] = useState(false);
  const [infra, setInfra] = useState({ pinsB: 1, tier: 'ddbAttr' });
  const [traces, setTraces] = useState(SEED_TRACES);
  const [inspectIt, setInspectIt] = useState(null);
  const lastTraceAt = useRef(0);
  const pacing = breaksOn && !outage;
  const pushTrace = useCallback(down => setTraces(t => [...t.slice(-299), down ? { ...sampleTrace(), hydrate: null } : sampleTrace()]), []);
  const [assume, setAssume] = useState({ sessions: 20, eligible: 15, overload: 10, ecpm: 4.5, fill: 70 });
  const pacedRef = useRef(null);

  const stdList = useMemo(() => Array.from({ length: counts.standard }, (_, i) => getItem(i)), [counts.standard]);
  const pacedList = useMemo(() => buildPacedList(counts.paced, threshold, pacing), [counts.paced, threshold, pacing]);
  const kpi = useMemo(() => projectKpis(threshold, pacing), [threshold, pacing]);

  const onConsume = useCallback((feed, items) => {
    setSessions(prev => {
      const s = { ...prev[feed], trace: prev[feed].trace.slice(-119), path: prev[feed].path.slice(-399) };
      if (s.terminated) return prev;
      for (const it of items) {
        let d;
        if (it.isBreak) { d = breakStep(s); s.breaks += 1; }
        else d = contentStep(s, it.sls);
        s.trace.push(s.f); s.path.push(it);
        s.last = { d, isBreak: it.isBreak, title: it.title, sls: it.sls, streak: s.streak };
        if (s.f >= 100) { s.terminated = true; break; }
      }
      return { ...prev, [feed]: s };
    });
  }, []);
  const outageRef = useRef(outage); outageRef.current = outage;
  const onLoadMore = useCallback(feed => {
    const now = performance.now();
    if (now - lastTraceAt.current < 400) return;   // one page request at a time
    lastTraceAt.current = now;
    setCounts(c => (c[feed] >= 400 ? c : { ...c, [feed]: c[feed] + 10 }));
    pushTrace(feed === 'paced' ? outageRef.current : true);
  }, [pushTrace]);
  const onActivate = useCallback(feed => setActive(a => (a === feed ? a : feed)), []);
  const reset = () => {
    setSessions({ standard: freshSession(), paced: freshSession() });
    setCounts({ standard: 16, paced: 16 }); setAutoplay(null); setActive(null); setEpoch(e => e + 1);
  };
  const switchToPaced = () => { setView('feeds'); setActive('paced'); pacedRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); };

  return (
    <InspectCtx.Provider value={setInspectIt}>
    <div className="grid gap-4">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow flex items-center gap-1.5"><Icon name="Waves" size={13} />B2B feed middleware · interactive prototype</div>
          <h1 className="font-display text-[30px] sm:text-[36px] font-bold leading-[1.05] mt-1">SPIS Engine <span className="text-muted font-medium">Sensory-Paced Infinite Scroll</span></h1>
        </div>
        <p className="text-[13px] text-muted max-w-[460px] leading-relaxed">
          Same content queue, two feeds. Scroll the left one until the user quits, then scroll the right one and watch the meter settle.
          Click any pin to open its metrics.
        </p>
      </header>

      <FatigueMeter sessions={sessions} active={active} onReset={reset} />

      <nav className="flex items-center justify-between gap-3 flex-wrap" aria-label="Dashboard views">
        <div role="tablist" aria-label="Dashboard view" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {[['feeds', 'LayoutGrid', 'Split-Screen Feeds'], ['map', 'Orbit', 'Mind Map View'], ['arch', 'Network', 'Architecture Blueprint']].map(([k, ic, lbl]) => (
            <button key={k} type="button" role="tab" id={'tab-' + k} aria-selected={view === k} aria-controls={'panel-' + k} onClick={() => setView(k)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] ${view === k ? 'bg-accent text-white font-medium' : 'text-muted hover:text-ink'}`}>
              <Icon name={ic} size={14} />{lbl}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10.5px] text-muted">{view === 'map' ? 'Cognitive Resonance Map · creativity mapping' : view === 'arch' ? 'Zero-disruption integration · for systems review' : 'Live comparison · same content queue'}</span>
      </nav>

      <div className="grid gap-4 items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] lg:grid-cols-2">
        {view === 'map' && (
          <div id="panel-map" role="tabpanel" aria-labelledby="tab-map" className="lg:col-span-2 min-w-0">
            <MindMap sessions={sessions} threshold={threshold} breaksOn={pacing} reduced={reduced} />
          </div>
        )}
        {view === 'arch' && (
          <div id="panel-arch" role="tabpanel" aria-labelledby="tab-arch" className="lg:col-span-2 min-w-0">
            <Blueprint threshold={threshold} breaksOn={breaksOn} outage={outage} setOutage={setOutage} traces={traces} pushTrace={pushTrace}
              infra={infra} setInfra={setInfra} reduced={reduced} />
          </div>
        )}
        <div id="panel-feeds" role="tabpanel" aria-labelledby="tab-feeds" hidden={view !== 'feeds'} className="min-w-0 grid">
        <Feed key={'s' + epoch} feed="standard" list={stdList} active={active === 'standard'} session={sessions.standard}
          onConsume={onConsume} onLoadMore={onLoadMore} onActivate={onActivate} threshold={threshold} flashOn={flashOn && !reduced}
          autoplay={autoplay === 'standard'} setAutoplay={setAutoplay} onReset={reset} onSwitch={switchToPaced} />
        </div>
        <div ref={pacedRef} hidden={view !== 'feeds'} className="min-w-0 grid">
          <Feed key={'p' + epoch} feed="paced" list={pacedList} active={active === 'paced'} session={sessions.paced}
            onConsume={onConsume} onLoadMore={onLoadMore} onActivate={onActivate} threshold={threshold} flashOn={flashOn && !reduced}
            autoplay={autoplay === 'paced'} setAutoplay={setAutoplay} onReset={reset} onSwitch={switchToPaced} />
        </div>
        <div className="lg:col-span-2 xl:col-span-1 min-w-0">
          <ControlPanel threshold={threshold} setThreshold={setThreshold} breaksOn={breaksOn} setBreaksOn={setBreaksOn}
            flashOn={flashOn} setFlashOn={setFlashOn} kpi={kpi} assume={assume} setAssume={setAssume}
            traces={traces} infra={infra} setInfra={setInfra} outage={outage} />
        </div>
      </div>

      <Bridge />
      <InspectorModal it={inspectIt} onClose={() => setInspectIt(null)} threshold={threshold} outage={outage} />
    </div>
    </InspectCtx.Provider>
  );
}
