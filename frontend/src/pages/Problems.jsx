import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Search, ArrowLeft } from "lucide-react";

export default function Problems() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchProblems = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      // Construct URL based on backend query params: search, difficulty
      let url = `http://localhost:5000/problems?`;
      if (query) url += `search=${query}&`;
      if (difficulty !== "All") url += `difficulty=${difficulty}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProblems(data);
    } catch (err) {
      console.error("Failed to fetch problems", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [query, difficulty]);

  const toggleFavorite = async (e, id, isFav) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    const method = isFav ? "DELETE" : "POST";
    try {
      await fetch(`http://localhost:5000/problems/${id}/favourite`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProblems(); // Refresh list to show updated star
    } catch (err) {
      console.error("Fav toggle failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="hover:bg-slate-800 p-2 rounded-full transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Problems</h1>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>
        
        <div className="flex gap-2">
          {["All", "Easy", "Medium", "Hard"].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-2 rounded-lg text-sm border ${
                difficulty === d ? "bg-blue-600 border-blue-600" : "bg-slate-900 border-slate-700"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="grid grid-cols-12 p-4 text-slate-500 text-xs font-bold uppercase">
          <div className="col-span-1">Status</div>
          <div className="col-span-7">Title</div>
          <div className="col-span-2">Difficulty</div>
          <div className="col-span-2 text-right">Favorite</div>
        </div>

        {loading ? (
           <div className="p-10 text-center text-slate-500">Loading problems...</div>
        ) : problems.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/problem/${p.id}`)}
            className="grid grid-cols-12 p-4 items-center border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer transition"
          >
            <div className="col-span-1">{p.solved ? "✅" : "—"}</div>
            <div className="col-span-7 font-medium">{p.title}</div>
            <div className={`col-span-2 text-sm ${
              p.difficulty === 'Easy' ? 'text-emerald-400' : p.difficulty === 'Medium' ? 'text-amber-400' : 'text-rose-400'
            }`}>{p.difficulty}</div>
            <div className="col-span-2 text-right">
              <button onClick={(e) => toggleFavorite(e, p.id, p.favourite)}>
                <Star size={20} fill={p.favourite ? "#eab308" : "none"} className={p.favourite ? "text-yellow-500" : "text-slate-500"} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}