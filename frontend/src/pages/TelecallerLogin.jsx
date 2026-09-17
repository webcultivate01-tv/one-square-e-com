import { MdSupportAgent } from "react-icons/md";
import StaffLoginForm from "../components/StaffLoginForm.jsx";

const TelecallerLogin = () => (
  <StaffLoginForm
    role="telecaller"
    roleLabel="Telecaller"
    icon={MdSupportAgent}
    homePath="/talecaller"
    loginPath="/talecaller/login"
    changePasswordPath="/talecaller/change-password"
    accentBullets={[
      "Customer call queue and follow-ups",
      "Order and enquiry lookups",
      "Every sign-in recorded with IP and device",
    ]}
  />
);

export default TelecallerLogin;
