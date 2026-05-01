import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const DATA = [
  { id: 1, title: "Two Sum", difficulty: "Easy", tags: ["Array", "Hashmap"] },
  {
    id: 2,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["String", "Sliding Window"],
  },
  {
    id: 3,
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    tags: ["Binary Search"],
  },
  { id: 4, title: "Valid Parentheses", difficulty: "Easy", tags: ["Stack"] },
  { id: 5, title: "3Sum", difficulty: "Medium", tags: ["Array", "Two Pointers"] },
];

const DIFFS = ["All", "Easy", "Medium", "Hard"];

export default function Problems() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const diffColor = (d) =>
    d === "Easy"
      ? "text-emerald-400"
      : d === "Medium"
      ? "text-amber-400"
      : "text-rose-400";

  const filtered = useMemo(() => {
    return DATA.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery =
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      const matchesDiff = difficulty === "All" || p.difficulty === difficulty;
      const matchesFav = !showFavOnly || favorites.includes(p.id);
      return matchesQuery && matchesDiff && matchesFav;
    });
  }, [query, difficulty, showFavOnly, favorites]);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 md:px-10 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide">Problems</h1>
          <p className="text-slate-400 text-sm">
            Browse, filter, and start solving.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or tag..."
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Difficulty Chips */}
          <div className="flex items-center gap-2">
            {DIFFS.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  difficulty === d
                    ? "bg-blue-600 border-blue-600"
                    : "bg-slate-900 border-slate-700 hover:border-slate-500"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Favorites Filter */}
          <button
            onClick={() => setShowFavOnly((s) => !s)}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              showFavOnly
                ? "bg-yellow-500 text-black border-yellow-500"
                : "bg-slate-900 border-slate-700 hover:border-slate-500"
            }`}
            title="Show favorites only"
          >
            ⭐ Favorites
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {/* Head */}
        <div className="grid grid-cols-12 bg-slate-900 text-slate-400 text-xs uppercase tracking-wider px-4 py-3 sticky top-0">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Title</div>
          <div className="col-span-3">Tags</div>
          <div className="col-span-1">Diff</div>
          <div className="col-span-1 text-right">Fav</div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-400">
            No problems match your filters.
          </div>
        ) : (
          filtered.map((p, i) => (
            <div
                key={p.id}
                onClick={() => navigate(`/problem/${p.id}`)}
                className="grid grid-cols-12 items-center px-4 py-3 border-t border-slate-800 hover:bg-slate-900/60 transition cursor-pointer"
            >
              <div className="col-span-1 text-slate-400">{i + 1}</div>

              <div className="col-span-6">
                <div className="font-medium">{p.title}</div>
              </div>

              <div className="col-span-3 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className={`col-span-1 ${diffColor(p.difficulty)}`}>
                {p.difficulty}
              </div>

              <div className="col-span-1 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p.id);
                  }}
                  className="text-lg"
                  aria-label="toggle favorite"
                >
                  {favorites.includes(p.id) ? "⭐" : "☆"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}