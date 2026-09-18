import StaffLoginForm from "../components/StaffLoginForm.jsx";

const TelecallerLogin = () => (
  <StaffLoginForm
    role="telecaller"
    roleLabel="Telecaller"
    homePath="/talecaller"
    changePasswordPath="/talecaller/change-password"
  />
);

export default TelecallerLogin;
