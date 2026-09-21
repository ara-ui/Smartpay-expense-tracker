const User = require("../model/User");
const mailService = require("../services/mailService");
const ForgotPasswordRequest = require("../model/ForgotPasswordRequest");
const ChangePasswordOTP = require("../model/ChangePasswordOTP");

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const hashResetToken = (rawToken) =>
  crypto.createHash("sha256").update(String(rawToken)).digest("hex");

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Always return the same response for known/unknown accounts.
    const genericResponse = {
      message: "Reset Password Link sent successfully"
    };

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Only one active reset link is valid at a time.
    await ForgotPasswordRequest.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false } }
    );

    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await ForgotPasswordRequest.create({
      resetToken: hashResetToken(rawToken),
      isActive: true,
      expiresAt,
      userId: user._id
    });

    try {
      await mailService.sendMail(normalizedEmail, rawToken);
    } catch (mailErr) {
      // Keep the generic response to avoid account enumeration. The token
      // remains short-lived and can simply expire if delivery fails.
      console.error(
        "Forgot password email delivery failed:",
        mailErr.message
      );
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("Forgot password error:", err.message);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};


// RESET PASSWORD PAGE
exports.resetPassword = async (req, res) => {
  try {
    const tokenHash = hashResetToken(req.params.id);

    const request = await ForgotPasswordRequest.findOne({
      resetToken: tokenHash,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).lean();

    if (!request) {
      return res.status(400).send("Invalid or Expired Reset Link");
    }

    return res.sendFile(
      require("path").join(__dirname, "../public/resetpassword.html")
    );
  } catch (err) {
    console.error("Reset password error:", err.message);

    return res.status(500).send("Something went wrong");
  }
};


// UPDATE PASSWORD USING RESET LINK
exports.updatePassword = async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body;

    if (typeof password !== "string" || password.length < 5) {
      return res.status(400).json({
        message: "Password must be at least 5 characters"
      });
    }

    // Claim the token atomically before changing the password. This prevents
    // two concurrent requests from using the same reset link successfully.
    const request = await ForgotPasswordRequest.findOneAndUpdate(
      {
        resetToken: hashResetToken(id),
        isActive: true,
        expiresAt: { $gt: new Date() }
      },
      {
        $set: { isActive: false }
      },
      { new: true }
    );

    if (!request) {
      return res.status(400).json({
        message: "Invalid or Expired Reset Link"
      });
    }

    const user = await User.findById(request.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    // A successful password reset invalidates any other outstanding reset
    // requests that may have been created before this one.
    await ForgotPasswordRequest.updateMany(
      {
        userId: user._id,
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );

    return res.status(200).json({
      message: "Password Updated Successfully"
    });
  } catch (err) {
    console.error("Update password error:", err.message);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};


// REQUEST CHANGE PASSWORD
exports.requestChangePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (newPassword.length < 5) {
      return res.status(400).json({
        message: "Password must be at least 5 characters"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match"
      });
    }


    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    await ChangePasswordOTP.updateMany(
      {
        userId: user._id,
        isUsed: false
      },
      {
        $set: {
          isUsed: true
        }
      }
    );

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    const otpHash = await bcrypt.hash(otp, 10);

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      10
    );

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await ChangePasswordOTP.create({
      userId: user._id,
      otpHash,
      newPasswordHash,
      expiresAt,
      attempts: 0,
      isUsed: false
    });

    await mailService.sendChangePasswordOTP(
      user.email,
      otp
    );

    return res.status(200).json({
      success: true,
      message:
        "Verification code sent to your registered email"
    });
  } catch (err) {
    console.error(
      "Request change password error:",
      err.message
    );

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};


// VERIFY CHANGE PASSWORD OTP
exports.verifyChangePassword = async (req, res) => {
  try {
    const { otp } = req.body;

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "OTP is required"
      });
    }

    const request = await ChangePasswordOTP.findOne({
      userId: req.user._id,
      isUsed: false
    }).sort({
      createdAt: -1
    });

    if (!request) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    if (
      new Date() > new Date(request.expiresAt)
    ) {
      request.isUsed = true;
      await request.save();

      return res.status(400).json({
        message: "OTP has expired"
      });
    }

    if (request.attempts >= 5) {
      request.isUsed = true;
      await request.save();

      return res.status(400).json({
        message: "Maximum OTP attempts exceeded"
      });
    }

    const validOTP = await bcrypt.compare(
      otp,
      request.otpHash
    );

    if (!validOTP) {
      request.attempts += 1;
      await request.save();

      return res.status(400).json({
        message: "Invalid OTP"
      });
    }
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.password = request.newPasswordHash;
    await user.save();

    request.isUsed = true;
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (err) {
    console.error(
      "Verify change password error:",
      err.message
    );

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};
