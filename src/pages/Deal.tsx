import { useBigText, usePhraseShow } from '../components/PhraseCards';
import { TranslateButton } from '../components/Translate';
import { DEAL_RULES, EU_DUTIES, GLOSSARY, MONEY_SAVERS, RED_FLAG_CHECK } from '../constants/guide';
import { RED_FLAGS, STAND_STEPS } from '../constants/stand';

export default function Deal() {
  const phrase = usePhraseShow();
  const big = useBigText();
  return (
    <div className="page page--narrow">
      <div className="topbar"><h1>Deal helper</h1><TranslateButton /></div>
      <p className="deal-motto">Nichts unterschreiben, nichts bezahlen am Stand.</p>

      <section className="card stack">
        <h3>1 · Gesprächs-Reihenfolge</h3>
        <ol className="deal-steps">
          {STAND_STEPS.map((s) => (
            <li key={s.id}>
              <button type="button" className="deal-step" onClick={() => phrase.open(s.phraseId)}>
                <span className="deal-step__n">{s.n}</span>
                <span className="grow"><strong>{s.title}</strong><span className="small muted deal-step__hint">{s.hint}</span></span>
                <span lang="zh-CN" data-no-translate className="deal-step__zh">中文</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="small muted">Tippen zeigt die passende chinesische Frage im Vollbild.</p>
      </section>

      <section className="card stack">
        <h3>2 · Sätze, die Geld sparen</h3>
        <div className="stack">
          {MONEY_SAVERS.map((t, i) => (
            <button key={t} type="button" className="quote-btn" onClick={() => big.open(MONEY_SAVERS, i)}>“{t}”</button>
          ))}
        </div>
        <p className="small muted">Tippen = groß anzeigen. Wischen für den nächsten Satz.</p>
      </section>

      <section className="card stack">
        <h3>3 · Regeln</h3>
        <ul className="plain-list">{DEAL_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <section className="card stack">
        <h3>🚩 Red Flags</h3>
        <ul className="plain-list">{RED_FLAGS.map((f) => <li key={f.id}>{f.label}</li>)}</ul>
        <p className="hint-box small">{RED_FLAG_CHECK} Im Lead lassen sich Red Flags abhaken, dann erscheint eine Warnung.</p>
      </section>

      <section className="card stack">
        <h3>Glossar</h3>
        <dl className="glossary">
          {GLOSSARY.map((g) => (<div key={g.term}><dt>{g.term}</dt><dd>{g.de}</dd></div>))}
        </dl>
      </section>

      <section className="card stack">
        <h3>Bevor du Elektronik in DE verkaufst</h3>
        <ul className="plain-list">{EU_DUTIES.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
      {phrase.node}
      {big.node}
    </div>
  );
}
