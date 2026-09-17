import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiAlertCircle,
  FiCamera,
  FiLock,
  FiSave,
  FiShield,
  FiTrash2,
  FiUser,
} from "react-icons/fi";
import api, { errMsg } from "../../api/client.js";
import { setUserData } from "../../redux/userSlice.js";
import { Avatar, RoleBadge, SectionLoader, Spinner, formatDate } from "../../components/ui.jsx";
import PasswordField, { RulesChecklist, isStrongPassword } from "../../components/PasswordField.jsx";

const GENDER_OPTIONS = [
  ["", "Prefer not to say"],
  ["male", "Male"],
  ["female", "Female"],
  ["other", "Other"],
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const Profile = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const fileInputRef = useRef(null);

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  const applyAdmin = (data) => {
    setAdmin(data);
    setForm({
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      gender: data.gender || "",
      dateOfBirth: toDateInput(data.dateOfBirth),
      street: data.address?.street || "",
      city: data.address?.city || "",
      state: data.address?.state || "",
      zip: data.address?.zip || "",
      country: data.address?.country || "",
    });
    // Keep the topbar / rest of the console in sync with the fields it reads.
    dispatch(
      setUserData({
        ...userData,
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar,
        role: data.role,
        permissions: data.permissions,
      })
    );
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/me");
      applyAdmin(data.admin);
      setError("");
    } catch (err) {
      setError(errMsg(err, "Could not load your profile."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  /* ------------------------------------------------------------------ photo */

  const pickPhoto = () => fileInputRef.current?.click();

  const onPhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!/^image\/(jpe?g|png|webp|gif|avif)$/i.test(file.type)) {
      toast.error("Only JPG, PNG, WEBP, GIF or AVIF images are allowed.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be 4MB or smaller.");
      return;
    }

    setAvatarBusy(true);
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const { data } = await api.put("/admin/me/avatar", fd);
      applyAdmin(data.admin);
      toast.success(data.message || "Profile photo updated.");
    } catch (err) {
      toast.error(errMsg(err, "Could not update your profile photo."));
    } finally {
      setAvatarBusy(false);
    }
  };

  const removePhoto = async () => {
    setAvatarBusy(true);
    try {
      const { data } = await api.delete("/admin/me/avatar");
      applyAdmin(data.admin);
      toast.success(data.message || "Profile photo removed.");
    } catch (err) {
      toast.error(errMsg(err, "Could not remove your profile photo."));
    } finally {
      setAvatarBusy(false);
    }
  };

  /* --------------------------------------------------------------- profile */

  const submitProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }

    setSavingProfile(true);
    try {
      const { data } = await api.put("/admin/me", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip: form.zip.trim(),
          country: form.country.trim(),
        },
      });
      applyAdmin(data.admin);
      toast.success(data.message || "Profile updated.");
    } catch (err) {
      toast.error(errMsg(err, "Could not update your profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  /* -------------------------------------------------------------- password */

  const submitPassword = async (e) => {
    e.preventDefault();
    if (!pwd.current || !pwd.next) {
      toast.error("Fill in both your current and new password.");
      return;
    }
    if (!isStrongPassword(pwd.next)) {
      toast.error("The new password does not meet every requirement below.");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error("The two new passwords do not match.");
      return;
    }
    if (pwd.next === pwd.current) {
      toast.error("The new password must be different from the current one.");
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await api.post("/admin/me/change-password", {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      toast.success(data.message || "Password updated.");
      setPwd({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(errMsg(err, "Could not update your password."));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <SectionLoader rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 flex flex-col items-center text-center gap-3">
        <FiAlertCircle className="text-red-500" size={22} />
        <p className="text-[13px] text-slate-600">{error}</p>
        <button type="button" className="btn-secondary" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account details, profile photo and password.</p>
      </div>

      {/* Identity card */}
      <div className="card p-5 flex items-center gap-5 flex-wrap">
        <div className="relative shrink-0">
          <Avatar name={admin?.name} src={admin?.avatar} size={72} />
          <button
            type="button"
            onClick={pickPhoto}
            disabled={avatarBusy}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow ring-2 ring-white hover:bg-slate-700 transition-colors disabled:opacity-60"
            aria-label="Change profile photo"
            title="Change profile photo"
          >
            {avatarBusy ? <Spinner size={13} /> : <FiCamera size={13} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={onPhotoSelected}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[16px] font-semibold text-slate-900 truncate">{admin?.name}</p>
            <RoleBadge role={admin?.role} />
          </div>
          <p className="text-[13px] text-slate-500 truncate">{admin?.email}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Member since {formatDate(admin?.createdAt)} · Last login {formatDate(admin?.lastLogin, true)}
          </p>
        </div>

        {admin?.avatar && (
          <button
            type="button"
            onClick={removePhoto}
            disabled={avatarBusy}
            className="btn-secondary shrink-0"
          >
            <FiTrash2 size={13} />
            Remove photo
          </button>
        )}
      </div>

      {/* Profile details */}
      <form onSubmit={submitProfile} className="card p-5 space-y-4" noValidate>
        <div className="flex items-center gap-2">
          <FiUser className="text-slate-400" size={16} />
          <h2 className="text-[14px] font-semibold text-slate-900">Profile details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Full name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="Mobile number"
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
            >
              {GENDER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input
              type="date"
              className="input"
              value={form.dateOfBirth}
              onChange={(e) => setField("dateOfBirth", e.target.value)}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="label mb-2">Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              className="input sm:col-span-2 lg:col-span-1"
              value={form.street}
              onChange={(e) => setField("street", e.target.value)}
              placeholder="Street address"
            />
            <input
              className="input"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              placeholder="City"
            />
            <input
              className="input"
              value={form.state}
              onChange={(e) => setField("state", e.target.value)}
              placeholder="State"
            />
            <input
              className="input"
              value={form.zip}
              onChange={(e) => setField("zip", e.target.value)}
              placeholder="ZIP / Postal code"
            />
            <input
              className="input"
              value={form.country}
              onChange={(e) => setField("country", e.target.value)}
              placeholder="Country"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile && <Spinner size={14} />}
            <FiSave size={14} />
            Save changes
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={submitPassword} className="card p-5 space-y-4" noValidate>
        <div className="flex items-center gap-2">
          <FiLock className="text-slate-400" size={16} />
          <h2 className="text-[14px] font-semibold text-slate-900">Change password</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Current password</label>
            <PasswordField
              value={pwd.current}
              onChange={(v) => setPwd((p) => ({ ...p, current: v }))}
              placeholder="Your current password"
              autoComplete="current-password"
              disabled={savingPassword}
            />
          </div>

          <div>
            <label className="label">New password</label>
            <PasswordField
              value={pwd.next}
              onChange={(v) => setPwd((p) => ({ ...p, next: v }))}
              placeholder="Choose a strong password"
              disabled={savingPassword}
            />
          </div>

          <div>
            <label className="label">Confirm new password</label>
            <PasswordField
              value={pwd.confirm}
              onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))}
              placeholder="Type it again"
              disabled={savingPassword}
              error={Boolean(pwd.confirm) && pwd.confirm !== pwd.next}
            />
          </div>
        </div>

        <RulesChecklist value={pwd.next} />

        <div className="flex justify-end pt-1">
          <button type="submit" className="btn-primary" disabled={savingPassword}>
            {savingPassword && <Spinner size={14} />}
            <FiShield size={14} />
            Update password
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
