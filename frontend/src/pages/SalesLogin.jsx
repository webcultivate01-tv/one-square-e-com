import StaffLoginForm from "../components/StaffLoginForm.jsx";

const SalesLogin = () => (
  <StaffLoginForm
    role="sales"
    roleLabel="Sales"
    homePath="/sales"
    changePasswordPath="/sales/change-password"
  />
);

export default SalesLogin;
