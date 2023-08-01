import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ERD from "./pages/ERD";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element= {<Home/>}/>
        <Route path="/erd/:manifest" element= {<ERD/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
