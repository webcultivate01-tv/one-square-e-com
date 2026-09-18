import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

const NotFound = () => (
  <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center text-center p-4">
    <p className="text-5xl font-black text-slate-900">404</p>
    <p className="text-[13px] text-slate-500 mt-2">This page could not be found.</p>
    <Link to="/" className="btn-primary mt-6 !py-2.5 !px-5">
      <FiArrowLeft size={15} />
      Back to home
    </Link>
  </div>
);

export default NotFound;
