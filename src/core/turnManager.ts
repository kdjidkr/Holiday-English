import { turnHeuristics } from './turnHeuristics';
import { AvatarExpression } from '../scenarios/types';
export interface TurnManagerCallbacks { onExpressionChange: (expression: AvatarExpression) => void; onCommitTurn: (text: string, rescue: boolean) => void; }
export class TurnManager {
  private transcript = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private revision = 0;
  constructor(private callbacks: TurnManagerCallbacks) {}
  handleSpeechStart() { this.cancel(); this.callbacks.onExpressionChange('LISTENING'); }
  handleTranscriptUpdate(text: string) { this.transcript = text; this.cancel(); }
  // Start silence only after recognition stops detecting speech, not on every interim chunk.
  handleSpeechEnd() {
    this.cancel();
    const revision = this.revision;
    const tick = async (elapsed: number) => {
      if (revision !== this.revision) return;
      const complete = elapsed <= 1000 && await turnHeuristics.isSentenceComplete(this.transcript);
      if (revision !== this.revision) return;
      if (complete || elapsed >= 4000) { this.commit(elapsed >= 4000); return; }
      this.timer = setTimeout(() => { void tick(elapsed + 500); }, 500);
    };
    this.timer = setTimeout(() => { void tick(500); }, 500);
  }
  private commit(rescue: boolean) { const text = this.transcript; this.reset(); this.callbacks.onCommitTurn(text, rescue); }
  private cancel() { this.revision++; if (this.timer) clearTimeout(this.timer); this.timer = null; }
  reset() { this.cancel(); this.transcript = ''; }
}
