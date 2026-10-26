import { useSearchParams } from 'react-router-dom';
import { PitchView } from '../components/PitchView';
import { TranslateButton } from '../components/Translate';
import type { ProjectId } from '../types/models';

export default function Pitch() {
  const [params] = useSearchParams();
  return (
    <div className="page page--narrow">
      <div className="topbar"><h1>Pitch</h1><TranslateButton /></div>
      <p className="small muted">Eine Stimme, ein Satz: erst der Opener, dann der passende Pitch zum Stand. „Teleprompter“ zeigt den Text groß.</p>
      <PitchView initialTag={(params.get('tag') as ProjectId | null) ?? null} />
    </div>
  );
}
