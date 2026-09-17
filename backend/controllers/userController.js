import User from "../model/userModel.js";
import { toPublicUser } from "../utils/dto.js";
import { handleImageUpload } from "../config/cloudinary.js";
import { logActivity } from "../utils/activity.js";
import { getRequestContext } from "../utils/requestContext.js";

// GET /api/user/getprofile  — the session probe used by the SPA on boot.
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ["password", "otp", "otpExpiry", "notes"] },
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/user/updateprofile  — whitelist: name, phone, address
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body || {};
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof phone === "string") user.phone = phone.trim();
    if (address && typeof address === "object") {
      user.address = {
        street: address.street ?? user.address?.street ?? "",
        city: address.city ?? user.address?.city ?? "",
        state: address.state ?? user.address?.state ?? "",
        zip: address.zip ?? user.address?.zip ?? "",
        country: address.country ?? user.address?.country ?? "",
      };
    }

    await user.save();

    logActivity({
      customer: user.id,
      type: "profile_update",
      action: "profile.updated",
      message: "Profile details updated.",
      context: getRequestContext(req),
    }).catch((e) => console.warn(e.message));

    return res.status(200).json({ user: toPublicUser(user), message: "Profile updated." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/user/updateavatar  — multipart field "avatar"
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "An image file is required." });

    const url = await handleImageUpload(req.file);
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.avatar = url;
    await user.save();

    return res.status(200).json({ user: toPublicUser(user), message: "Avatar updated." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
