import { FiTrendingUp } from "react-icons/fi";
import StaffLoginForm from "../components/StaffLoginForm.jsx";

const SalesLogin = () => (
  <StaffLoginForm
    role="sales"
    roleLabel="Sales"
    icon={FiTrendingUp}
    homePath="/sales"
    loginPath="/sales/login"
    changePasswordPath="/sales/change-password"
    accentBullets={[
      "Product catalog and stock visibility",
      "Order pipeline and customer follow-ups",
      "Every sign-in recorded with IP and device",
    ]}
  />
);

export default SalesLogin;
