import { PhraseList } from '../components/PhraseCards';

export default function Phrases() {
  return (
    <div className="page page--narrow">
      <div className="topbar">
        <h1><span lang="zh-CN" data-no-translate>中文</span> Phrases</h1>

      </div>
      <p className="small muted">Tap a card: full-screen Chinese to show, Pinyin to read aloud. ★ keeps your favourites on top. Works offline.</p>
      <PhraseList />
    </div>
  );
}
