import { Icon } from './Icon';

export function Bridge() {
  const steps = [
    { icon: 'Cpu', title: 'Measure', body: 'An async OpenCV/SciPy worker scores each image once at upload: FFT high-frequency energy, 256-bin Shannon entropy, and Canny edge ratio.' },
    { icon: 'Gauge', title: 'Score', body: 'The three signals fold into one Sensory Loading Score: 0.40·SF + 0.35·CE + 0.25·ED. It ships as a single field on the pin payload.' },
    { icon: 'Layers', title: 'Pace', body: 'At ranking time the middleware reads the score and places a rest break after any pin above the trigger. Ranking and creative are untouched.' },
    { icon: 'TrendingUp', title: 'Recover', body: 'Fewer sessions end in overload. Every six pins a user would have lost to overload is another ad window, and only those count toward revenue.' },
  ];
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5 grid gap-4" aria-label="How SPIS links neuro-data to retention">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">Executive note</div>
          <h2 className="font-display text-[22px] font-bold mt-1">From pixel statistics to retention revenue</h2>
        </div>
        <p className="text-[12.5px] text-muted max-w-[520px] leading-relaxed">
          Users with sensory gating difficulties can’t filter out repeated intense stimuli, so dense feeds compound into overload and they leave.
          SPIS turns that clinical mechanism into one ranking-time number your feed already knows how to act on.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-xl bg-surface2/60 p-3.5 grid gap-1.5 content-start">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted">Step {i + 1}</span>
              <Icon name={s.icon} size={15} className="text-accent" />
              <span className="font-display text-[15px] font-bold">{s.title}</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="font-mono text-[10.5px] text-muted">
        Independent concept prototype. Not affiliated with or endorsed by Pinterest, Inc.; platform and system names are used only as examples.
      </p>
      <p className="font-mono text-[10.5px] text-muted">
        Prototype disclosure: worker outputs, the fatigue model and all KPIs are simulated from a seeded queue so the demo is repeatable. Pin artwork is generated on the fly, and its visual noise is driven by each pin’s own scores.
      </p>
    </section>
  );
}
