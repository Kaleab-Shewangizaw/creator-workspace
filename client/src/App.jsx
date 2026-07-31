import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Board from "./pages/Board.jsx";
import Scripts from "./pages/Scripts.jsx";
import Editor from "./pages/Editor.jsx";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/board" element={<Board />} />
        <Route path="/scripts" element={<Scripts />} />
        <Route path="/scripts/:id" element={<Editor />} />
      </Route>
    </Routes>
  );
}

export default App;
