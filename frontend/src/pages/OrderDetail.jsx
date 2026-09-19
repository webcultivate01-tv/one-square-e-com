import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App.jsx";
import { ErrorState, SectionLoader } from "../components/ui.jsx";
import LeadDetailDrawer from "../components/LeadDetailDrawer.jsx";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "cancelled", label: "Cancelled" },
];

/** Full page for one Buy Now request — shared by the admin, sales and telecaller portals. */
const OrderDetail = () => {
  const { id } = useParams();
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  const [lead, setLead] = useState(state?.lead?._id === id ? state.lead : null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${serverUrl}/api/order-request/${id}`, { withCredentials: true })
      .then(({ data }) => !cancelled && (setLead(data.request), setError("")))
      .catch((err) => !cancelled && setError(err.response?.data?.message || "Could not load this order request."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const listPath = `/${pathname.split("/")[1]}/orders`;

  if (error && !lead) return <ErrorState message={error} onRetry={() => navigate(listPath)} />;
  if (!lead) return <SectionLoader rows={6} />;

  return (
    <LeadDetailDrawer
      page
      kind="order_request"
      lead={lead}
      statusOptions={STATUS_OPTIONS}
      onClose={() => navigate(listPath)}
      onChange={(next) => setLead((prev) => ({ ...prev, ...next }))}
    />
  );
};

export default OrderDetail;
