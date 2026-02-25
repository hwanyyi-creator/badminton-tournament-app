import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Registration from './pages/Registration';
import Home from './pages/Home';
import Standings from './pages/Standings';
import PublicBracket from './pages/PublicBracket'; // 새롭게 추가된 공개 대진표 페이지

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 관리자용 라우트 */}
        <Route path="/" element={<Registration />} />
        <Route path="/matches" element={<Home />} />
        <Route path="/standings" element={<Standings />} />
        
        {/* 회원 공개용 대진표 라우트 */}
        <Route path="/bracket" element={<PublicBracket />} />
        
        {/* 잘못된 경로는 홈으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;