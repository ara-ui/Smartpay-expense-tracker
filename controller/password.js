const User = require("../model/User");
const mailService = require("../services/mailService");
const ForgotPasswordRequest = require("../model/ForgotPasswordRequest");
const ChangePasswordOTP = require("../model/ChangePasswordOTP");

const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Reset tokens are never stored in plaintext: the raw, high-entropy token
// only ever exists in the emailed link. The DB keeps a SHA-256 digest of
// it, so a database leak alone cannot be used to reset anyone's password.
const hashResetToken = (rawToken) =>
  crypto.createHash("sha256").update(String(rawToken)).digest("hex");

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Always the same response, whether or not this email is registered,
    // so the endpoint can't be used to enumerate accounts.
    const genericResponse = {
      message: "Reset Password Link sent successfully"
    };

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    await ForgotPasswordRequest.create({
      resetToken: hashResetToken(rawToken),
      isActive: true,
      userId: user._id
    });

    try {
      // Only the raw token goes out over email; it is never logged or
      // stored anywhere in this form.
      await mailService.sendMail(normalizedEmail, rawToken);
    } catch (mailErr) {
      // A mail-provider outage must not change the response shape -
      // that would itself leak whether the account exists.
      console.error("Forgot password: failed to send reset email:", mailErr);
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("Forgot password error:", err);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};


// RESET PASSWORD PAGE
exports.resetPassword = async (req, res) => {
  try {
    const id = req.params.id;

    const request = await ForgotPasswordRequest.findOne({
      resetToken: hashResetToken(id),
      isActive: true
    });

    if (!request) {
      return res.status(400).send("Invalid or Expired Reset Link");
    }

    const fifteenMinutes = 15 * 60 * 1000;

    if (
      Date.now() - new Date(request.createdAt).getTime() >
      fifteenMinutes
    ) {
      request.isActive = false;
      await request.save();

      return res.status(400).send("Reset link has expired");
    }

    res.sendFile(
      require("path").join(
        __dirname,
        "../public/resetpassword.html"
      )
    );
  } catch (err) {
    console.error("Reset password error:", err);

    return res.status(500).send("Something went wrong");
  }
};


// UPDATE PASSWORD USING RESET LINK
exports.updatePassword = async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body;

    if (!password || password.length < 5) {
      return res.status(400).json({
        message: "Password must be at least 5 characters"
      });
    }


    const request = await ForgotPasswordRequest.findOne({
      resetToken: hashResetToken(id),
      isActive: true
    });

    if (!request) {
      return res.status(400).json({
        message: "Invalid or Expired Reset Link"
      });
    }

    const fifteenMinutes = 15 * 60 * 1000;

    if (
      Date.now() - new Date(request.createdAt).getTime() >
      fifteenMinutes
    ) {
      request.isActive = false;
      await request.save();

      return res.status(400).json({
        message: "Reset link has expired"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   
    const user = await User.findById(request.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.password = hashedPassword;
    await user.save();

    request.isActive = false;
    await request.save();

    return res.status(200).json({
      message: "Password Updated Successfully"
    });
  } catch (err) {
    console.error("Update password error:", err);

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};


// REQUEST CHANGE PASSWORD
exports.requestChangePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
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
      err
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

    if (!otp) {
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
      otp.toString(),
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
      err
    );

    return res.status(500).json({
      message: "Something went wrong"
    });
  }
};

// VERIFY PASSWORD FOR SENSITIVE BUDGET CHANGES
exports.verifyBudgetAccess = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    const user = await User.findById(req.user._id).select("password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password"
      });
    }

    const { generateBudgetReauthToken } = require("../utils/jwt");

    return res.status(200).json({
      success: true,
      message: "Budget editing access verified",
      reauthToken: generateBudgetReauthToken(user._id)
    });
  } catch (err) {
    console.error("Budget access verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to verify password"
    });
  }
};
