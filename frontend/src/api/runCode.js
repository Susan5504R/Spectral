import axios from "axios";

export const runCodeAPI = async (code, language) => {
  const res = await axios.post("http://localhost:5000/execute", {
    code,
    language,
  });

  return res.data;
};