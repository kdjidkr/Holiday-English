// Local turn heuristic. This is not an external evaluator or a grammar score.
export const turnHeuristics = {
  async isSentenceComplete(text: string): Promise<boolean> {
    const line = text.trim();
    if (!line || /\b(because|and|but|or|to|for|with|in|at|when|if|i am|i was)\s*$/i.test(line)) return false;
    return /[.!?]$/.test(line) || /^(yes|no|yep|nope|cheers|thanks|good thanks|no worries|g'day)[.!?]*$/i.test(line) || line.split(/\s+/).length >= 4;
  },
};
