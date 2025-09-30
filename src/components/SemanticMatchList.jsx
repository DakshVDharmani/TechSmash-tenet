import { useEffect, useState } from "react";
import { getGoalMatches } from "../hooks/useSemanticMatches";
import SemanticMatchCard from "./SemanticMatchCard";

export default function SemanticMatchList({ goalId }) {
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!goalId) return;
    getGoalMatches(goalId)
      .then(setMatches)
      .catch((e) => setError(e.message));
  }, [goalId]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!matches.length) return <p className="text-secondary">No matches yet</p>;

  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <SemanticMatchCard key={m.roadmap_id} match={m} />
      ))}
    </div>
  );
}
